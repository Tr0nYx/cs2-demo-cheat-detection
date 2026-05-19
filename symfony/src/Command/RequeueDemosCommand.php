<?php

declare(strict_types=1);

namespace App\Command;

use App\Domain\Demo\DemoStatus;
use App\Infrastructure\Persistence\DemoRepository;
use App\Infrastructure\Queue\RedisAnalysisJobPublisher;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:demo:requeue',
    description: 'Requeue failed demos or specific demos back into the analysis queue',
)]
final class RequeueDemosCommand extends Command
{
    public function __construct(
        private readonly DemoRepository $demoRepository,
        private readonly RedisAnalysisJobPublisher $jobPublisher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('all-failed', 'f', InputOption::VALUE_NONE, 'Requeue all demos in error status')
            ->addOption('demo-id', 'd', InputOption::VALUE_REQUIRED, 'Requeue a specific demo by UUID');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('CS2 Demo Requeuer');

        $allFailed = $input->getOption('all-failed');
        $demoId = $input->getOption('demo-id');

        if (!$allFailed && !$demoId) {
            $io->error('You must specify either --all-failed (-f) or --demo-id=<UUID> (-d).');
            return Command::INVALID;
        }

        /** @var \App\Domain\Demo\Demo[] $demosToRequeue */
        $demosToRequeue = [];

        if ($demoId) {
            $demo = $this->demoRepository->findByUuidString($demoId);
            if ($demo === null) {
                $io->error(sprintf('Demo with ID %s not found.', $demoId));
                return Command::FAILURE;
            }
            $demosToRequeue[] = $demo;
        } elseif ($allFailed) {
            $demosToRequeue = $this->demoRepository->findBy(['status' => DemoStatus::Error]);
        }

        if (empty($demosToRequeue)) {
            $io->warning('No matching demos found to requeue.');
            return Command::SUCCESS;
        }

        $io->text(sprintf('Found %d demo(s) to requeue. Starting process...', count($demosToRequeue)));

        $successCount = 0;
        foreach ($demosToRequeue as $demo) {
            $io->text(sprintf('- Re-queuing demo: %s (ID: %s, Previous Error: %s)',
                $demo->getOriginalFilename() ?? 'unknown',
                $demo->getIdString(),
                $demo->getErrorMessage() ?? 'None'
            ));

            try {
                $demo->markQueued();
                $this->demoRepository->save($demo, true);
                $this->jobPublisher->publish($demo);
                $successCount++;
            } catch (\Throwable $e) {
                $io->error(sprintf('Failed to requeue %s: %s', $demo->getIdString(), $e->getMessage()));
            }
        }

        $io->newLine();
        $io->success(sprintf('Successfully requeued %d/%d demo(s).', $successCount, count($demosToRequeue)));

        return Command::SUCCESS;
    }
}
