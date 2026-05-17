<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetTimeWindowLeaderboardHandler;
use App\Application\Query\GetTimeWindowLeaderboardQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for GetTimeWindowLeaderboardHandler.
 *
 * Tests the CQRS handler that builds time-windowed leaderboards with qualified players,
 * time filtering, ranking logic, pagination, and component includes.
 */
final class GetTimeWindowLeaderboardHandlerTest extends KernelTestCase
{
    private GetTimeWindowLeaderboardHandler $handler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetTimeWindowLeaderboardHandler::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Filters to last 30 days only.
     */
    public function testFilters30Days(): void
    {
        $now = new \DateTimeImmutable('2026-05-17T12:00:00+00:00');
        $daysAgo7 = $now->sub(new \DateInterval('P7D'));
        $daysAgo35 = $now->sub(new \DateInterval('P35D'));

        // Player 1: 5 demos within 30 days
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000001', $daysAgo7, 1.9);
        }

        // Player 2: 5 demos more than 30 days ago (should not appear in 30d window)
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000002', $daysAgo35, 2.0);
        }

        $query = new GetTimeWindowLeaderboardQuery(timeWindow: '30d', limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // At least Player 1 should appear
        self::assertGreaterThan(0, count($result->entries));
        // Player 2 should NOT appear (too old)
        $player2Ids = array_map(fn ($entry) => $entry->playerId, $result->entries);
        self::assertNotContains('76561198000000002', $player2Ids);
    }

    /**
     * Test 2: Filters to last 90 days correctly.
     */
    public function testFilters90Days(): void
    {
        $now = new \DateTimeImmutable('2026-05-17T12:00:00+00:00');
        $daysAgo30 = $now->sub(new \DateInterval('P30D'));
        $daysAgo100 = $now->sub(new \DateInterval('P100D'));

        // Player 1: 5 demos within 90 days
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000001', $daysAgo30, 1.9);
        }

        // Player 2: 5 demos more than 90 days ago (should not appear in 90d window)
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000002', $daysAgo100, 2.0);
        }

        $query = new GetTimeWindowLeaderboardQuery(timeWindow: '90d', limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // At least Player 1 should appear
        self::assertGreaterThan(0, count($result->entries));
        // Player 2 should NOT appear (too old)
        $player2Ids = array_map(fn ($entry) => $entry->playerId, $result->entries);
        self::assertNotContains('76561198000000002', $player2Ids);
    }

    /**
     * Test 3: Qualification is applied within the time window.
     */
    public function testQualificationAppliedWithinWindow(): void
    {
        $now = new \DateTimeImmutable('2026-05-17T12:00:00+00:00');
        $daysAgo7 = $now->sub(new \DateInterval('P7D'));
        $daysAgo45 = $now->sub(new \DateInterval('P45D'));

        // Player 1: 4 demos in 30d window (unqualified), 5 total in 90d (qualified in 90d)
        for ($i = 1; $i <= 4; $i++) {
            $this->createTraceRatingWithDate('76561198000000001', $daysAgo7, 1.9);
        }
        // Add one more demo outside 30d but within 90d
        $this->createTraceRatingWithDate('76561198000000001', $daysAgo45, 1.8);

        $query30 = new GetTimeWindowLeaderboardQuery(timeWindow: '30d', limit: 100, offset: 0);
        $result30 = ($this->handler)($query30);

        $query90 = new GetTimeWindowLeaderboardQuery(timeWindow: '90d', limit: 100, offset: 0);
        $result90 = ($this->handler)($query90);

        // Should NOT appear in 30d (only 4 demos in that window)
        $player1IdsIn30d = array_map(fn ($entry) => $entry->playerId, $result30->entries);
        self::assertNotContains('76561198000000001', $player1IdsIn30d);

        // SHOULD appear in 90d (5 demos in that window)
        $player1IdsIn90d = array_map(fn ($entry) => $entry->playerId, $result90->entries);
        self::assertContains('76561198000000001', $player1IdsIn90d);
    }

    /**
     * Test 4: Time window calculation and filtering correct.
     */
    public function testTimeWindowCalculationCorrect(): void
    {
        $now = new \DateTimeImmutable('2026-05-17T12:00:00+00:00');
        $daysAgo29 = $now->sub(new \DateInterval('P29D'));
        $daysAgo31 = $now->sub(new \DateInterval('P31D'));

        // Player 1: 5 demos at 29 days ago (should appear in 30d)
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000001', $daysAgo29, 1.9);
        }

        // Player 2: 5 demos at 31 days ago (should NOT appear in 30d)
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithDate('76561198000000002', $daysAgo31, 2.0);
        }

        $query = new GetTimeWindowLeaderboardQuery(timeWindow: '30d', limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Player 1 should appear, Player 2 should not
        $playerIds = array_map(fn ($entry) => $entry->playerId, $result->entries);
        self::assertContains('76561198000000001', $playerIds);
        self::assertNotContains('76561198000000002', $playerIds);
    }

    /**
     * Create a TraceRating with a specific date.
     */
    private function createTraceRatingWithDate(
        string $playerSteamId,
        \DateTimeImmutable $calculatedAt,
        float $traceAdjusted = 1.0,
    ): void {
        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');

        $player = new Player($playerSteamId, "Player {$playerSteamId}");

        $this->em->persist($demo);
        $this->em->persist($player);

        $result = new AnalysisResult(
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
        );
        $demo->markDone(new \DateTimeImmutable('2026-05-15T12:00:00+00:00'));

        $trace = new TraceRating(
            analysisResult: $result,
            playerId: $playerSteamId,
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: $traceAdjusted,
            traceAdjusted: $traceAdjusted,
            traceNormalized: 1.0,
            trustMultiplier: 0.95,
            roundCount: 24,
            ekill: 1.0,
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 1.0,
            ekillRaw: 0.8,
            aimCpq: 0.75,
            aimCsq: 0.82,
            aimTtd: 0.88,
            aimScs: 0.85,
            kastPercentage: 0.75,
            clutchAttempts: 5,
            clutchWins: 3,
            calculatedAt: $calculatedAt,
        );

        $this->em->persist($result);
        $this->em->persist($trace);
        $this->em->flush();
        $this->em->clear();
    }
}
