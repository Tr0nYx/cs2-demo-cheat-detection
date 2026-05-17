<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetFilteredLeaderboardHandler;
use App\Application\Query\GetFilteredLeaderboardQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class GetFilteredLeaderboardHandlerTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private GetFilteredLeaderboardHandler $handler;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $connection = self::getContainer()->get(Connection::class);
        $this->handler = new GetFilteredLeaderboardHandler($connection, new NullLogger());
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    public function testFilteredByMapReturnsOnlyThatMap(): void
    {
        $this->createQualifiedPlayer('steam-a', 'Mirage King', 'Mirage', [0.72, 0.75, 0.78, 0.8, 0.84]);
        $this->createQualifiedPlayer('steam-b', 'Inferno King', 'Inferno', [0.9, 0.92, 0.94, 0.96, 0.98]);

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(map: 'Mirage'));

        self::assertSame(1, $result->total);
        self::assertSame('steam-a', $result->players[0]->playerId);
    }

    public function testFilteredByRatingBandReturnsMatchingPlayers(): void
    {
        $this->createQualifiedPlayer('steam-low', 'Low Band', 'Nuke', [0.1, 0.15, 0.2, 0.24, 0.28]);
        $this->createQualifiedPlayer('steam-high', 'High Band', 'Nuke', [0.72, 0.75, 0.8, 0.85, 0.9]);

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(ratingBand: '0-5'));

        self::assertSame(1, $result->total);
        self::assertSame('steam-low', $result->players[0]->playerId);
    }

    public function testFilteredByTimeframeReturnsRecentDemos(): void
    {
        $this->createQualifiedPlayer('steam-recent', 'Recent', 'Ancient', [0.4, 0.45, 0.5, 0.55, 0.6], new \DateTimeImmutable('-5 days'));
        $this->createQualifiedPlayer('steam-old', 'Old', 'Ancient', [0.9, 0.92, 0.94, 0.96, 0.98], new \DateTimeImmutable('-120 days'));

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(daysBack: 30));

        self::assertSame(1, $result->total);
        self::assertSame('steam-recent', $result->players[0]->playerId);
    }

    public function testMultipleFiltersApplyAllConstraints(): void
    {
        $this->createQualifiedPlayer('steam-match', 'Match', 'Vertigo', [0.4, 0.45, 0.5, 0.55, 0.6], new \DateTimeImmutable('-3 days'));
        $this->createQualifiedPlayer('steam-map-miss', 'Map Miss', 'Dust2', [0.4, 0.45, 0.5, 0.55, 0.6], new \DateTimeImmutable('-3 days'));
        $this->createQualifiedPlayer('steam-band-miss', 'Band Miss', 'Vertigo', [0.72, 0.75, 0.8, 0.85, 0.9], new \DateTimeImmutable('-3 days'));

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(
            map: 'Vertigo',
            ratingBand: '5-10',
            daysBack: 7,
        ));

        self::assertSame(1, $result->total);
        self::assertSame('steam-match', $result->players[0]->playerId);
    }

    public function testRankingUsesPercentile95AndMinimumQualification(): void
    {
        $this->createQualifiedPlayer('steam-top', 'Top', 'Mirage', [0.5, 0.55, 0.6, 0.65, 0.99]);
        $this->createQualifiedPlayer('steam-second', 'Second', 'Mirage', [0.7, 0.72, 0.74, 0.76, 0.78]);
        $this->createPlayerTraces('steam-short', 'Short', 'Mirage', [0.99, 1.0, 1.0, 1.0]);

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(map: 'Mirage'));

        self::assertSame(2, $result->total);
        self::assertSame('steam-top', $result->players[0]->playerId);
        self::assertSame(5, $result->players[0]->demoCount);
        self::assertGreaterThan($result->players[1]->percentile95, $result->players[0]->percentile95);
        self::assertNotContains('steam-short', array_map(fn($entry) => $entry->playerId, $result->players));
    }

    public function testPaginationWorksAndHasMoreUsesTotalQualified(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            $base = 1.0 - ($i * 0.03);
            $this->createQualifiedPlayer("steam-{$i}", "Player {$i}", 'Anubis', [$base, $base + 0.01, $base + 0.02, $base + 0.03, $base + 0.04]);
        }

        $result = ($this->handler)(new GetFilteredLeaderboardQuery(limit: 5, offset: 5));

        self::assertCount(5, $result->players);
        self::assertSame(12, $result->total);
        self::assertTrue($result->hasMore);
        self::assertSame(6, $result->players[0]->rank);
    }

    /** @param list<float> $scores */
    private function createQualifiedPlayer(
        string $steamId,
        string $displayName,
        string $map,
        array $scores,
        ?\DateTimeImmutable $calculatedAt = null,
    ): void {
        $this->createPlayerTraces($steamId, $displayName, $map, $scores, $calculatedAt);
    }

    /** @param list<float> $scores */
    private function createPlayerTraces(
        string $steamId,
        string $displayName,
        string $map,
        array $scores,
        ?\DateTimeImmutable $calculatedAt = null,
    ): void {
        $player = new Player($steamId, $displayName);
        $this->em->persist($player);

        foreach ($scores as $index => $score) {
            $demo = new Demo("/storage/demos/{$steamId}-{$index}.dem", originalFilename: "{$steamId}-{$index}.dem");
            $demo->setMap($map);
            $demo->markDone($calculatedAt ?? new \DateTimeImmutable('2026-05-15T12:00:00+00:00'));

            $analysis = new AnalysisResult(
                $demo,
                $player,
                24,
                0.1,
                0.2,
                0.3,
                0.4,
                0.5,
                0.6,
                0.51,
                SuspicionLabel::Suspicious,
                analyzedAt: $calculatedAt ?? new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
            );

            $trace = new TraceRating(
                analysisResult: $analysis,
                playerId: $steamId,
                demoId: $demo->getIdString(),
                calibrationVersion: 'default-v1',
                traceBase: $score,
                traceAdjusted: $score,
                traceNormalized: $score,
                trustMultiplier: 0.95,
                roundCount: 24,
                ekill: $score,
                aim: $score,
                kast: $score,
                util: $score,
                clutch: $score,
                ekillRaw: $score,
                aimCpq: $score,
                aimCsq: $score,
                aimTtd: $score,
                aimScs: $score,
                kastPercentage: $score,
                clutchAttempts: 2,
                clutchWins: 1,
                calculatedAt: $calculatedAt ?? new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
            );

            $this->em->persist($demo);
            $this->em->persist($analysis);
            $this->em->persist($trace);
        }

        $this->em->flush();
        $this->em->clear();
    }
}
