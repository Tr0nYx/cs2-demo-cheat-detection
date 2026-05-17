<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

readonly class PlayerLeaderboardEntryDto
{
    /** @param array{ekill: float, aim: float, kast: float, util: float, clutch: float} $components */
    public function __construct(
        public int $rank,
        public string $playerId,
        public string $username,
        public ?string $avatar,
        public float $percentile95,
        public int $demoCount,
        public array $components,
        public string $lastAnalyzedAt,
    ) {
    }
}
