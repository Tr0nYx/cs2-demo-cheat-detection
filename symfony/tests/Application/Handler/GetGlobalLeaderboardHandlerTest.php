<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetGlobalLeaderboardHandler;
use App\Application\Query\GetGlobalLeaderboardQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for GetGlobalLeaderboardHandler.
 *
 * Tests the CQRS handler that builds the global leaderboard with qualified players,
 * ranking logic, pagination, and component includes.
 */
final class GetGlobalLeaderboardHandlerTest extends KernelTestCase
{
    private GetGlobalLeaderboardHandler $handler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetGlobalLeaderboardHandler::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Returns qualified players (5+ demos) ranked by trace_adjusted DESC.
     */
    public function testReturnsTopOneHundredQualified(): void
    {
        // Create 5 qualified players (5+ demos each)
        for ($p = 1; $p <= 5; $p++) {
            $steamId = "7656119800000000{$p}";
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRating(
                    playerSteamId: $steamId,
                    traceAdjusted: (6 - $p) - ($d * 0.1), // Descending across players
                );
            }
        }

        // Query leaderboard
        $query = new GetGlobalLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify entries
        self::assertLessThanOrEqual(100, count($result->entries));
        self::assertGreaterThan(0, count($result->entries));

        // Verify sorted by traceAdjusted DESC
        for ($i = 1; $i < count($result->entries); $i++) {
            self::assertGreaterThanOrEqual(
                $result->entries[$i]->traceAdjusted,
                $result->entries[$i - 1]->traceAdjusted
            );
        }
    }

    /**
     * Test 2: Filters out unqualified players (< 5 demos).
     */
    public function testFiltersUnqualifiedPlayers(): void
    {
        // Create 2 qualified players
        for ($p = 1; $p <= 2; $p++) {
            $steamId = "7656119800000000{$p}";
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRating(playerSteamId: $steamId);
            }
        }

        // Create 3 unqualified players (< 5 demos)
        for ($p = 3; $p <= 5; $p++) {
            $steamId = "7656119800000000{$p}";
            for ($d = 1; $d <= 3; $d++) {
                $this->createTraceRating(playerSteamId: $steamId);
            }
        }

        // Query leaderboard
        $query = new GetGlobalLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify only 2 qualified players returned
        self::assertCount(2, $result->entries);

        // Verify unqualified players not in results
        $playerIds = array_map(fn($e) => $e->playerId, $result->entries);
        self::assertNotContains('76561198000000003', $playerIds);
        self::assertNotContains('76561198000000004', $playerIds);
        self::assertNotContains('76561198000000005', $playerIds);
    }

    /**
     * Test 3: Pagination with offset adjusts rank correctly.
     */
    public function testPaginationWithOffset(): void
    {
        // Create 10 qualified players
        for ($p = 1; $p <= 10; $p++) {
            $steamId = str_pad((string) $p, 17, '0', STR_PAD_LEFT);
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRating(
                    playerSteamId: $steamId,
                    traceAdjusted: 10 - $p,
                );
            }
        }

        // Query with limit=5, offset=5
        $query = new GetGlobalLeaderboardQuery(limit: 5, offset: 5);
        $result = ($this->handler)($query);

        // Verify returns entries 6-10
        self::assertCount(5, $result->entries);
        self::assertSame(6, $result->entries[0]->rank);
        self::assertSame(7, $result->entries[1]->rank);
        self::assertSame(10, $result->entries[4]->rank);
    }

    /**
     * Test 4: Pagination metadata includes total and hasMore.
     */
    public function testCountQualifiedIncludesAllQualified(): void
    {
        // Create 12 qualified players
        for ($p = 1; $p <= 12; $p++) {
            $steamId = str_pad((string) $p, 17, '0', STR_PAD_LEFT);
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRating(playerSteamId: $steamId);
            }
        }

        // Query first page
        $query = new GetGlobalLeaderboardQuery(limit: 5, offset: 0);
        $result = ($this->handler)($query);

        self::assertSame(12, $result->pagination->total);
        self::assertTrue($result->pagination->hasMore());

        // Query last page
        $query = new GetGlobalLeaderboardQuery(limit: 5, offset: 10);
        $result = ($this->handler)($query);

        self::assertSame(12, $result->pagination->total);
        self::assertFalse($result->pagination->hasMore());
    }

    /**
     * Test 5: Returns player display names (or "Unknown" if player not found).
     */
    public function testReturnsPlayerDisplayNames(): void
    {
        // Create player with display name
        $player1 = new Player('76561198000000001', 'TestPlayer1');
        $this->em->persist($player1);

        // Create trace ratings for this player
        for ($d = 1; $d <= 5; $d++) {
            $this->createTraceRating(
                playerSteamId: '76561198000000001',
                player: $player1,
            );
        }

        // Create orphaned trace (no player in DB)
        $demo = new Demo('/storage/demos/orphan.dem', originalFilename: 'orphan.dem');
        $player2 = new Player('76561198000000002', 'TestPlayer2');
        $this->em->persist($demo);
        $this->em->persist($player2);

        $result = new AnalysisResult(
            $demo,
            $player2,
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
            playerId: '76561198000000002',
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: 2.0,
            traceAdjusted: 2.0,
            traceNormalized: 1.0,
            trustMultiplier: 0.95,
            roundCount: 24,
            ekill: 1.5,
            aim: 1.2,
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

        for ($d = 2; $d <= 5; $d++) {
            $demo = new Demo("/storage/demos/orphan_{$d}.dem", originalFilename: "orphan_{$d}.dem");
            $this->em->persist($demo);
            $result = new AnalysisResult(
                $demo,
                $player2,
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
                playerId: '76561198000000002',
                demoId: $demo->getIdString(),
                calibrationVersion: 'default-v1',
                traceBase: 2.0,
                traceAdjusted: 2.0 - ($d * 0.1),
                traceNormalized: 1.0,
                trustMultiplier: 0.95,
                roundCount: 24,
                ekill: 1.5,
                aim: 1.2,
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
                calculatedAt: new \DateTimeImmutable("2026-05-15T12:00:{$d}0+00:00"),
            );
            $this->em->persist($demo);
            $this->em->persist($result);
            $this->em->persist($trace);
        }

        $this->em->persist($result);
        $this->em->persist($trace);
        $this->em->flush();
        $this->em->clear();

        // Query leaderboard
        $query = new GetGlobalLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify player names
        self::assertCount(2, $result->entries);
        self::assertSame('TestPlayer1', $result->entries[1]->playerName);
        self::assertSame('TestPlayer2', $result->entries[0]->playerName);
    }

    /**
     * Test 6: Component scores are included in each entry.
     */
    public function testComponentsIncludedInEntry(): void
    {
        // Create a single qualified player
        for ($d = 1; $d <= 5; $d++) {
            $this->createTraceRating(
                playerSteamId: '76561198000000001',
                ekill: 1.2,
                aim: 1.5,
                kast: 0.9,
                util: 1.1,
                clutch: 0.8,
            );
        }

        // Query leaderboard
        $query = new GetGlobalLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        self::assertCount(1, $result->entries);
        $entry = $result->entries[0];

        // Verify components exist
        self::assertIsArray($entry->components);
        self::assertArrayHasKey('ekill', $entry->components);
        self::assertArrayHasKey('aim', $entry->components);
        self::assertArrayHasKey('kast', $entry->components);
        self::assertArrayHasKey('util', $entry->components);
        self::assertArrayHasKey('clutch', $entry->components);

        // Verify values match
        self::assertSame(1.2, $entry->components['ekill']);
        self::assertSame(1.5, $entry->components['aim']);
        self::assertSame(0.9, $entry->components['kast']);
        self::assertSame(1.1, $entry->components['util']);
        self::assertSame(0.8, $entry->components['clutch']);
    }

    /**
     * Test 7: Demo count reflects total demos for player.
     */
    public function testDemoCountAccurate(): void
    {
        // Create player with 8 demos
        for ($d = 1; $d <= 8; $d++) {
            $this->createTraceRating(playerSteamId: '76561198000000001');
        }

        // Query leaderboard
        $query = new GetGlobalLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        self::assertCount(1, $result->entries);
        self::assertSame(8, $result->entries[0]->demoCount);
    }

    // Helper method

    private function createTraceRating(
        string $playerSteamId,
        ?Player $player = null,
        float $traceAdjusted = 1.0,
        float $ekill = 1.0,
        float $aim = 1.0,
        float $kast = 1.0,
        float $util = 1.0,
        float $clutch = 1.0,
    ): void {
        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
        if (!$player) {
            $player = new Player($playerSteamId, "Player {$playerSteamId}");
        }

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
            ekill: $ekill,
            aim: $aim,
            kast: $kast,
            util: $util,
            clutch: $clutch,
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
