<?php

declare(strict_types=1);

namespace App\Application\Demo;

use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStatus;
use App\Domain\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use App\Application\Command\ImportDemoMessage;
use Psr\Log\LoggerInterface;

#[AsMessageHandler]
final readonly class HltvImportHandler
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private EntityManagerInterface $entityManager,
        private MessageBusInterface $messageBus,
        private LoggerInterface $logger
    ) {
    }

    public function __invoke(HltvImportMessage $message): void
    {
        try {
            $response = $this->httpClient->request('POST', 'http://hltv-scraper:3000/scrape', [
                'json' => ['url' => $message->url]
            ]);

            if ($response->getStatusCode() === 503 || $response->getStatusCode() === 403) {
                $content = $response->toArray(false);
                if (($content['status'] ?? '') === 'cloudflare_blocked') {
                    $this->logger->warning('HLTV Scraper Cloudflare blocked for URL: ' . $message->url);
                    // Create or update demo to mark as blocked
                    $demo = $this->getOrCreateDemo($message->url);
                    $demo->markError('cloudflare_blocked');
                    // We must use reflection or public methods to set this, wait, Demo has markError but we need DemoStatus::CloudflareBlocked
                    // To strictly follow the plan, I'll set status if there's a setter, or just use the DB
                    $this->entityManager->persist($demo);
                    $this->entityManager->flush();
                    
                    $this->entityManager->getConnection()->update('demo', 
                        ['status' => DemoStatus::CloudflareBlocked->value],
                        ['id' => $demo->getIdString()]
                    );
                    return;
                }
            }

            $data = $response->toArray();
            
            $demo = $this->getOrCreateDemo($message->url);
            
            if (!empty($data['demoUrl'])) {
                // Dispatch standard demo download message
                $this->messageBus->dispatch(new ImportDemoMessage(
                    sharecode: $data['demoUrl'],
                    userId: 'admin_hltv',
                    sharecodedImportId: $demo->getIdString(),
                    platform: 'hltv'
                ));
                $demo->markQueued();
            }

            if (!empty($data['players']) && is_array($data['players'])) {
                foreach ($data['players'] as $playerData) {
                    // For HLTV, we don't have Steam ID, so we might need a dummy or search by name.
                    // The plan says "Update or create the Demo and Player entities using the scraped HLTV metadata."
                    // Since Player requires steamId, we'll use a hashed version of their name as a temporary steamId for HLTV-only profiles.
                    $steamId = 'HLTV_' . md5($playerData['name'] ?? 'unknown');
                    
                    $playerRepo = $this->entityManager->getRepository(Player::class);
                    $player = $playerRepo->findOneBy(['steamId' => $steamId]) 
                        ?? $playerRepo->findOneBy(['displayName' => $playerData['name']]);
                        
                    if (!$player) {
                        $player = new Player($steamId, $playerData['name'] ?? null);
                    }
                    
                    $player->setHltvRating($playerData['rating'] ?? null);
                    $player->setHltvTeam($playerData['team'] ?? null);
                    
                    $this->entityManager->persist($player);
                }
            }

            $this->entityManager->persist($demo);
            $this->entityManager->flush();

        } catch (\Throwable $e) {
            $this->logger->error('HLTV Import failed: ' . $e->getMessage());
            throw $e; // Retry on standard errors
        }
    }

    private function getOrCreateDemo(string $hltvUrl): Demo
    {
        $repo = $this->entityManager->getRepository(Demo::class);
        $demo = $repo->findOneBy(['hltvMatchUrl' => $hltvUrl]);
        if (!$demo) {
            $demo = new Demo('pending_download_from_hltv');
            $demo->setHltvMatchUrl($hltvUrl);
        }
        return $demo;
    }
}
