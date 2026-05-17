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
 * Integration tests for TraceHistoryController.
 *
 * Tests GET /api/players/{playerId}/trace-history endpoint with database integration.
 * Covers happy path, pagination, sorting, error cases, data integrity, and performance.
 */
final class TraceHistoryControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
        self::ensureKernelShutdown();
    }

    /**
     * Test 1: Happy path - returns 200 with valid TRACE history.
     */
    public function test_getTraceHistory_returns200WithValidData(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000001', count: 5);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('traces', $payload);
        self::assertArrayHasKey('pagination', $payload);
        self::assertCount(5, $payload['traces']);
    }

    /**
     * Test 2: Each TRACE includes component percentiles.
     */
    public function test_getTraceHistory_includesComponentPercentiles(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000002', count: 3);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Check first trace has percentiles
        $firstTrace = $payload['traces'][0];
        self::assertArrayHasKey('percentiles', $firstTrace);
        $percentiles = $firstTrace['percentiles'];
        self::assertArrayHasKey('ekill', $percentiles);
        self::assertArrayHasKey('aim', $percentiles);
        self::assertArrayHasKey('kast', $percentiles);
        self::assertArrayHasKey('util', $percentiles);
        self::assertArrayHasKey('clutch', $percentiles);

        // Percentiles should be null or in range [0, 100]
        foreach ($percentiles as $value) {
            if ($value !== null) {
                self::assertGreaterThanOrEqual($value, 0.0);
                self::assertLessThanOrEqual($value, 100.0);
            }
        }
    }

    /**
     * Test 3: Percentile values are in valid range [0, 100].
     */
    public function test_getTraceHistory_percentileValuesInValidRange(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000003', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        foreach ($payload['traces'] as $trace) {
            foreach ($trace['percentiles'] as $percentile) {
                if ($percentile !== null) {
                    self::assertGreaterThanOrEqual($percentile, 0.0);
                    self::assertLessThanOrEqual($percentile, 100.0);
                }
            }
        }
    }

    /**
     * Test 4: Respects limit parameter (max 100).
     */
    public function test_getTraceHistory_respectsLimitParameter(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000004', count: 20);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=5");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(5, $payload['traces']);
        self::assertSame(5, $payload['pagination']['limit']);
    }

    /**
     * Test 5: Respects offset parameter for pagination.
     */
    public function test_getTraceHistory_respectsOffsetParameter(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000005', count: 20);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?offset=5&limit=5");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(5, $payload['traces']);
        self::assertSame(5, $payload['pagination']['offset']);
    }

    /**
     * Test 6: Returns pagination metadata.
     */
    public function test_getTraceHistory_returnsPaginationMetadata(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000006', count: 15);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=10&offset=0");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $pagination = $payload['pagination'];
        self::assertArrayHasKey('total', $pagination);
        self::assertArrayHasKey('limit', $pagination);
        self::assertArrayHasKey('offset', $pagination);
        self::assertArrayHasKey('hasMore', $pagination);

        self::assertSame(15, $pagination['total']);
        self::assertSame(10, $pagination['limit']);
        self::assertSame(0, $pagination['offset']);
        self::assertTrue($pagination['hasMore']);
    }

    /**
     * Test 7: hasMore flag is correct.
     */
    public function test_getTraceHistory_hasMoreFlagAccurate(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000007', count: 25);

        // First page should have more
        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=10&offset=0");
        $payload1 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertTrue($payload1['pagination']['hasMore']);

        // Second page should still have more
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=10&offset=10");
        $payload2 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertTrue($payload2['pagination']['hasMore']);

        // Third page should not have more
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=10&offset=20");
        $payload3 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertFalse($payload3['pagination']['hasMore']);
    }

    /**
     * Test 8: Validates limit range (1-100).
     */
    public function test_getTraceHistory_validatesLimitRange(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000008', count: 5);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?limit=200");

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_limit', $payload['error']['code']);
    }

    /**
     * Test 9: Validates offset is non-negative.
     */
    public function test_getTraceHistory_validatesOffsetNonNegative(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000009', count: 5);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?offset=-1");

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_offset', $payload['error']['code']);
    }

    /**
     * Test 10: Validates sortBy parameter.
     */
    public function test_getTraceHistory_validatesSortBy(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000010', count: 5);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?sortBy=invalid");

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_sort_by', $payload['error']['code']);
    }

    /**
     * Test 11: Default sort is by date descending (newest first).
     */
    public function test_getTraceHistory_defaultSortByDateDesc(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000011', count: 3);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $traces = $payload['traces'];
        // Verify descending order (newest first)
        $calculatedAts = array_map(fn($t) => $t['calculatedAt'], $traces);
        $sortedAts = $calculatedAts;
        rsort($sortedAts);
        self::assertSame($sortedAts, $calculatedAts);
    }

    /**
     * Test 12: Respects sortBy=date_asc parameter.
     */
    public function test_getTraceHistory_sortByDateAscending(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000012', count: 3);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history?sortBy=date_asc");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $traces = $payload['traces'];
        // Verify ascending order (oldest first)
        $calculatedAts = array_map(fn($t) => $t['calculatedAt'], $traces);
        $sortedAts = $calculatedAts;
        sort($sortedAts);
        self::assertSame($sortedAts, $calculatedAts);
    }

    /**
     * Test 13: Returns 200 for player with no traces.
     */
    public function test_getTraceHistory_returnsEmptyCollectionForPlayerWithoutTraces(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/players/nonexistent-player/trace-history');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(0, $payload['traces']);
        self::assertSame(0, $payload['pagination']['total']);
    }

    /**
     * Test 14: JSON properties are camelCase (not snake_case).
     */
    public function test_getTraceHistory_serializedPropertiesCamelCase(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000014', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $trace = $payload['traces'][0];
        self::assertArrayHasKey('traceBase', $trace);
        self::assertArrayHasKey('traceAdjusted', $trace);
        self::assertArrayHasKey('traceNormalized', $trace);
        self::assertArrayHasKey('trustMultiplier', $trace);
        self::assertArrayHasKey('calibrationVersion', $trace);
        self::assertArrayHasKey('calculatedAt', $trace);
        self::assertArrayHasKey('createdAt', $trace);
        self::assertArrayHasKey('percentiles', $trace);

        // Verify snake_case properties do NOT exist
        self::assertArrayNotHasKey('trace_base', $trace);
        self::assertArrayNotHasKey('trace_adjusted', $trace);
        self::assertArrayNotHasKey('trust_multiplier', $trace);
    }

    /**
     * Test 15: Timestamps are ISO 8601 formatted strings.
     */
    public function test_getTraceHistory_timestampsAreISO8601(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000015', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $trace = $payload['traces'][0];
        self::assertIsString($trace['calculatedAt']);
        self::assertIsString($trace['createdAt']);

        // Verify ISO 8601 format (RFC 3339)
        self::assertNotFalse(\DateTimeImmutable::createFromFormat('c', $trace['calculatedAt']));
        self::assertNotFalse(\DateTimeImmutable::createFromFormat('c', $trace['createdAt']));
    }

    /**
     * Test 16: Response includes all required TRACE fields.
     */
    public function test_getTraceHistory_includesAllTraceFields(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000016', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $trace = $payload['traces'][0];
        self::assertArrayHasKey('traceBase', $trace);
        self::assertArrayHasKey('traceAdjusted', $trace);
        self::assertArrayHasKey('traceNormalized', $trace);
        self::assertArrayHasKey('trustMultiplier', $trace);
        self::assertArrayHasKey('components', $trace);
        self::assertArrayHasKey('percentiles', $trace);
        self::assertArrayHasKey('calibrationVersion', $trace);
        self::assertArrayHasKey('calculatedAt', $trace);
        self::assertArrayHasKey('createdAt', $trace);
    }

    /**
     * Test 17: Response includes all component scores.
     */
    public function test_getTraceHistory_includesAllComponentScores(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000017', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $components = $payload['traces'][0]['components'];
        self::assertArrayHasKey('ekill', $components);
        self::assertArrayHasKey('aim', $components);
        self::assertArrayHasKey('kast', $components);
        self::assertArrayHasKey('util', $components);
        self::assertArrayHasKey('clutch', $components);
    }

    /**
     * Test 18: Cache-Control header is set.
     */
    public function test_getTraceHistory_cacheHeaderSet(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000018', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Cache-Control', 'public, max-age=300');
    }

    /**
     * Test 19: Content-Type header is application/json.
     */
    public function test_getTraceHistory_returnsCorrectContentType(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000019', count: 1);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerId}/trace-history");

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 20: Multiple requests for same player return consistent data.
     */
    public function test_getTraceHistory_multipleRequestsSamePlayerConsistent(): void
    {
        $playerId = $this->createPlayerWithTraces(playerSteamId: '76561198000000020', count: 5);

        $client = self::createClient();

        $client->request('GET', "/api/players/{$playerId}/trace-history");
        self::assertResponseStatusCodeSame(200);
        $payload1 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $client->request('GET', "/api/players/{$playerId}/trace-history");
        self::assertResponseStatusCodeSame(200);
        $payload2 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame($payload1, $payload2);
    }

    // Helper method

    private function createPlayerWithTraces(string $playerSteamId, int $count = 5): string
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        $player = new Player($playerSteamId, "Test Player {$playerSteamId}");
        $em->persist($player);

        // Create multiple TRACE records with different timestamps
        for ($i = 0; $i < $count; $i++) {
            $demo = new Demo("/storage/demos/trace_{$i}.dem", originalFilename: "trace_{$i}.dem");
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

            // Create TRACE with staggered timestamps
            $calculatedAt = new \DateTimeImmutable("2026-05-15T12:00:{$i}0+00:00");
            $trace = new TraceRating(
                analysisResult: $result,
                playerId: $playerSteamId,
                demoId: $demo->getIdString(),
                calibrationVersion: 'default-v1',
                traceBase: 1.0 + ($i * 0.1),
                traceAdjusted: 1.0 + ($i * 0.1),
                traceNormalized: 1.0,
                trustMultiplier: 0.95,
                roundCount: 24,
                ekill: 1.0 + ($i * 0.1),
                aim: 1.0 - ($i * 0.05),
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

            $em->persist($demo);
            $em->persist($result);
            $em->persist($trace);
        }

        $em->flush();
        $em->clear();

        return $playerSteamId;
    }
}
