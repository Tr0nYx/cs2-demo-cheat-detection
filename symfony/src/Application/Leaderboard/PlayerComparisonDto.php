<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * PlayerComparisonDto - DTO for full player comparison response.
 *
 * Aggregates 4 metrics for each of two players: component breakdown, TRACE trend,
 * map affinity, and match history.
 *
 * @package App\Application\Leaderboard
 */
final readonly class PlayerComparisonDto
{
    /**
     * @param string $playerAId Player A's unique identifier
     * @param string $playerAName Player A's display name
     * @param ComponentBreakdownCardDto $playerAComponents Component breakdown with percentiles for Player A
     * @param TrendCardDto $playerATrend TRACE trend history for Player A
     * @param MapAffinityCardDto $playerAMaps Top 3 maps for Player A
     * @param MatchHistoryCardDto $playerAHistory Shared demos for Player A
     * @param string $playerBId Player B's unique identifier
     * @param string $playerBName Player B's display name
     * @param ComponentBreakdownCardDto $playerBComponents Component breakdown with percentiles for Player B
     * @param TrendCardDto $playerBTrend TRACE trend history for Player B
     * @param MapAffinityCardDto $playerBMaps Top 3 maps for Player B
     * @param MatchHistoryCardDto $playerBHistory Shared demos for Player B
     */
    public function __construct(
        public string $playerAId,
        public string $playerAName,
        public ComponentBreakdownCardDto $playerAComponents,
        public TrendCardDto $playerATrend,
        public MapAffinityCardDto $playerAMaps,
        public MatchHistoryCardDto $playerAHistory,
        public string $playerBId,
        public string $playerBName,
        public ComponentBreakdownCardDto $playerBComponents,
        public TrendCardDto $playerBTrend,
        public MapAffinityCardDto $playerBMaps,
        public MatchHistoryCardDto $playerBHistory,
    ) {
    }
}
