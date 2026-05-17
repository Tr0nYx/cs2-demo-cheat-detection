<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * LeaderboardResponseDto - Container for leaderboard HTTP response.
 *
 * Top-level object returned by GET /api/leaderboards/global and other leaderboard endpoints.
 * Combines paginated entries with pagination metadata in a single response structure.
 *
 * Properties:
 * - entries: Array of LeaderboardEntryDto objects for current page
 * - pagination: PaginationDto with total, limit, offset, hasMore
 */
readonly class LeaderboardResponseDto
{
    /**
     * @param array<int, LeaderboardEntryDto> $entries Leaderboard entries for this page
     * @param PaginationDto $pagination Pagination metadata
     */
    public function __construct(
        public array $entries,
        public PaginationDto $pagination,
    ) {
    }
}
