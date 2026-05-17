<?php

declare(strict_types=1);

namespace App\Command;

use App\Application\Metrics\PublicMetricsService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:metrics:update-public',
    description: 'Recalculate and cache public metrics',
)]
final class UpdatePublicMetricsCommand extends Command
{
    public function __construct(
        private readonly PublicMetricsService $metricsService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $metrics = $this->metricsService->recalculate();

            $io->success('Public metrics updated');
            $io->table(
                ['Metric', 'Value'],
                [
                    ['Total Demos Analyzed', $metrics['total_demos_analyzed']],
                    ['Avg Suspicion Score', $metrics['avg_suspicion_score']],
                    ['Total Players', $metrics['total_players_analyzed']],
                    ['Total Matches', $metrics['total_matches']],
                    ['Updated At', $metrics['updated_at']],
                ]
            );

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Failed to update metrics: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
