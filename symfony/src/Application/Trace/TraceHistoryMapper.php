<?php

declare(strict_types=1);

namespace App\Application\Trace;

use App\Application\Service\PercentileCalculator;
use App\Domain\Trace\TraceRating;
use Psr\Log\LoggerInterface;

/**
 * TraceHistoryMapper - Maps TraceRating entity to TraceHistoryDto with percentiles.
 *
 * Extends TraceMapper to include percentile enrichment for history responses.
 * Converts domain entity representation to JSON-serializable DTO with peer comparison ranks.
 */
final readonly class TraceHistoryMapper
{
    public function __construct(
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Convert TraceRating entity to TraceHistoryDto with percentiles.
     *
     * @param TraceRating $traceRating Domain entity with all TRACE data
     * @param PercentileCalculator $percentileCalculator Service for calculating percentiles
     * @return TraceHistoryDto Serializable DTO with percentiles ready for JSON response
     */
    public function toHistoryDto(TraceRating $traceRating, PercentileCalculator $percentileCalculator): TraceHistoryDto
    {
        // Create component DTO from entity properties
        $components = new TraceComponentDto(
            ekill: $traceRating->getEkill(),
            aim: $traceRating->getAim(),
            kast: $traceRating->getKast(),
            util: $traceRating->getUtil(),
            clutch: $traceRating->getClutch(),
        );

        // Format timestamps as ISO 8601 strings
        $calculatedAt = $traceRating->getCalculatedAt()->format('c');
        $createdAt = $traceRating->getCreatedAt()->format('c');

        // Calculate component percentiles
        $componentPercentiles = $percentileCalculator->calculateComponentPercentiles($traceRating);
        $percentileDto = new TraceComponentPercentilesDto(
            ekill: $componentPercentiles['ekill'] ?? null,
            aim: $componentPercentiles['aim'] ?? null,
            kast: $componentPercentiles['kast'] ?? null,
            util: $componentPercentiles['util'] ?? null,
            clutch: $componentPercentiles['clutch'] ?? null,
        );

        // Calculate overall percentiles
        $trustMultiplierPercentile = $percentileCalculator->calculateTrustMultiplierPercentile(
            $traceRating->getTrustMultiplier(),
            $traceRating->getCalibrationVersion()
        );

        $traceAdjustedPercentile = $percentileCalculator->calculateTraceAdjustedPercentile(
            $traceRating->getTraceAdjusted(),
            $traceRating->getCalibrationVersion()
        );

        // Create and return extended DTO with percentiles
        return new TraceHistoryDto(
            traceBase: $traceRating->getTraceBase(),
            traceAdjusted: $traceRating->getTraceAdjusted(),
            traceNormalized: $traceRating->getTraceNormalized(),
            trustMultiplier: $traceRating->getTrustMultiplier(),
            components: $components,
            calibrationVersion: $traceRating->getCalibrationVersion(),
            calculatedAt: $calculatedAt,
            createdAt: $createdAt,
            percentiles: $percentileDto,
            trustMultiplierPercentile: $trustMultiplierPercentile,
            traceAdjustedPercentile: $traceAdjustedPercentile,
        );
    }
}
