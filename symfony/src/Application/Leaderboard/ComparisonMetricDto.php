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

/**
 * TrendCardDto - DTO for TRACE trend visualization in player comparison.
 *
 * Shows historical TRACE scores over last 10 demos and trending direction.
 *
 * @package App\Application\Leaderboard
 */
final readonly class TrendCardDto
{
    /**
     * @param array<int, array{date: \DateTimeImmutable, value: float}> $history Historical TRACE scores
     * @param bool $trending True if trending up (latest > oldest), false if trending down
     */
    public function __construct(
        public array $history,
        public bool $trending,
    ) {
    }
}

/**
 * MapAffinityCardDto - DTO for map affinity in player comparison.
 *
 * Shows top 3 maps where player performs best based on TRACE score.
 *
 * @package App\Application\Leaderboard
 */
final readonly class MapAffinityCardDto
{
    /**
     * @param array<int, array{map: string, traceAdjusted: float}> $topMaps Top maps by TRACE score
     */
    public function __construct(
        public array $topMaps,
    ) {
    }
}

/**
 * MatchHistoryCardDto - DTO for shared demos in player comparison.
 *
 * Shows demos where both players participated together.
 *
 * @package App\Application\Leaderboard
 */
final readonly class MatchHistoryCardDto
{
    /**
     * @param array<int, array{demoId: string, date: \DateTimeImmutable, mapId: string|null}> $sharedDemos Demos with both players
     */
    public function __construct(
        public array $sharedDemos,
    ) {
    }
}
