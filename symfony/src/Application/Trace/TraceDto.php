<?php

declare(strict_types=1);

namespace App\Application\Trace;

/**
 * TraceDto - Serializable DTO for TRACE API response.
 *
 * TRACE (Tactical Round Action & Contribution Evaluation) provides a transparent
 * player impact rating independent of suspicion verdicts. This DTO represents
 * the complete TRACE score with all component values and metadata.
 *
 * Score Definitions:
 * - traceBase: Weighted average of all component scores before trust adjustment
 * - traceAdjusted: Base score adjusted by trust multiplier from suspicion score
 * - traceNormalized: Adjusted rating normalized by calibration global average
 * - trustMultiplier: Dampening factor [0.73, 1.00] derived from suspicion score
 *
 * All scores are immutable after creation and ready for JSON serialization.
 *
 * JSON Serialization Notes:
 * - Property names use camelCase (traceBase, not trace_base)
 * - Timestamps are RFC 3339 ISO 8601 format strings
 * - All values are numeric (not quoted)
 * - Suitable for HTTP 200 response bodies
 */
readonly class TraceDto
{
    public function __construct(
        /**
         * Unweighted average of component scores before trust adjustment.
         * Range: Typically [0.3, 2.0], computed from component averages.
         */
        public float $traceBase,

        /**
         * Base score adjusted by trust multiplier.
         * Formula: traceBase × trustMultiplier
         * Range: Typically [0.22, 2.0] (0.3 × 0.73 to 2.0 × 1.00)
         */
        public float $traceAdjusted,

        /**
         * Adjusted rating normalized by calibration global average.
         * Formula: traceAdjusted / calibration.globalAverage
         * Range: Typically [0.0, 3.0+] depending on calibration
         */
        public float $traceNormalized,

        /**
         * Trust multiplier: Dampening factor applied to TRACE due to suspicion.
         * Clamped range: [0.73, 1.00]
         * - 1.00: No suspicion, full trust in TRACE
         * - 0.73: Maximum suspicion, lowest trust multiplier
         * Derived from suspicion score (see Phase 6 trust rating logic)
         */
        public float $trustMultiplier,

        /**
         * All five component scores (ekill, aim, kast, util, clutch).
         * Each component normalized to [0.3, 2.0].
         */
        public TraceComponentDto $components,

        /**
         * Calibration version identifier.
         * Format: "default-v1", "live-v1", "live-v2", etc.
         * Allows historical reproducibility across calibration updates.
         */
        public string $calibrationVersion,

        /**
         * Timestamp when TRACE was calculated.
         * ISO 8601 format string (e.g., "2026-05-16T12:30:45Z")
         */
        public string $calculatedAt,

        /**
         * Timestamp when TRACE was stored in database.
         * ISO 8601 format string (e.g., "2026-05-16T12:30:46Z")
         */
        public string $createdAt,
    ) {
    }
}
