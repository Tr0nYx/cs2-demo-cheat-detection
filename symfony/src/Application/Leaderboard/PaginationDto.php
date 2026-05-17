<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * PaginationDto - Metadata about pagination state.
 *
 * Provides client with information about current page and whether more results exist.
 *
 * Properties:
 * - total: Total number of qualified players in leaderboard
 * - limit: Maximum results per page (request parameter)
 * - offset: Number of results skipped (request parameter)
 * - hasMore: Computed boolean indicating if more pages exist
 */
readonly class PaginationDto
{
    public function __construct(
        public int $total,
        public int $limit,
        public int $offset,
    ) {
    }

    public function hasMore(): bool
    {
        return $this->offset + $this->limit < $this->total;
    }
}
