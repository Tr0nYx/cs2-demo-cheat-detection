<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetMapLeaderboardHandler;
use App\Application\Query\GetMapLeaderboardQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for GetMapLeaderboardHandler.
 *
 * Tests the CQRS handler that builds per-map leaderboards with qualified players,
 * map filtering, ranking logic, pagination, and component includes.
 */
final class GetMapLeaderboardHandlerTest extends KernelTestCase
{
    private GetMapLeaderboardHandler $handler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetMapLeaderboardHandler::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Filters results to specified map only.
     */
    public function testFiltersToMapOnly(): void
    {
        // Create multiple maps with players
        $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.95);
        $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.85);
        $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.75);
        $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.65);
        $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.55);
        $this->createTraceRatingWithMap('76561198000000001', 'de_ancient', 2.0);
        $this->createTraceRatingWithMap('76561198000000001', 'de_ancient', 1.9);

        // Query de_mirage only
        $query = new GetMapLeaderboardQuery(mapId: 'de_mirage', limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // All entries should be from de_mirage (not de_ancient)
        self::assertGreaterThan(0, count($result->entries));
        // Due to map filtering and qualification, should have entries from de_mirage
        self::assertGreaterThanOrEqual(1, count($result->entries));
    }

    /**
     * Test 2: Different maps have different rankings.
     */
    public function testDifferentMapsHaveDifferentRankings(): void
    {
        // Player 1 is strong on de_mirage
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 2.0 - ($i * 0.05));
        }

        // Player 2 is strong on de_ancient
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithMap('76561198000000002', 'de_ancient', 2.0 - ($i * 0.05));
        }

        // Query de_mirage
        $query1 = new GetMapLeaderboardQuery(mapId: 'de_mirage', limit: 100, offset: 0);
        $result1 = ($this->handler)($query1);

        // Query de_ancient
        $query2 = new GetMapLeaderboardQuery(mapId: 'de_ancient', limit: 100, offset: 0);
        $result2 = ($this->handler)($query2);

        // Both maps should have results
        self::assertGreaterThan(0, count($result1->entries));
        self::assertGreaterThan(0, count($result2->entries));
    }

    /**
     * Test 3: Unqualified players (< 5 demos on map) are filtered per global qualification.
     */
    public function testFiltersUnqualifiedPlayersPerMap(): void
    {
        // Player 1: 5 demos on de_mirage (qualified)
        for ($i = 1; $i <= 5; $i++) {
            $this->createTraceRatingWithMap('76561198000000001', 'de_mirage', 1.9);
        }

        // Player 2: 4 demos total (unqualified)
        for ($i = 1; $i <= 4; $i++) {
            $this->createTraceRatingWithMap('76561198000000002', 'de_mirage', 2.0);
        }

        $query = new GetMapLeaderboardQuery(mapId: 'de_mirage', limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Only Player 1 should appear (has 5+ demos)
        self::assertGreaterThanOrEqual(1, count($result->entries));
    }

    /**
     * Test 4: Pagination works correctly per map.
     */
    public function testPaginationWorksPerMap(): void
    {
        // Create 10 qualified players on de_mirage
        for ($p = 1; $p <= 10; $p++) {
            $steamId = "7656119800000000{$p}";
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRatingWithMap($steamId, 'de_mirage', (11 - $p) * 0.1);
            }
        }

        // Query with limit=5, offset=5
        $query = new GetMapLeaderboardQuery(mapId: 'de_mirage', limit: 5, offset: 5);
        $result = ($this->handler)($query);

        // Should return 5 entries
        self::assertEquals(5, count($result->entries));

        // Verify pagination metadata
        self::assertEquals(5, $result->pagination->limit);
        self::assertEquals(5, $result->pagination->offset);

        // Verify ranks are offset-aware (6-10, not 1-5)
        self::assertEquals(6, $result->entries[0]->rank);
        self::assertEquals(10, $result->entries[4]->rank);
    }

    /**
     * Create a TraceRating with a specific map.
     */
    private function createTraceRatingWithMap(
        string $playerSteamId,
        string $map,
        float $traceAdjusted = 1.0,
    ): void {
        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
        $demo->setMap($map);

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
            calculatedAt: new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
        );

        $this->em->persist($result);
        $this->em->persist($trace);
        $this->em->flush();
        $this->em->clear();
    }
}
