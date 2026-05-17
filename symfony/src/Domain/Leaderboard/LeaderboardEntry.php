<?php

declare(strict_types=1);

namespace App\Domain\Leaderboard;

/**
 * LeaderboardEntry - Value Object representing a single leaderboard entry.
 *
 * Immutable representation of a player's position on the global leaderboard,
 * including their rank, identification, TRACE score, and component breakdown.
 *
 * Properties:
 * - rank: Position on the leaderboard (1-indexed)
 * - playerId: Player unique identifier
 * - playerName: Human-readable player name (display_name or "Unknown")
 * - traceAdjusted: The 95th percentile TRACE score used for ranking
 * - demoCount: Number of qualifying demos (minimum 5)
 * - components: Array of component scores (ekill, aim, kast, util, clutch)
 */
readonly class LeaderboardEntry
{
    public function __construct(
        private int $rank,
        private string $playerId,
        private string $playerName,
        private float $traceAdjusted,
        private int $demoCount,
        private array $components,
    ) {
    }

    public function getRank(): int
    {
        return $this->rank;
    }

    public function getPlayerId(): string
    {
        return $this->playerId;
    }

    public function getPlayerName(): string
    {
        return $this->playerName;
    }

    public function getTraceAdjusted(): float
    {
        return $this->traceAdjusted;
    }

    public function getDemoCount(): int
    {
        return $this->demoCount;
    }

    public function getComponents(): array
    {
        return $this->components;
    }
}
