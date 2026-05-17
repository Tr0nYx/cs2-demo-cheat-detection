<?php

declare(strict_types=1);

namespace App\Application\Query;

/**
 * GetTeamLeaderboardQuery - Immutable DTO encapsulating team leaderboard query parameters.
 *
 * Part of CQRS pattern for retrieving paginated team leaderboard rankings.
 * Immutable and validated at construction time, ready for dispatch to handler via query bus.
 *
 * Query parameters:
 * - limit: Number of results per page (1-100, default 100)
 * - offset: Skip first N results (default 0)
 */
readonly class GetTeamLeaderboardQuery
{
    public function __construct(
        public int $limit = 100,
        public int $offset = 0,
    ) {
        if ($limit < 1 || $limit > 100) {
            throw new \InvalidArgumentException('Limit must be between 1 and 100');
        }
        if ($offset < 0) {
            throw new \InvalidArgumentException('Offset must be >= 0');
        }
    }
}
