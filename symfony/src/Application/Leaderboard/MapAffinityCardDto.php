<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

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
