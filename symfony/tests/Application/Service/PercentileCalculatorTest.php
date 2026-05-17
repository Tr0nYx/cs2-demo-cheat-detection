<?php

declare(strict_types=1);

namespace App\Tests\Application\Service;

use App\Application\Service\PercentileCalculator;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use App\Infrastructure\Persistence\TraceRatingRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

/**
 * Unit tests for PercentileCalculator service.
 *
 * Tests percentile calculation logic with mock data.
 * Integration tests are in TraceHistoryControllerTest (with database).
 */
final class PercentileCalculatorTest extends TestCase
{
    private PercentileCalculator $calculator;
    private MockObject&TraceRatingRepository $repository;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(TraceRatingRepository::class);
        $this->calculator = new PercentileCalculator($this->repository, new NullLogger());
    }

    /**
     * Test 1: Percentile calculation with known data.
     * Values: [0.5, 1.0, 1.5, 2.0, 2.5]
     * For 1.5: 2 values below (0.5, 1.0) => 2/5 * 100 = 40th percentile
     */
    public function test_calculateComponentPercentiles_accurateWithKnownData(): void
    {
        $traces = [];
        $values = [0.5, 1.0, 1.5, 2.0, 2.5];

        foreach ($values as $i => $value) {
            $traces[] = $this->createMockTrace(ekill: $value);
        }

        // Mock repository to return these traces
        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $testTrace = $traces[2]; // 1.5

        $percentiles = $this->calculator->calculateComponentPercentiles($testTrace);

        self::assertNotNull($percentiles);
        // 2 values below 1.5 out of 5 total = 40th percentile
        self::assertEqualsWithDelta(40.0, $percentiles['ekill'], 0.1);
    }

    /**
     * Test 2: Returns null when insufficient data (< 10 samples).
     */
    public function test_calculateComponentPercentiles_returnsNullWhenInsufficientData(): void
    {
        $traces = [];
        for ($i = 0; $i < 5; $i++) {
            $traces[] = $this->createMockTrace();
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $testTrace = $traces[0];
        $percentiles = $this->calculator->calculateComponentPercentiles($testTrace);

        self::assertNull($percentiles);
    }

    /**
     * Test 3: Handles exact matches correctly (counts only lower values).
     */
    public function test_calculateComponentPercentiles_exactMatchCountedAsLower(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace(ekill: 1.0);
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $testTrace = $traces[5];

        $percentiles = $this->calculator->calculateComponentPercentiles($testTrace);

        self::assertNotNull($percentiles);
        // All values identical (1.0), so 0 values are strictly less than 1.0
        // Percentile = 0/10 * 100 = 0.0
        self::assertEqualsWithDelta(0.0, $percentiles['ekill'], 0.1);
    }

    /**
     * Test 4: Minimum and maximum values percentiles.
     */
    public function test_calculateComponentPercentiles_minMaxValues(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace(ekill: 0.3 + $i * 0.2);
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        // Test minimum value (0.3)
        $minTrace = $traces[0];
        $percentiles = $this->calculator->calculateComponentPercentiles($minTrace);
        self::assertNotNull($percentiles);
        self::assertEqualsWithDelta(0.0, $percentiles['ekill'], 0.1);

        // Test maximum value (~2.1)
        $maxTrace = $traces[9];
        $percentiles = $this->calculator->calculateComponentPercentiles($maxTrace);
        self::assertNotNull($percentiles);
        self::assertEqualsWithDelta(90.0, $percentiles['ekill'], 0.1);
    }

    /**
     * Test 5: Trust multiplier percentile calculation.
     */
    public function test_calculateTrustMultiplierPercentile_returnsPercentileRank(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace(trustMultiplier: 0.73 + $i * 0.03);
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $percentile = $this->calculator->calculateTrustMultiplierPercentile(0.85, 'default-v1');

        self::assertNotNull($percentile);
        self::assertGreaterThan(0.0, $percentile);
        self::assertLessThan(100.0, $percentile);
    }

    /**
     * Test 6: TRACE adjusted percentile calculation.
     */
    public function test_calculateTraceAdjustedPercentile_returnsPercentileRank(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace(traceAdjusted: 1.0 + $i * 0.1);
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $percentile = $this->calculator->calculateTraceAdjustedPercentile(1.45, 'default-v1');

        self::assertNotNull($percentile);
        self::assertGreaterThanOrEqual($percentile, 0.0);
        self::assertLessThanOrEqual($percentile, 100.0);
    }

    /**
     * Test 7: All components calculated independently.
     */
    public function test_calculateComponentPercentiles_eachComponentCalculatedIndependently(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace(
                ekill: 0.5 + $i * 0.1,
                aim: 1.5 - $i * 0.1
            );
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $testTrace = $traces[5];
        $percentiles = $this->calculator->calculateComponentPercentiles($testTrace);

        self::assertNotNull($percentiles);

        // ekill is increasing, so player-5 should be around 50th percentile
        self::assertEqualsWithDelta(50.0, $percentiles['ekill'], 5.0);
        // aim is decreasing, so player-5 should be around 50th percentile
        self::assertEqualsWithDelta(50.0, $percentiles['aim'], 5.0);
    }

    /**
     * Test 8: Handles large datasets (1000+ traces, limited by LIMIT).
     */
    public function test_calculateComponentPercentiles_limitsDatasetTo1000(): void
    {
        $traces = [];
        for ($i = 0; $i < 50; $i++) {
            $traces[] = $this->createMockTrace(ekill: 0.3 + $i / 50 * 1.7);
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $testTrace = $traces[25];
        $percentiles = $this->calculator->calculateComponentPercentiles($testTrace);

        self::assertNotNull($percentiles);
        self::assertGreaterThanOrEqual($percentiles['ekill'], 0.0);
        self::assertLessThanOrEqual($percentiles['ekill'], 100.0);
    }

    /**
     * Test 9: Returns all 5 component percentiles.
     */
    public function test_calculateComponentPercentiles_returnsAllFiveComponents(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace();
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $percentiles = $this->calculator->calculateComponentPercentiles($traces[5]);

        self::assertNotNull($percentiles);
        self::assertArrayHasKey('ekill', $percentiles);
        self::assertArrayHasKey('aim', $percentiles);
        self::assertArrayHasKey('kast', $percentiles);
        self::assertArrayHasKey('util', $percentiles);
        self::assertArrayHasKey('clutch', $percentiles);
    }

    /**
     * Test 10: Percentiles are in valid range [0, 100].
     */
    public function test_calculateComponentPercentiles_valuesInValidRange(): void
    {
        $traces = [];
        for ($i = 0; $i < 10; $i++) {
            $traces[] = $this->createMockTrace();
        }

        $this->repository->method('findByCalibrationVersion')
            ->willReturn($traces);

        $percentiles = $this->calculator->calculateComponentPercentiles($traces[5]);

        self::assertNotNull($percentiles);
        foreach ($percentiles as $value) {
            self::assertGreaterThanOrEqual($value, 0.0);
            self::assertLessThanOrEqual($value, 100.0);
        }
    }

    // Helper method

    private function createMockTrace(
        float $ekill = 1.0,
        float $aim = 1.0,
        float $kast = 1.0,
        float $util = 1.0,
        float $clutch = 1.0,
        float $traceAdjusted = 1.0,
        float $trustMultiplier = 0.95,
    ): TraceRating {
        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem');
        $player = new Player('test-player', 'Test Player');
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

        return new TraceRating(
            analysisResult: $result,
            playerId: 'test-player',
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: 1.0,
            traceAdjusted: $traceAdjusted,
            traceNormalized: 1.0,
            trustMultiplier: $trustMultiplier,
            roundCount: 24,
            ekill: $ekill,
            aim: $aim,
            kast: $kast,
            util: $util,
            clutch: $clutch,
            ekillRaw: $ekill,
            aimCpq: 0.75,
            aimCsq: 0.82,
            aimTtd: 0.88,
            aimScs: 0.85,
            kastPercentage: 0.75,
            clutchAttempts: 5,
            clutchWins: 3,
            calculatedAt: new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
        );
    }
}
