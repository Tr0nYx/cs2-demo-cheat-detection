<?php

declare(strict_types=1);

namespace App\Command;

use App\Application\Steam\RefreshSteamProfileMessage;
use App\Application\Steam\SteamProfileRefreshPlanner;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(name: 'app:steam:refresh-profiles', description: 'Queue tiered Steam profile and inventory refresh jobs.')]
final class RefreshSteamProfilesCommand extends Command
{
    public function __construct(
        private readonly SteamProfileRefreshPlanner $planner,
        private readonly MessageBusInterface $bus,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Maximum number of players to queue', '100')
            ->addOption('tier', null, InputOption::VALUE_REQUIRED, 'Only queue a specific tier')
            ->addOption('force', null, InputOption::VALUE_NONE, 'Force refresh even when fresh')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Print candidates without dispatching');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $limit = max(1, (int) $input->getOption('limit'));
        $tier = $input->getOption('tier');
        $tier = is_string($tier) && $tier !== '' ? $tier : null;
        $dryRun = (bool) $input->getOption('dry-run');
        $force = (bool) $input->getOption('force');
        $candidates = $this->planner->candidates($limit, $tier);

        $counts = [];
        foreach ($candidates as $candidate) {
            $counts[$candidate->tier] = ($counts[$candidate->tier] ?? 0) + 1;
            $output->writeln(sprintf('%s %s %s', $candidate->tier, $candidate->steamId, $candidate->reason));
            if (!$dryRun) {
                $this->bus->dispatch(new RefreshSteamProfileMessage($candidate->steamId, $candidate->tier, $candidate->reason, $force));
            }
        }

        $output->writeln(sprintf('%s %d Steam refresh candidate(s).', $dryRun ? 'Found' : 'Queued', count($candidates)));
        foreach ($counts as $name => $count) {
            $output->writeln(sprintf('  %s: %d', $name, $count));
        }

        return Command::SUCCESS;
    }
}
