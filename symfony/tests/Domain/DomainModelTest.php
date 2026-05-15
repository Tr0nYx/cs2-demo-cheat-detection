<?php

declare(strict_types=1);

namespace App\Tests\Domain;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStatus;
use App\Domain\Player\Player;
use PHPUnit\Framework\TestCase;

final class DomainModelTest extends TestCase
{
    public function testDemoStatusValuesMatchPhaseContract(): void
    {
        self::assertSame(
            ['uploaded', 'queued', 'processing', 'done', 'error'],
            array_map(static fn (DemoStatus $status): string => $status->value, DemoStatus::cases()),
        );
    }

    public function testSuspicionLabelsRemainResearchSignals(): void
    {
        self::assertSame(
            ['clean', 'suspicious', 'likely_cheating'],
            array_map(static fn (SuspicionLabel $label): string => $label->value, SuspicionLabel::cases()),
        );
    }

    public function testDemoStatusTransitions(): void
    {
        $demo = new Demo('/storage/demos/example.dem');

        self::assertSame(DemoStatus::Uploaded, $demo->getStatus());

        $demo->markQueued();
        self::assertSame(DemoStatus::Queued, $demo->getStatus());

        $demo->markProcessing();
        self::assertSame(DemoStatus::Processing, $demo->getStatus());

        $demo->markDone();
        self::assertSame(DemoStatus::Done, $demo->getStatus());
        self::assertNotNull($demo->getProcessedAt());

        $demo->markError('analysis failed');
        self::assertSame(DemoStatus::Error, $demo->getStatus());
        self::assertSame('analysis failed', $demo->getErrorMessage());
    }

    public function testAnalysisResultStoresScoresAndSupportData(): void
    {
        $demo = new Demo('/storage/demos/example.dem');
        $player = new Player('76561198000000000', 'Research Player');
        $result = new AnalysisResult(
            demo: $demo,
            player: $player,
            roundCount: 24,
            aimbotScore: 0.2,
            wallhackScore: 0.3,
            triggerbotScore: 0.1,
            recoilScore: 0.4,
            bhopScore: 0.05,
            sessionConsistencyScore: 0.6,
            overallSuspicion: 0.32,
            suspicionLabel: SuspicionLabel::Clean,
            featureData: ['aimbot' => ['snap_ratio' => 1.2]],
            supportData: ['explanation' => 'low confidence research signal'],
        );

        self::assertSame($demo, $result->getDemo());
        self::assertSame($player, $result->getPlayer());
        self::assertSame(0.32, $result->getOverallSuspicion());
        self::assertSame(SuspicionLabel::Clean, $result->getSuspicionLabel());
        self::assertSame(['aimbot' => ['snap_ratio' => 1.2]], $result->getFeatureData());
        self::assertSame(['explanation' => 'low confidence research signal'], $result->getSupportData());
    }
}
