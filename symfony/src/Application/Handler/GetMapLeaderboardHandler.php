<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Leaderboard\LeaderboardEntryDto;
use App\Application\Leaderboard\LeaderboardResponseDto;
use App\Application\Leaderboard\PaginationDto;
use App\Application\Query\GetMapLeaderboardQuery;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;

/**
 * GetMapLeaderboardHandler - CQRS query handler for per-map leaderboards.
 *
 * Fetches qualified players (5+ demos globally) ranked by 95th percentile TRACE score
 * on a specific map, builds paginated leaderboard entries with component scores, and returns response.
 *
 * Responsibilities:
 * - Query qualified players from repository filtered to specific map
 * - Build ranking with 1-indexed positions (offset-aware)
 * - Fetch player display names with null-safe lookup
 * - Include component scores and demo counts
 * - Return paginated response with metadata
 *
 * Per D-06: Qualification is GLOBAL (5+ total demos), not per-map.
 * Per BLOCKER-003: Map field is stored in Demo.map entity column.
 */
final readonly class GetMapLeaderboardHandler
{
    public function __construct(
        private TraceRatingRepository $repo,
        private PlayerRepository $playerRepo,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle query for per-map leaderboard.
     *
     * @param GetMapLeaderboardQuery $query Query with mapId, limit, offset
     * @return LeaderboardResponseDto Paginated leaderboard entries with metadata
     * @throws \InvalidArgumentException if query parameters are invalid
     */
    public function __invoke(GetMapLeaderboardQuery $query): LeaderboardResponseDto
    {
        // Fetch qualified players sorted by trace_adjusted DESC, filtered to map
        $traceRatings = $this->repo->findQualifiedByMapAndSorted(
            $query->mapId,
            $query->limit,
            $query->offset
        );

        // Build leaderboard entries with ranking
        $entries = [];
        foreach ($traceRatings as $index => $trace) {
            $rank = $query->offset + $index + 1;

            // Null-safe player lookup per BLOCKER-002
            $player = $this->playerRepo->find($trace->getPlayerId());
            $playerName = $player?->getDisplayName() ?? 'Unknown';

            // Build components object
            $components = [
                'ekill' => $trace->getEkill(),
                'aim' => $trace->getAim(),
                'kast' => $trace->getKast(),
                'util' => $trace->getUtil(),
                'clutch' => $trace->getClutch(),
            ];

            // Get demo count for this player
            $demoCount = $this->repo->countByPlayerId($trace->getPlayerId());

            // Create entry DTO
            $entries[] = new LeaderboardEntryDto(
                rank: $rank,
                playerId: $trace->getPlayerId(),
                playerName: $playerName,
                traceAdjusted: $trace->getTraceAdjusted(),
                components: $components,
                demoCount: $demoCount,
                createdAt: $trace->getCalculatedAt()->format('c'),
            );
        }

        // Fetch total count for pagination
        $totalCount = $this->repo->countQualifiedByMap($query->mapId);

        // Create pagination metadata
        $pagination = new PaginationDto(
            total: $totalCount,
            limit: $query->limit,
            offset: $query->offset,
        );

        $this->logger->info('Map leaderboard queried', [
            'map' => $query->mapId,
            'limit' => $query->limit,
            'offset' => $query->offset,
            'totalQualified' => $totalCount,
            'returnedCount' => count($entries),
        ]);

        return new LeaderboardResponseDto(
            entries: $entries,
            pagination: $pagination,
        );
    }
}
