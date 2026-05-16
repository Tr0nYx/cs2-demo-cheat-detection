<?php

declare(strict_types=1);

namespace App\Application\Trace;

use App\Domain\Trace\TraceRating;
use Psr\Log\LoggerInterface;

/**
 * TraceMapper - Maps TraceRating entity to TraceDto for API responses.
 *
 * Converts domain entity representation to JSON-serializable DTO, handling
 * data transformation and optional error logging for missing fields.
 */
final readonly class TraceMapper
{
    public function __construct(
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Convert TraceRating entity to TraceDto for API response.
     *
     * @param TraceRating $traceRating Domain entity with all TRACE data
     * @return TraceDto Serializable DTO ready for JSON response
     */
    public function toDto(TraceRating $traceRating): TraceDto
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

        // Create and return DTO
        return new TraceDto(
            traceBase: $traceRating->getTraceBase(),
            traceAdjusted: $traceRating->getTraceAdjusted(),
            traceNormalized: $traceRating->getTraceNormalized(),
            trustMultiplier: $traceRating->getTrustMultiplier(),
            components: $components,
            calibrationVersion: $traceRating->getCalibrationVersion(),
            calculatedAt: $calculatedAt,
            createdAt: $createdAt,
        );
    }
}
