<?php

declare(strict_types=1);

namespace App\Application\Trace;

/**
 * TraceHistoryDto - Extended DTO for TRACE history API response.
 *
 * Extends the base TraceDto to include percentile ranks for components,
 * trust multiplier, and overall TRACE adjusted score. Used for player
 * history endpoints to enable peer comparison.
 *
 * Extends base TRACE fields with:
 * - percentiles: Component percentile ranks (0-100 for each component)
 * - trustMultiplierPercentile: Where trust multiplier ranks among peers
 * - traceAdjustedPercentile: Where adjusted TRACE ranks among peers
 */
readonly class TraceHistoryDto
{
    public function __construct(
        // Base TRACE fields
        public float $traceBase,
        public float $traceAdjusted,
        public float $traceNormalized,
        public float $trustMultiplier,
        public TraceComponentDto $components,
        public string $calibrationVersion,
        public string $calculatedAt,
        public string $createdAt,
        // Percentile fields (new)
        public TraceComponentPercentilesDto $percentiles,
        public ?float $trustMultiplierPercentile = null,
        public ?float $traceAdjustedPercentile = null,
    ) {
    }
}
