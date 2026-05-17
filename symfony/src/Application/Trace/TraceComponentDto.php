<?php

declare(strict_types=1);

namespace App\Application\Trace;

/**
 * TraceComponentDto - Serializable DTO for component scores.
 *
 * Contains normalized component scores from TRACE (Tactical Round Action & Contribution Evaluation).
 * All component values are normalized to the range [0.3, 2.0] where:
 *
 * - 0.3: Worst performance (floor)
 * - 1.0: Average performance (baseline)
 * - 2.0: Best performance (ceiling)
 *
 * The five components measure different aspects of player impact:
 * - eKILL: Kill efficiency relative to damage dealt
 * - AIM: Aim accuracy and precision metrics
 * - KAST: Percentage of rounds where player survives or gets a kill
 * - UTIL: Utility usage effectiveness (grenade impact)
 * - CLUTCH: Performance in high-pressure situations (1v1, 1v2, etc.)
 */
readonly class TraceComponentDto
{
    public function __construct(
        /**
         * eKILL score (normalized [0.3, 2.0]).
         * Kill efficiency: Player's ability to get kills relative to damage dealt.
         */
        public float $ekill,

        /**
         * AIM score (normalized [0.3, 2.0]).
         * Aim accuracy: Measures accuracy metrics including CPQ (clicks per quit), CSQ (accuracy stdev), TTD (time to damage).
         */
        public float $aim,

        /**
         * KAST score (normalized [0.3, 2.0]).
         * Kill/Death/Survival rate: Percentage of rounds where player survives or gets a kill.
         */
        public float $kast,

        /**
         * UTIL score (normalized [0.3, 2.0]).
         * Utility effectiveness: Measures impact of grenade usage (smoke, flash, HE).
         */
        public float $util,

        /**
         * CLUTCH score (normalized [0.3, 2.0]).
         * Clutch performance: Measures player success in high-pressure situations.
         */
        public float $clutch,
    ) {
    }
}
