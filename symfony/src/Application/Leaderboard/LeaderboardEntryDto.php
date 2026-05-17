<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * LeaderboardEntryDto - Data Transfer Object for leaderboard entry API response.
 *
 * JSON-serializable representation of a leaderboard entry matching the API contract.
 * Includes all fields needed for frontend display and ranking visualization.
 *
 * Properties:
 * - rank: Position on leaderboard (1-indexed)
 * - playerId: Unique player identifier
 * - playerName: Display name (from Player.displayName or "Unknown")
 * - traceAdjusted: 95th percentile TRACE score (primary ranking metric)
 * - components: Object with 5 component scores {ekill, aim, kast, util, clutch}
 * - demoCount: Number of demos included in calculation (minimum 5 for qualification)
 * - createdAt: ISO 8601 timestamp when this TRACE was calculated
 */
readonly class LeaderboardEntryDto
{
    public function __construct(
        public int $rank,
        public string $playerId,
        public string $playerName,
        public float $traceAdjusted,
        public array $components,
        public int $demoCount,
        public string $createdAt,
    ) {
    }
}
