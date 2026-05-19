<?php

declare(strict_types=1);

namespace App\Command;

use App\Application\Steam\SteamExternalSignalResearchService;
use App\Domain\Player\Player;
use App\Infrastructure\Persistence\PlayerRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsCommand(name: 'app:steam:signal-research-report', description: 'Generate the Phase 17 Steam external signal research report.')]
final class GenerateSteamSignalResearchReportCommand extends Command
{
    public function __construct(
        private readonly PlayerRepository $players,
        private readonly SteamExternalSignalResearchService $signals,
        private readonly KernelInterface $kernel,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('output', null, InputOption::VALUE_REQUIRED, 'Report path relative to repository root', '.planning/phases/17-steamprofile-usage/17-STEAM-SIGNAL-RESEARCH.md');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $steamIds = [];
        foreach ($this->players->findAll() as $player) {
            if ($player instanceof Player && !str_starts_with($player->getSteamId(), 'HLTV_')) {
                $steamIds[] = $player->getSteamId();
            }
        }

        $signals = $this->signals->shadowForSteamIds($steamIds);
        $sampleCount = count($signals);
        $withInventoryValue = count(array_filter($signals, static fn ($signal): bool => $signal->inventoryEstimatedValue !== null));
        $withAccountAge = count(array_filter($signals, static fn ($signal): bool => $signal->accountAgeDays !== null));
        $privateInventories = count(array_filter($signals, static fn ($signal): bool => $signal->inventoryVisibilityState === 'private'));
        $generatedAt = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        $report = <<<MD
---
phase: 17
generated_at: {$generatedAt}
status: shadow_research_only
---

# Steam External Signal Research

## Scope

This report evaluates public Steam profile and CS2 inventory metadata as shadow-only research signals. It does not approve any change to visible suspicion labels, TRACE ratings, ban decisions, or demo-derived scoring.

## Data Coverage

- Player sample count: {$sampleCount}
- Profiles with account age: {$withAccountAge}
- Inventories with estimated value: {$withInventoryValue}
- Private inventories observed: {$privateInventories}

## Correlation Notes

Automated correlation against suspicion and TRACE requires a larger labeled local sample before interpretation. Until then, inventory value, account age, and profile visibility must be treated as context for research only.

## Bias And Privacy Risk

Inventory value and account age can proxy for wealth, region, trading habits, and privacy choices. Private or sparse accounts must not be treated as suspicious by default.

## Manipulation Risk

Attackers can buy aged accounts, move items between accounts, hide inventories, or inflate apparent inventory value. These signals are weak, gameable, and unsuitable as standalone anti-cheat evidence.

## Explainability Notes

Any future visible use would need plain-language labels, confidence/coverage indicators, and clear separation from demo-derived behavior. Missing/private data must remain an explicit unknown state.

## Recommendation

Keep Steam external metadata in shadow mode. Use it only for offline analysis and cohort research until a later phase demonstrates measurable lift, acceptable bias/privacy risk, and an explainable product treatment.
MD;

        $relativePath = (string) $input->getOption('output');
        $repoRoot = dirname($this->kernel->getProjectDir());
        $path = $repoRoot . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath);
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents($path, $report . PHP_EOL);

        $output->writeln(sprintf('Wrote Steam signal research report to %s', $relativePath));

        return Command::SUCCESS;
    }
}
