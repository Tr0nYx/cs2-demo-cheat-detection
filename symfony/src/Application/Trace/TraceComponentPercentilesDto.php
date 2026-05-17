<?php

declare(strict_types=1);

namespace App\Application\Trace;

/**
 * TraceComponentPercentilesDto - Serializable DTO for component percentile ranks.
 *
 * Contains percentile ranks (0-100) for each TRACE component.
 * Allows clients to display peer comparison badges and context.
 *
 * Percentile Definition:
 * - 0th percentile: Worst performance (this player performs worse than 0% of peers)
 * - 50th percentile: Median (this player performs worse than 50% of peers)
 * - 100th percentile: Best performance (this player performs worse than 100% of peers)
 *
 * All percentiles are nullable because they require sufficient sample data (10+ records).
 */
readonly class TraceComponentPercentilesDto
{
    public function __construct(
        /**
         * eKILL percentile rank (0-100).
         * Kill efficiency ranking among all players.
         * null if insufficient data.
         */
        public ?float $ekill = null,

        /**
         * AIM percentile rank (0-100).
         * Aim accuracy ranking among all players.
         * null if insufficient data.
         */
        public ?float $aim = null,

        /**
         * KAST percentile rank (0-100).
         * Kill/Assist/Survival rate ranking among all players.
         * null if insufficient data.
         */
        public ?float $kast = null,

        /**
         * UTIL percentile rank (0-100).
         * Utility usage effectiveness ranking among all players.
         * null if insufficient data.
         */
        public ?float $util = null,

        /**
         * CLUTCH percentile rank (0-100).
         * High-pressure situation performance ranking among all players.
         * null if insufficient data.
         */
        public ?float $clutch = null,
    ) {
    }
}
