<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

readonly class FilteredLeaderboardDto
{
    /** @param list<PlayerLeaderboardEntryDto> $players */
    public function __construct(
        public array $players,
        public int $total,
        public bool $hasMore,
    ) {
    }
}
