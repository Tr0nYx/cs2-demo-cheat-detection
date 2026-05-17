<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * ComponentBreakdownCardDto - DTO for component breakdown in player comparison.
 *
 * Displays player's component scores (ekill, aim, kast, util, clutch) with percentile rankings.
 *
 * @package App\Application\Leaderboard
 */
final readonly class ComponentBreakdownCardDto
{
    /**
     * @param array<string, array{value: float, percentile: int}> $components Component scores with percentiles
     * @param \DateTimeImmutable $traceDatetime Date when TRACE was calculated
     */
    public function __construct(
        public array $components,
        public \DateTimeImmutable $traceDatetime,
    ) {
    }
}
