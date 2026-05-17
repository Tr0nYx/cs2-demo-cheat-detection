<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetPlayerComparisonHandler;
use App\Application\Query\GetPlayerComparisonQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for GetPlayerComparisonHandler.
 *
 * Tests the CQRS handler that aggregates 4 metrics (components, trend, maps, history)
 * for two-player comparison view. Verifies all metrics are populated, edge cases
 * are handled gracefully, and validation works correctly.
 */
final class GetPlayerComparisonHandlerTest extends KernelTestCase
{
    private GetPlayerComparisonHandler $handler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetPlayerComparisonHandler::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Returns all 4 metrics for both players.
     */
    public function testReturnsFourMetricsForBothPlayers(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        // Create both players
        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');

        // Create some TRACE data
        $this->createTraceRating($playerAId, traceAdjusted: 1.5);
        $this->createTraceRating($playerBId, traceAdjusted: 1.3);

        // Query comparison
        $query = new GetPlayerComparisonQuery($playerAId, $playerBId);
        $result = ($this->handler)($query);

        // Verify all 4 metric cards present for both players
        self::assertNotNull($result->playerAComponents);
        self::assertNotNull($result->playerATrend);
        self::assertNotNull($result->playerAMaps);
        self::assertNotNull($result->playerAHistory);

        self::assertNotNull($result->playerBComponents);
        self::assertNotNull($result->playerBTrend);
        self::assertNotNull($result->playerBMaps);
        self::assertNotNull($result->playerBHistory);

        // Verify player names
        self::assertSame('Player A', $result->playerAName);
        self::assertSame('Player B', $result->playerBName);
    }

    /**
     * Test 2: Component breakdown includes percentiles.
     */
    public function testComponentBreakdownIncludesPercentiles(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');

        // Create TRACE data for both
        $this->createTraceRating(
            $playerAId,
            ekill: 1.2,
            aim: 1.5,
            kast: 0.9,
            util: 1.1,
            clutch: 0.8,
        );
        $this->createTraceRating(
            $playerBId,
            ekill: 1.0,
            aim: 1.3,
            kast: 1.0,
            util: 0.9,
            clutch: 0.9,
        );

        $query = new GetPlayerComparisonQuery($playerAId, $playerBId);
        $result = ($this->handler)($query);

        // Check that components have percentile data
        $componentsA = $result->playerAComponents->components;
        self::assertArrayHasKey('ekill', $componentsA);
        self::assertArrayHasKey('aim', $componentsA);
        self::assertArrayHasKey('kast', $componentsA);
        self::assertArrayHasKey('util', $componentsA);
        self::assertArrayHasKey('clutch', $componentsA);

        // Each component should have value and percentile
        foreach (['ekill', 'aim', 'kast', 'util', 'clutch'] as $component) {
            self::assertArrayHasKey('value', $componentsA[$component]);
            self::assertArrayHasKey('percentile', $componentsA[$component]);
            self::assertIsFloat($componentsA[$component]['value']);
            self::assertIsNumeric($componentsA[$component]['percentile']);
        }
    }

    /**
     * Test 3: Trend shows last 10 demos.
     */
    public function testTrendShowsLastTenDemos(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');

        // Create 15 TRACE ratings for player A
        for ($i = 0; $i < 15; $i++) {
            $this->createTraceRating($playerAId, traceAdjusted: 1.0 + ($i * 0.1));
        }

        $query = new GetPlayerComparisonQuery($playerAId, $playerBId);
        $result = ($this->handler)($query);

        // Trend should have at most 10 entries (findLatestByPlayer limit 10)
        $historyA = $result->playerATrend->history;
        self::assertLessThanOrEqual(10, count($historyA));
        self::assertGreaterThan(0, count($historyA));

        // Each entry should have date and value
        foreach ($historyA as $entry) {
            self::assertArrayHasKey('date', $entry);
            self::assertArrayHasKey('value', $entry);
        }
    }

    /**
     * Test 4: Map affinity shows top 3 maps.
     */
    public function testMapAffinityShowsTopThreeMaps(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');

        // Create demos on different maps
        $this->createTraceRatingOnMap($playerAId, 'de_mirage', traceAdjusted: 1.5);
        $this->createTraceRatingOnMap($playerAId, 'de_ancient', traceAdjusted: 1.3);
        $this->createTraceRatingOnMap($playerAId, 'de_nuke', traceAdjusted: 1.1);
        $this->createTraceRatingOnMap($playerAId, 'de_inferno', traceAdjusted: 0.9);

        $query = new GetPlayerComparisonQuery($playerAId, $playerBId);
        $result = ($this->handler)($query);

        // Map affinity should have at most 3 entries
        $mapsA = $result->playerAMaps->topMaps;
        self::assertLessThanOrEqual(3, count($mapsA));

        // Each map should have name and score
        foreach ($mapsA as $mapData) {
            self::assertArrayHasKey('map', $mapData);
            self::assertArrayHasKey('traceAdjusted', $mapData);
        }

        // Verify sorting by score (descending)
        for ($i = 1; $i < count($mapsA); $i++) {
            self::assertGreaterThanOrEqual(
                $mapsA[$i]['traceAdjusted'],
                $mapsA[$i - 1]['traceAdjusted']
            );
        }
    }

    /**
     * Test 5: Match history shows shared demos.
     */
    public function testMatchHistoryShowsSharedDemos(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');

        // Create demos where both players participated
        $this->createSharedDemo($playerAId, $playerBId, 'de_mirage');
        $this->createSharedDemo($playerAId, $playerBId, 'de_ancient');

        $query = new GetPlayerComparisonQuery($playerAId, $playerBId);
        $result = ($this->handler)($query);

        // Should have shared demos
        $historyA = $result->playerAHistory->sharedDemos;
        self::assertGreaterThan(0, count($historyA));

        // Each entry should have demoId, date, mapId
        foreach ($historyA as $demo) {
            self::assertArrayHasKey('demoId', $demo);
            self::assertArrayHasKey('date', $demo);
            self::assertArrayHasKey('mapId', $demo);
        }
    }

    /**
     * Test 6: Throws when player not found.
     */
    public function testThrowsWhenPlayerNotFound(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $query = new GetPlayerComparisonQuery(
            '76561198000000001',
            '76561198000000002'
        );

        ($this->handler)($query);
    }

    /**
     * Test 7: Throws when comparing with self.
     */
    public function testThrowsWhenComparingWithSelf(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $query = new GetPlayerComparisonQuery(
            '76561198000000001',
            '76561198000000001'
        );

        ($this->handler)($query);
    }

    /**
     * Helper: Create a player.
     */
    private function createPlayer(string $steamId, string $displayName): Player
    {
        $player = new Player($steamId);
        $player->setDisplayName($displayName);
        $this->em->persist($player);
        $this->em->flush();

        return $player;
    }

    /**
     * Helper: Create a TRACE rating.
     */
    private function createTraceRating(
        string $playerId,
        float $ekill = 1.0,
        float $aim = 1.0,
        float $kast = 1.0,
        float $util = 1.0,
        float $clutch = 1.0,
        float $traceAdjusted = 1.0,
    ): void {
        // Create demo and analysis result
        $demo = new Demo();
        $this->em->persist($demo);

        $player = $this->em->getRepository(Player::class)->find($playerId);
        $analysisResult = new AnalysisResult(
            demo: $demo,
            player: $player,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisResult);

        // Create TRACE rating
        $trace = new TraceRating(
            playerId: $playerId,
            analysisResult: $analysisResult,
            ekill: $ekill,
            aim: $aim,
            kast: $kast,
            util: $util,
            clutch: $clutch,
            traceAdjusted: $traceAdjusted,
            trustMultiplier: 1.0,
            calibrationVersion: 'v1.0',
        );
        $this->em->persist($trace);
        $this->em->flush();
    }

    /**
     * Helper: Create TRACE rating on specific map.
     */
    private function createTraceRatingOnMap(
        string $playerId,
        string $map,
        float $traceAdjusted = 1.0,
    ): void {
        $demo = new Demo();
        $demo->setMap($map);
        $this->em->persist($demo);

        $player = $this->em->getRepository(Player::class)->find($playerId);
        $analysisResult = new AnalysisResult(
            demo: $demo,
            player: $player,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisResult);

        $trace = new TraceRating(
            playerId: $playerId,
            analysisResult: $analysisResult,
            ekill: 1.0,
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 1.0,
            traceAdjusted: $traceAdjusted,
            trustMultiplier: 1.0,
            calibrationVersion: 'v1.0',
        );
        $this->em->persist($trace);
        $this->em->flush();
    }

    /**
     * Helper: Create a demo with both players.
     */
    private function createSharedDemo(string $playerAId, string $playerBId, string $map): void
    {
        $demo = new Demo();
        $demo->setMap($map);
        $this->em->persist($demo);

        $playerA = $this->em->getRepository(Player::class)->find($playerAId);
        $playerB = $this->em->getRepository(Player::class)->find($playerBId);

        $analysisA = new AnalysisResult(
            demo: $demo,
            player: $playerA,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisA);

        $analysisB = new AnalysisResult(
            demo: $demo,
            player: $playerB,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisB);

        $this->em->flush();
    }
}
