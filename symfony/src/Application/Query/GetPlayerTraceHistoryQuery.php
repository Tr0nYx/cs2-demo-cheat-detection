<?php

declare(strict_types=1);

namespace App\Application\Query;

/**
 * GetPlayerTraceHistoryQuery - Immutable DTO encapsulating player TRACE history query parameters.
 *
 * Part of CQRS pattern for retrieving paginated TRACE history with optional sorting.
 * Immutable and ready for dispatch to handler via query bus.
 *
 * Query parameters:
 * - playerId: Required player identifier (UUID or numeric ID)
 * - limit: Number of results per page (10-100, default 10)
 * - offset: Skip first N results (default 0)
 * - sortBy: Sort order ('date' for DESC, 'date_asc' for ASC, default 'date')
 */
readonly class GetPlayerTraceHistoryQuery
{
    public function __construct(
        public string $playerId,
        public int $limit = 10,
        public int $offset = 0,
        public string $sortBy = 'date',
    ) {
    }
}
