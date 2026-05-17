<?php

declare(strict_types=1);

namespace App\Application\Demo\Cron;

use App\Application\Demo\HltvImportMessage;
use App\Domain\Demo\Demo;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Psr\Log\LoggerInterface;

#[AsCommand(
    name: 'app:hltv:import-top-matches',
    description: 'Fetches Top 20 / Tier 1 match URLs from HLTV and queues them for import.',
)]
final class HltvTopMatchesCommand extends Command
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private MessageBusInterface $messageBus,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Fetching HLTV results...');
        
        try {
            // Using a simple fetch of the results page for top tier events.
            // Ideally we'd use an RSS feed, but HLTV's RSS feed is limited.
            // We fetch the main results page and parse match URLs.
            $response = $this->httpClient->request('GET', 'https://www.hltv.org/results?stars=1');
            $html = $response->getContent();
            
            preg_match_all('/href="(\/matches\/[0-9]+\/[^"]+)"/', $html, $matches);
            
            $urls = array_unique($matches[1] ?? []);
            
            if (empty($urls)) {
                $output->writeln('No match URLs found.');
                return Command::SUCCESS;
            }

            $count = 0;
            $demoRepo = $this->entityManager->getRepository(Demo::class);

            foreach ($urls as $uri) {
                $url = 'https://www.hltv.org' . $uri;
                
                // Check if we already have it
                $existing = $demoRepo->findOneBy(['hltvMatchUrl' => $url]);
                if (!$existing) {
                    $this->messageBus->dispatch(new HltvImportMessage($url));
                    $count++;
                    $this->logger->info("Queued HLTV match: $url");
                }
            }

            $output->writeln("Queued $count new matches.");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->logger->error('Failed to fetch top matches: ' . $e->getMessage());
            $output->writeln('<error>' . $e->getMessage() . '</error>');
            return Command::FAILURE;
        }
    }
}
