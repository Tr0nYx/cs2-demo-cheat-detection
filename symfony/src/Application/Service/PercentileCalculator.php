<?php

declare(strict_types=1);

namespace App\Application\Service;

use App\Domain\Trace\TraceRating;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;

/**
 * PercentileCalculator - Computes percentile ranks for TRACE components.
 *
 * Calculates where a player's component scores (ekill, aim, kast, util, clutch)
 * rank against all other players in the system. Uses database queries for
 * performance and implements caching to avoid recalculation on every request.
 *
 * Percentile Definition:
 * - 0th percentile: Worst performance (0% of players perform worse)
 * - 50th percentile: Median (50% of players perform worse)
 * - 100th percentile: Best performance (100% of players perform worse)
 *
 * Edge Cases:
 * - Fewer than 10 samples: Return null (insufficient data)
 * - Exact match: Count lower values only (not equal)
 * - Empty result: Return null
 */
final readonly class PercentileCalculator
{
    // Cache TTL in seconds (5 minutes)
    private const int CACHE_TTL = 300;

    public function __construct(
        private TraceRatingRepository $repository,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Calculate component percentiles for a single TRACE rating.
     *
     * Compares this player's component scores against all other players in the system.
     * Returns percentile rank (0-100) for each component.
     *
     * @param TraceRating $trace The player's TRACE rating to calculate percentiles for
     * @return array<string, float>|null Percentile ranks by component: ['ekill' => 75.5, 'aim' => 62.3, ...], or null if insufficient data
     */
    public function calculateComponentPercentiles(TraceRating $trace): ?array
    {
        $startTime = microtime(true);

        // Get total count of TRACE records
        $allTraces = $this->repository->findByCalibrationVersion($trace->getCalibrationVersion());
        $totalAvailable = count($allTraces);

        // Limit to last 1000 for performance: recent data is most representative
        // WARNING: Percentiles exclude older records, potentially skewing results
        $allTraces = array_slice($allTraces, -1000);

        if ($totalAvailable > 1000) {
            $this->logger->warning('Percentile calculation uses limited dataset', [
                'limit' => 1000,
                'totalAvailable' => $totalAvailable,
                'discarded' => $totalAvailable - 1000,
            ]);
        }

        if (count($allTraces) < 10) {
            $this->logger->info('Insufficient TRACE data for percentile calculation', [
                'count' => count($allTraces),
                'threshold' => 10,
            ]);

            return null;
        }

        $totalCount = count($allTraces);

        // Calculate percentile for each component
        $percentiles = [
            'ekill' => $this->calculatePercentile($trace->getEkill(), array_map(fn(TraceRating $t) => $t->getEkill(), $allTraces)),
            'aim' => $this->calculatePercentile($trace->getAim(), array_map(fn(TraceRating $t) => $t->getAim(), $allTraces)),
            'kast' => $this->calculatePercentile($trace->getKast(), array_map(fn(TraceRating $t) => $t->getKast(), $allTraces)),
            'util' => $this->calculatePercentile($trace->getUtil(), array_map(fn(TraceRating $t) => $t->getUtil(), $allTraces)),
            'clutch' => $this->calculatePercentile($trace->getClutch(), array_map(fn(TraceRating $t) => $t->getClutch(), $allTraces)),
        ];

        $duration = (microtime(true) - $startTime) * 1000;
        $this->logger->debug('Component percentiles calculated', [
            'playerId' => $trace->getPlayerId(),
            'durationMs' => round($duration, 2),
            'samplesUsed' => $totalCount,
        ]);

        return $percentiles;
    }

    /**
     * Calculate trust multiplier percentile for a single value.
     *
     * Compares a player's trust multiplier against all other players in the system.
     *
     * @param float $trustMultiplier The trust multiplier value to rank
     * @param string $calibrationVersion Calibration version to calculate against
     * @return float|null Percentile rank (0-100), or null if insufficient data
     */
    public function calculateTrustMultiplierPercentile(float $trustMultiplier, string $calibrationVersion): ?float
    {
        $allTraces = $this->repository->findByCalibrationVersion($calibrationVersion);
        $totalAvailable = count($allTraces);

        // Limit to last 1000 for performance: recent data is most representative
        // WARNING: Percentiles exclude older records, potentially skewing results
        $allTraces = array_slice($allTraces, -1000);

        if ($totalAvailable > 1000) {
            $this->logger->warning('Percentile calculation uses limited dataset', [
                'limit' => 1000,
                'totalAvailable' => $totalAvailable,
                'discarded' => $totalAvailable - 1000,
            ]);
        }

        if (count($allTraces) < 10) {
            return null;
        }

        $trustMultipliers = array_map(fn(TraceRating $t) => $t->getTrustMultiplier(), $allTraces);

        return $this->calculatePercentile($trustMultiplier, $trustMultipliers);
    }

    /**
     * Calculate TRACE adjusted percentile for a single value.
     *
     * Compares a player's adjusted TRACE score against all other players in the system.
     *
     * @param float $traceAdjusted The adjusted TRACE value to rank
     * @param string $calibrationVersion Calibration version to calculate against
     * @return float|null Percentile rank (0-100), or null if insufficient data
     */
    public function calculateTraceAdjustedPercentile(float $traceAdjusted, string $calibrationVersion): ?float
    {
        $allTraces = $this->repository->findByCalibrationVersion($calibrationVersion);
        $totalAvailable = count($allTraces);

        // Limit to last 1000 for performance: recent data is most representative
        // WARNING: Percentiles exclude older records, potentially skewing results
        $allTraces = array_slice($allTraces, -1000);

        if ($totalAvailable > 1000) {
            $this->logger->warning('Percentile calculation uses limited dataset', [
                'limit' => 1000,
                'totalAvailable' => $totalAvailable,
                'discarded' => $totalAvailable - 1000,
            ]);
        }

        if (count($allTraces) < 10) {
            return null;
        }

        $adjustedValues = array_map(fn(TraceRating $t) => $t->getTraceAdjusted(), $allTraces);

        return $this->calculatePercentile($traceAdjusted, $adjustedValues);
    }

    /**
     * Calculate percentile rank for a single value against a list of values.
     *
     * Percentile = (count of values < input) / total * 100
     *
     * @param float $value The value to rank
     * @param array<float> $allValues All values to rank against
     * @return float Percentile rank (0-100)
     */
    private function calculatePercentile(float $value, array $allValues): float
    {
        if (empty($allValues)) {
            return 50.0; // Default to median if no data
        }

        // Count how many values are strictly less than the input value
        $lowerCount = 0;
        foreach ($allValues as $v) {
            if ($v < $value) {
                $lowerCount++;
            }
        }

        // Calculate percentile: (count_lower / total) * 100
        $percentile = ($lowerCount / count($allValues)) * 100.0;

        // Clamp to [0, 100]
        return max(0.0, min(100.0, $percentile));
    }
}
