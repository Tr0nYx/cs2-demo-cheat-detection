<?php

declare(strict_types=1);

namespace App\Command;

use App\Application\Steam\SteamMatchHistoryTrackingPlanner;
use App\Application\Steam\TrackSteamMatchHistoryMessage;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(name: 'app:steam:track-match-history', description: 'Queue due Steam match-history tracking checks.')]
final class TrackSteamMatchHistoryCommand extends Command
{
    public function __construct(
        private readonly SteamMatchHistoryTrackingPlanner $planner,
        private readonly MessageBusInterface $bus,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Maximum number of connections to queue', '100')
            ->addOption('per-user-limit', null, InputOption::VALUE_REQUIRED, 'Maximum sharecodes to discover per user run', '10')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Include terminal/error connections')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Print candidates without dispatching');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $limit = max(1, (int) $input->getOption('limit'));
        $perUserLimit = max(1, (int) $input->getOption('per-user-limit'));
        $force = (bool) $input->getOption('force');
        $dryRun = (bool) $input->getOption('dry-run');
        $connections = $this->planner->dueConnections($limit, $force);

        foreach ($connections as $connection) {
            $output->writeln(sprintf('%s %s %s', $connection->getId()->toRfc4122(), $connection->getSteamId(), $connection->getStatus()));
            if (!$dryRun) {
                $this->bus->dispatch(new TrackSteamMatchHistoryMessage($connection->getId()->toRfc4122(), 'scheduled', $perUserLimit, $force));
            }
        }

        $output->writeln(sprintf('%s %d match-history connection(s).', $dryRun ? 'Found' : 'Queued', count($connections)));

        return Command::SUCCESS;
    }
}
