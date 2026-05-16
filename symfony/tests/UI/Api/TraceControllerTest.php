<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Integration tests for TraceController.
 *
 * Tests the GET /api/demos/{id}/trace endpoint with database integration.
 * Covers happy path, error cases, data integrity, and edge cases.
 */
final class TraceControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE trace_rating, analysis_result, player, demo RESTART IDENTITY CASCADE');
        self::ensureKernelShutdown();
    }

    /**
     * Test 1: Happy path - returns 200 with TraceDto when TRACE exists.
     */
    public function test_getTrace_returnsTraceDto_whenTraceExists(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('traceBase', $payload);
        self::assertArrayHasKey('traceAdjusted', $payload);
        self::assertArrayHasKey('traceNormalized', $payload);
        self::assertArrayHasKey('trustMultiplier', $payload);
        self::assertArrayHasKey('components', $payload);
        self::assertArrayHasKey('calibrationVersion', $payload);
        self::assertArrayHasKey('calculatedAt', $payload);
        self::assertArrayHasKey('createdAt', $payload);
    }

    /**
     * Test 2: Returns all component scores.
     */
    public function test_getTrace_returnsAllComponentScores(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('components', $payload);
        self::assertArrayHasKey('ekill', $payload['components']);
        self::assertArrayHasKey('aim', $payload['components']);
        self::assertArrayHasKey('kast', $payload['components']);
        self::assertArrayHasKey('util', $payload['components']);
        self::assertArrayHasKey('clutch', $payload['components']);
    }

    /**
     * Test 3: Trust multiplier is in valid range [0.73, 1.00].
     */
    public function test_getTrace_trustMultiplierInRange(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $multiplier = $payload['trustMultiplier'];
        self::assertGreaterThanOrEqual(0.73, $multiplier);
        self::assertLessThanOrEqual(1.00, $multiplier);
    }

    /**
     * Test 4: Returns 404 when TRACE not calculated for demo.
     */
    public function test_getTrace_returns404_whenTraceNotCalculated(): void
    {
        $demo = $this->createDemoWithoutTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(404);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('trace_not_calculated', $payload['error']['code']);
        self::assertStringContainsString('not yet calculated', $payload['error']['message']);
    }

    /**
     * Test 5: Returns 404 when demo not found.
     */
    public function test_getTrace_returns404_whenDemoNotFound(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/demos/11111111-1111-7111-8111-111111111111/trace');

        self::assertResponseStatusCodeSame(404);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('demo_not_found', $payload['error']['code']);
    }

    /**
     * Test 6: Returns 400 for invalid UUID format.
     */
    public function test_getTrace_returns400_forInvalidDemoId(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/demos/not-a-uuid/trace');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_demo_id', $payload['error']['code']);
    }

    /**
     * Test 7: Response has correct Content-Type header.
     */
    public function test_getTrace_returnsCorrectContentType(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 8: JSON properties are camelCase (not snake_case).
     */
    public function test_getTrace_serializedPropertiesCamelCase(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Verify camelCase properties
        self::assertArrayHasKey('traceBase', $payload);
        self::assertArrayHasKey('traceAdjusted', $payload);
        self::assertArrayHasKey('traceNormalized', $payload);
        self::assertArrayHasKey('trustMultiplier', $payload);
        self::assertArrayHasKey('calibrationVersion', $payload);
        self::assertArrayHasKey('calculatedAt', $payload);
        self::assertArrayHasKey('createdAt', $payload);

        // Verify snake_case properties do NOT exist
        self::assertArrayNotHasKey('trace_base', $payload);
        self::assertArrayNotHasKey('trace_adjusted', $payload);
        self::assertArrayNotHasKey('trust_multiplier', $payload);
    }

    /**
     * Test 9: Timestamps are ISO 8601 formatted strings.
     */
    public function test_getTrace_timestampsAreISO8601(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Verify ISO 8601 format (RFC 3339)
        $calculatedAt = $payload['calculatedAt'];
        $createdAt = $payload['createdAt'];

        self::assertIsString($calculatedAt);
        self::assertIsString($createdAt);

        // Verify can be parsed as ISO 8601
        self::assertNotFalse(\DateTimeImmutable::createFromFormat('c', $calculatedAt));
        self::assertNotFalse(\DateTimeImmutable::createFromFormat('c', $createdAt));
    }

    /**
     * Test 10: Calibration version is present in response.
     */
    public function test_getTrace_calibrationVersionIncluded(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('calibrationVersion', $payload);
        self::assertSame('default-v1', $payload['calibrationVersion']);
    }

    /**
     * Test 11: Component scores are floats with expected values.
     */
    public function test_getTrace_componentScoresAreFloats(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $components = $payload['components'];
        self::assertIsFloat($components['ekill']);
        self::assertIsFloat($components['aim']);
        self::assertIsFloat($components['kast']);
        self::assertIsFloat($components['util']);
        self::assertIsFloat($components['clutch']);
    }

    /**
     * Test 12: Component scores are within expected range [0.3, 2.0].
     */
    public function test_getTrace_withComponentsAtBoundaries(): void
    {
        $demo = $this->createDemoWithTraceAtBoundaries();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $components = $payload['components'];
        // Verify exact boundary values are preserved
        self::assertEqualsWithDelta(0.3, $components['ekill'], 0.001);
        self::assertEqualsWithDelta(2.0, $components['clutch'], 0.001);
    }

    /**
     * Test 13: Cache-Control header is set on response.
     */
    public function test_getTrace_cacheHeaderSet(): void
    {
        $demo = $this->createDemoWithTrace();

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Cache-Control', 'public, max-age=3600');
    }

    /**
     * Test 14: Multiple requests for same demo return consistent data.
     */
    public function test_getTrace_multipleRequestsSameDemoIdConsistent(): void
    {
        $demo = $this->createDemoWithTrace();
        $demoId = $demo->getIdString();

        $client = self::createClient();

        // First request
        $client->request('GET', '/api/demos/' . $demoId . '/trace');
        self::assertResponseStatusCodeSame(200);
        $payload1 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Second request
        $client->request('GET', '/api/demos/' . $demoId . '/trace');
        self::assertResponseStatusCodeSame(200);
        $payload2 = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Verify responses are identical
        self::assertSame($payload1, $payload2);
    }

    /**
     * Test 15: Error response includes error code and message.
     */
    public function test_getTrace_errorResponseStructure(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/demos/not-a-uuid/trace');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('error', $payload);
        self::assertArrayHasKey('code', $payload['error']);
        self::assertArrayHasKey('message', $payload['error']);
        self::assertArrayHasKey('details', $payload['error']);
    }

    /**
     * Test 16: TRACE values match database values exactly.
     */
    public function test_getTrace_valuesMatchDatabase(): void
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);
        $demo = $this->createDemoWithTrace();

        // Get stored TRACE from database
        $traceRating = $em->getRepository(TraceRating::class)->findOneBy(['demoId' => $demo->getIdString()]);
        self::assertNotNull($traceRating);

        $client = self::createClient();
        $client->request('GET', '/api/demos/' . $demo->getIdString() . '/trace');

        self::assertResponseStatusCodeSame(200);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        // Verify values match exactly
        self::assertEqualsWithDelta($traceRating->getTraceBase(), $payload['traceBase'], 0.0001);
        self::assertEqualsWithDelta($traceRating->getTraceAdjusted(), $payload['traceAdjusted'], 0.0001);
        self::assertEqualsWithDelta($traceRating->getTraceNormalized(), $payload['traceNormalized'], 0.0001);
        self::assertEqualsWithDelta($traceRating->getTrustMultiplier(), $payload['trustMultiplier'], 0.0001);
        self::assertSame($traceRating->getCalibrationVersion(), $payload['calibrationVersion']);
    }

    // Helper methods

    private function createDemoWithTrace(): Demo
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        $demo = new Demo('/storage/demos/trace.dem', originalFilename: 'trace.dem');
        $player = new Player('76561198000000001', 'Trace Player');
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

        // Create TRACE rating
        $trace = new TraceRating(
            analysisResult: $result,
            playerId: $player->getSteamId(),
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: 1.5,
            traceAdjusted: 1.4,
            traceNormalized: 1.3,
            trustMultiplier: 0.95,
            roundCount: 24,
            ekill: 1.4,
            aim: 1.5,
            kast: 1.6,
            util: 1.3,
            clutch: 1.2,
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

        $em->persist($demo);
        $em->persist($player);
        $em->persist($result);
        $em->persist($trace);
        $em->flush();
        $em->clear();

        return $demo;
    }

    private function createDemoWithoutTrace(): Demo
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        $demo = new Demo('/storage/demos/no_trace.dem', originalFilename: 'no_trace.dem');
        $player = new Player('76561198000000002', 'No Trace Player');
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

        $em->persist($demo);
        $em->persist($player);
        $em->persist($result);
        $em->flush();
        $em->clear();

        return $demo;
    }

    private function createDemoWithTraceAtBoundaries(): Demo
    {
        $em = self::getContainer()->get(EntityManagerInterface::class);

        $demo = new Demo('/storage/demos/boundaries.dem', originalFilename: 'boundaries.dem');
        $player = new Player('76561198000000003', 'Boundary Player');
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
            playerId: $player->getSteamId(),
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: 1.0,
            traceAdjusted: 0.95,
            traceNormalized: 0.9,
            trustMultiplier: 0.95,
            roundCount: 24,
            ekill: 0.3,  // Minimum boundary
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 2.0,  // Maximum boundary
            ekillRaw: 0.3,
            aimCpq: 0.75,
            aimCsq: 0.82,
            aimTtd: 0.88,
            aimScs: 0.85,
            kastPercentage: 0.75,
            clutchAttempts: 5,
            clutchWins: 3,
            calculatedAt: new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
        );

        $em->persist($demo);
        $em->persist($player);
        $em->persist($result);
        $em->persist($trace);
        $em->flush();
        $em->clear();

        return $demo;
    }
}
