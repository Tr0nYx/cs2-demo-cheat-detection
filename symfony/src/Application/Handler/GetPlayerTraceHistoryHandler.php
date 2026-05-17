<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Query\GetPlayerTraceHistoryQuery;
use App\Application\Service\PercentileCalculator;
use App\Application\Trace\TraceHistoryCollectionDto;
use App\Application\Trace\TraceHistoryMapper;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;

/**
 * GetPlayerTraceHistoryHandler - CQRS query handler for player TRACE history.
 *
 * Fetches paginated TRACE history for a player, enriches with percentile ranks,
 * and returns TraceHistoryCollectionDto ready for API serialization.
 *
 * Responsibilities:
 * - Validate query parameters (limit, offset, sortBy)
 * - Query TRACE ratings from repository
 * - Calculate percentiles for each TRACE record
 * - Map entities to DTOs
 * - Return collection with pagination metadata
 */
final readonly class GetPlayerTraceHistoryHandler
{
    public function __construct(
        private TraceRatingRepository $repository,
        private PercentileCalculator $percentileCalculator,
        private TraceHistoryMapper $mapper,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle query for player TRACE history.
     *
     * @param GetPlayerTraceHistoryQuery $query Query with playerId, limit, offset, sortBy
     * @return TraceHistoryCollectionDto Paginated collection with percentiles
     * @throws \InvalidArgumentException if query parameters are invalid
     */
    public function __invoke(GetPlayerTraceHistoryQuery $query): TraceHistoryCollectionDto
    {
        // Validate query parameters
        if (empty($query->playerId)) {
            throw new \InvalidArgumentException('Player ID cannot be empty.');
        }

        if ($query->limit < 1 || $query->limit > 100) {
            throw new \InvalidArgumentException('Limit must be between 1 and 100.');
        }

        if ($query->offset < 0) {
            throw new \InvalidArgumentException('Offset cannot be negative.');
        }

        if (!\in_array($query->sortBy, ['date', 'date_asc'], true)) {
            throw new \InvalidArgumentException('sortBy must be "date" or "date_asc".');
        }

        // Get total count for pagination
        $totalCount = $this->repository->countByPlayerId($query->playerId);

        // Query traces from repository
        $traces = $this->repository->findByPlayerIdPaginated(
            $query->playerId,
            $query->limit,
            $query->offset,
            $query->sortBy
        );

        $this->logger->info('Player TRACE history queried', [
            'playerId' => $query->playerId,
            'limit' => $query->limit,
            'offset' => $query->offset,
            'totalCount' => $totalCount,
            'returnedCount' => count($traces),
        ]);

        // Map traces to DTOs with percentiles
        $traceDtos = [];
        foreach ($traces as $trace) {
            $traceDto = $this->mapper->toHistoryDto($trace, $this->percentileCalculator);
            $traceDtos[] = $traceDto;
        }

        // Calculate pagination metadata
        $hasMore = ($query->offset + count($traces)) < $totalCount;
        $pagination = (object) [
            'total' => $totalCount,
            'limit' => $query->limit,
            'offset' => $query->offset,
            'hasMore' => $hasMore,
        ];

        return new TraceHistoryCollectionDto(
            traces: $traceDtos,
            pagination: $pagination
        );
    }
}
