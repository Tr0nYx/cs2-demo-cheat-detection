<?php

declare(strict_types=1);

namespace App\Tests\Presentation\Controller;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Integration tests for LeaderboardController HTTP endpoint.
 *
 * Tests GET /api/leaderboards/global endpoint with database integration.
 * Covers happy path, pagination, validation, schema, cache headers, and ranking.
 */
final class LeaderboardControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
        self::ensureKernelShutdown();
    }

    /**
     * Test 1: Endpoint returns HTTP 200 with valid request.
     */
    public function testGetGlobalLeaderboardReturns200(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 2: Response has correct JSON schema (entries, pagination).
     */
    public function testGetGlobalLeaderboardReturnsCorrectSchema(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Top-level keys
        self::assertArrayHasKey('entries', $payload);
        self::assertArrayHasKey('pagination', $payload);

        // entries is array
        self::assertIsArray($payload['entries']);

        // pagination structure
        $pagination = $payload['pagination'];
        self::assertArrayHasKey('total', $pagination);
        self::assertArrayHasKey('limit', $pagination);
        self::assertArrayHasKey('offset', $pagination);
        self::assertArrayHasKey('hasMore', $pagination);
    }

    /**
     * Test 3: Leaderboard entries have all required fields.
     */
    public function testLeaderboardEntryHasRequiredFields(): void
    {
        $this->createQualifiedPlayers(3);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(3, $payload['entries']);
        $entry = $payload['entries'][0];

        // All required fields
        self::assertArrayHasKey('rank', $entry);
        self::assertArrayHasKey('playerId', $entry);
        self::assertArrayHasKey('playerName', $entry);
        self::assertArrayHasKey('traceAdjusted', $entry);
        self::assertArrayHasKey('components', $entry);
        self::assertArrayHasKey('demoCount', $entry);
        self::assertArrayHasKey('createdAt', $entry);

        // Components structure
        $components = $entry['components'];
        self::assertArrayHasKey('ekill', $components);
        self::assertArrayHasKey('aim', $components);
        self::assertArrayHasKey('kast', $components);
        self::assertArrayHasKey('util', $components);
        self::assertArrayHasKey('clutch', $components);
    }

    /**
     * Test 4: Pagination limit and offset parameters work.
     */
    public function testPaginationLimitAndOffset(): void
    {
        $this->createQualifiedPlayers(10);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global?limit=5&offset=0');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(5, $payload['entries']);
        self::assertSame(5, $payload['pagination']['limit']);
        self::assertSame(0, $payload['pagination']['offset']);
    }

    /**
     * Test 5: Limit validation - rejects limit > 100.
     */
    public function testLimitValidationRejectsOver100(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global?limit=101');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_limit', $payload['error']['code']);
    }

    /**
     * Test 6: Limit validation - rejects limit < 1.
     */
    public function testLimitValidationRejectsZero(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global?limit=0');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_limit', $payload['error']['code']);
    }

    /**
     * Test 7: Offset validation - rejects negative offset.
     */
    public function testOffsetValidationRejectsNegative(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global?offset=-1');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_offset', $payload['error']['code']);
    }

    /**
     * Test 8: Cache-Control header is set to public, max-age=300.
     */
    public function testCacheControlHeaderSet(): void
    {
        $this->createQualifiedPlayers(3);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Cache-Control', 'public, max-age=300');
    }

    /**
     * Test 9: Leaderboard is ranked in descending order by traceAdjusted.
     */
    public function testLeaderboardRankingOrder(): void
    {
        // Create qualified players with specific trace scores
        $em = self::getContainer()->get(EntityManagerInterface::class);

        for ($p = 1; $p <= 5; $p++) {
            $steamId = "7656119800000000{$p}";
            $traceScore = 5 - $p; // 4.0, 3.0, 2.0, 1.0, 0.0

            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceWithScore($steamId, $traceScore - ($d * 0.01));
            }
        }

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Verify ranking
        self::assertSame(1, $payload['entries'][0]['rank']);
        self::assertSame(2, $payload['entries'][1]['rank']);
        self::assertSame(3, $payload['entries'][2]['rank']);
        self::assertSame(4, $payload['entries'][3]['rank']);
        self::assertSame(5, $payload['entries'][4]['rank']);

        // Verify descending order
        for ($i = 1; $i < count($payload['entries']); $i++) {
            self::assertGreaterThanOrEqual(
                $payload['entries'][$i]['traceAdjusted'],
                $payload['entries'][$i - 1]['traceAdjusted']
            );
        }
    }

    /**
     * Test 10: Empty leaderboard for no qualified players.
     */
    public function testEmptyLeaderboardNoQualifiedPlayers(): void
    {
        // Create only unqualified players
        $em = self::getContainer()->get(EntityManagerInterface::class);

        for ($p = 1; $p <= 3; $p++) {
            $steamId = "7656119800000000{$p}";
            for ($d = 1; $d <= 3; $d++) { // Less than 5 demos
                $this->createTraceWithScore($steamId, 1.0);
            }
        }

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(0, $payload['entries']);
        self::assertSame(0, $payload['pagination']['total']);
    }

    /**
     * Test 11: hasMore flag is accurate.
     */
    public function testHasMoreFlagAccurate(): void
    {
        $this->createQualifiedPlayers(15);

        $client = self::createClient();

        // First page should have more
        $client->request('GET', '/api/leaderboards/global?limit=5&offset=0');
        $payload1 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertTrue($payload1['pagination']['hasMore']);

        // Last page should not have more
        $client->request('GET', '/api/leaderboards/global?limit=5&offset=10');
        $payload2 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertFalse($payload2['pagination']['hasMore']);
    }

    /**
     * Test 12: Default limit is 100.
     */
    public function testDefaultLimitIs100(): void
    {
        // Create 100+ qualified players
        for ($p = 1; $p <= 105; $p++) {
            $steamId = str_pad((string) $p, 17, '0', STR_PAD_LEFT);
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceWithScore($steamId, 100 - $p);
            }
        }

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global'); // No limit param

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(100, $payload['entries']);
        self::assertSame(100, $payload['pagination']['limit']);
    }

    /**
     * Test 13: Default offset is 0.
     */
    public function testDefaultOffsetIsZero(): void
    {
        $this->createQualifiedPlayers(5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/global'); // No offset param

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(0, $payload['pagination']['offset']);
        self::assertSame(1, $payload['entries'][0]['rank']);
    }

    /**
     * Test 14: Multiple requests return consistent data.
     */
    public function testMultipleRequestsConsistent(): void
    {
        $this->createQualifiedPlayers(10);

        $client = self::createClient();

        $client->request('GET', '/api/leaderboards/global?limit=5&offset=0');
        $payload1 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('GET', '/api/leaderboards/global?limit=5&offset=0');
        $payload2 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame($payload1, $payload2);
    }

    // Map Leaderboard Tests

    /**
     * Test 15: Map leaderboard returns HTTP 200.
     */
    public function testGetMapLeaderboardReturns200(): void
    {
        $this->createQualifiedPlayersWithMap('de_mirage', 5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/maps/de_mirage');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 16: Map leaderboard returns correct schema.
     */
    public function testMapLeaderboardReturnsCorrectSchema(): void
    {
        $this->createQualifiedPlayersWithMap('de_mirage', 5);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/maps/de_mirage');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('entries', $payload);
        self::assertArrayHasKey('pagination', $payload);
        self::assertIsArray($payload['entries']);
    }

    /**
     * Test 17: Map leaderboard pagination works.
     */
    public function testMapLeaderboardPaginationWorks(): void
    {
        $this->createQualifiedPlayersWithMap('de_mirage', 10);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/maps/de_mirage?limit=5&offset=0');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(5, $payload['entries']);
        self::assertSame(5, $payload['pagination']['limit']);
        self::assertSame(0, $payload['pagination']['offset']);
    }

    /**
     * Test 18: Map ID validation - empty mapId returns 400.
     */
    public function testMapIdValidation(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/maps/');

        // Empty mapId should 404 (route not matched) or 400
        self::assertTrue(
            $client->getResponse()->getStatusCode() === 400 ||
            $client->getResponse()->getStatusCode() === 404
        );
    }

    // Time Window Leaderboard Tests

    /**
     * Test 19: Time-window leaderboard returns HTTP 200.
     */
    public function testGetTimeWindowLeaderboardReturns200(): void
    {
        $this->createQualifiedPlayersInWindow(5, 7);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/windows/30d');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 20: Time-window leaderboard returns correct schema.
     */
    public function testTimeWindowLeaderboardReturnsCorrectSchema(): void
    {
        $this->createQualifiedPlayersInWindow(5, 7);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/windows/30d');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('entries', $payload);
        self::assertArrayHasKey('pagination', $payload);
    }

    /**
     * Test 21: Time-window validation - invalid window returns 400.
     */
    public function testTimeWindowValidation(): void
    {
        $client = self::createClient();

        // Invalid window
        $client->request('GET', '/api/leaderboards/windows/15d');
        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_time_window', $payload['error']['code']);

        // Valid window
        $client->request('GET', '/api/leaderboards/windows/30d');
        self::assertResponseStatusCodeSame(200);
    }

    /**
     * Test 22: Time-window pagination works.
     */
    public function testTimeWindowPaginationWorks(): void
    {
        $this->createQualifiedPlayersInWindow(10, 7);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/windows/90d?limit=10&offset=0');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertLessThanOrEqual(10, count($payload['entries']));
        self::assertSame(10, $payload['pagination']['limit']);
    }

    // Helper methods

    private function createQualifiedPlayers(int $count): void
    {
        for ($p = 1; $p <= $count; $p++) {
            $steamId = "7656119800000000{$p}";
            $traceScore = $count - $p; // Descending scores

            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceWithScore($steamId, $traceScore - ($d * 0.01));
            }
        }
    }

    private function createTraceWithScore(string $playerSteamId, float $traceScore): void
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        $player = new Player($playerSteamId, "Player {$playerSteamId}");
        $em->persist($player);

        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
        $em->persist($demo);

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
            traceBase: $traceScore,
            traceAdjusted: $traceScore,
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

        $em->persist($result);
        $em->persist($trace);
        $em->flush();
        $em->clear();
    }

    private function createQualifiedPlayersWithMap(string $map, int $count): void
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        for ($p = 1; $p <= $count; $p++) {
            $steamId = "7656119800000000{$p}";
            $traceScore = $count - $p;

            for ($d = 1; $d <= 5; $d++) {
                $player = new Player($steamId, "Player {$steamId}");
                $em->persist($player);

                $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
                $demo->setMap($map);
                $em->persist($demo);

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
                    playerId: $steamId,
                    demoId: $demo->getIdString(),
                    calibrationVersion: 'default-v1',
                    traceBase: $traceScore - ($d * 0.01),
                    traceAdjusted: $traceScore - ($d * 0.01),
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

                $em->persist($result);
                $em->persist($trace);
            }
        }

        $em->flush();
        $em->clear();
    }

    private function createQualifiedPlayersInWindow(int $count, int $daysAgo): void
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);
        $calculatedAt = new \DateTimeImmutable("-{$daysAgo} days");

        for ($p = 1; $p <= $count; $p++) {
            $steamId = "7656119800000000{$p}";
            $traceScore = $count - $p;

            for ($d = 1; $d <= 5; $d++) {
                $player = new Player($steamId, "Player {$steamId}");
                $em->persist($player);

                $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
                $em->persist($demo);

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
                    playerId: $steamId,
                    demoId: $demo->getIdString(),
                    calibrationVersion: 'default-v1',
                    traceBase: $traceScore - ($d * 0.01),
                    traceAdjusted: $traceScore - ($d * 0.01),
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

                $em->persist($result);
                $em->persist($trace);
            }
        }

        $em->flush();
        $em->clear();
    }

    /**
     * Test 19: Team leaderboard endpoint returns HTTP 200.
     */
    public function testGetTeamLeaderboardReturns200(): void
    {
        $this->createQualifiedTeamsWithMembers(3);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/teams');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 20: Team leaderboard returns teams ranked by aggregated score.
     */
    public function testTeamLeaderboardReturnsTeams(): void
    {
        $this->createQualifiedTeamsWithMembers(3);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/teams');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(3, $payload['entries']);

        // Verify team names present
        foreach ($payload['entries'] as $entry) {
            self::assertStringContainsString('Team', $entry['playerName']);
            self::assertIsNumeric($entry['traceAdjusted']);
            self::assertGreater(0, $entry['demoCount']);
        }
    }

    /**
     * Test 21: Team leaderboard pagination works.
     */
    public function testTeamLeaderboardPaginationWorks(): void
    {
        $this->createQualifiedTeamsWithMembers(10);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/teams?limit=5&offset=0');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(5, $payload['entries']);
        self::assertSame(5, $payload['pagination']['limit']);
        self::assertSame(0, $payload['pagination']['offset']);
    }

    /**
     * Test 22: Team leaderboard has Cache-Control header.
     */
    public function testTeamLeaderboardHasCacheControlHeader(): void
    {
        $this->createQualifiedTeamsWithMembers(3);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/teams');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Cache-Control', 'public, max-age=300');
    }

    /**
     * Helper: Create N teams with qualified members.
     */
    private function createQualifiedTeamsWithMembers(int $teamCount): void
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        for ($t = 1; $t <= $teamCount; $t++) {
            $team = new \App\Domain\Team\Team(
                name: "Team{$t}",
                displayName: "Team {$t}",
            );

            // Add 2 members per team, each with 5 demos (qualified)
            for ($m = 1; $m <= 2; $m++) {
                $steamId = "765611980000{$t}{$m}";
                $player = new Player($steamId, "Player {$t}-{$m}");
                $team->addPlayer($player);
                $em->persist($player);

                $traceScore = (5 - $t) + (2 - $m) * 0.5;
                for ($d = 1; $d <= 5; $d++) {
                    $this->createTraceWithScore($steamId, $traceScore - ($d * 0.01));
                }
            }

            $em->persist($team);
        }

        $em->flush();
        $em->clear();
    }
}
