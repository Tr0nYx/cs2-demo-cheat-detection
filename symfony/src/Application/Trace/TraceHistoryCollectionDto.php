<?php

declare(strict_types=1);

namespace App\Application\Trace;

/**
 * TraceHistoryCollectionDto - Serializable DTO for TRACE history API response.
 *
 * Contains paginated TRACE history for a player along with pagination metadata.
 * Ready for JSON serialization with camelCase property names.
 *
 * Response structure:
 * - traces: Array of TraceHistoryDto (extended TraceDto with percentiles)
 * - pagination: Object with total, limit, offset, hasMore
 */
readonly class TraceHistoryCollectionDto
{
    /**
     * @param array<TraceHistoryDto> $traces Array of TRACE history records
     * @param object $pagination Pagination metadata {total: int, limit: int, offset: int, hasMore: bool}
     */
    public function __construct(
        public array $traces,
        public object $pagination,
    ) {
    }
}
