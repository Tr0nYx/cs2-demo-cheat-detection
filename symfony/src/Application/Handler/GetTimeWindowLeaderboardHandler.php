<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Leaderboard\LeaderboardEntryDto;
use App\Application\Leaderboard\LeaderboardResponseDto;
use App\Application\Leaderboard\PaginationDto;
use App\Application\Query\GetTimeWindowLeaderboardQuery;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;

/**
 * GetTimeWindowLeaderboardHandler - CQRS query handler for time-windowed leaderboards.
 *
 * Fetches qualified players (5+ demos within time window) ranked by 95th percentile TRACE score
 * within a specific time window (30 days, 90 days), builds paginated leaderboard entries with
 * component scores, and returns response.
 *
 * Responsibilities:
 * - Query qualified players from repository filtered to time window
 * - Build ranking with 1-indexed positions (offset-aware)
 * - Fetch player display names with null-safe lookup
 * - Include component scores and demo counts
 * - Return paginated response with metadata
 *
 * Per D-04: Time-windows filter by TraceRating.calculated_at (UTC timestamps).
 * Per D-06: Qualification is TIME-WINDOWED (5+ demos within the specified window).
 */
final readonly class GetTimeWindowLeaderboardHandler
{
    public function __construct(
        private TraceRatingRepository $repo,
        private PlayerRepository $playerRepo,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle query for time-windowed leaderboard.
     *
     * @param GetTimeWindowLeaderboardQuery $query Query with timeWindow, limit, offset
     * @return LeaderboardResponseDto Paginated leaderboard entries with metadata
     * @throws \InvalidArgumentException if query parameters are invalid
     */
    public function __invoke(GetTimeWindowLeaderboardQuery $query): LeaderboardResponseDto
    {
        // Extract days back from time window
        $daysBack = $query->getIntervalsBack();

        // Fetch qualified players sorted by trace_adjusted DESC, filtered to time window
        $traceRatings = $this->repo->findQualifiedByTimeWindowAndSorted(
            $daysBack,
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
        $totalCount = $this->repo->countQualifiedByTimeWindow($daysBack);

        // Create pagination metadata
        $pagination = new PaginationDto(
            total: $totalCount,
            limit: $query->limit,
            offset: $query->offset,
        );

        $this->logger->info('Time-window leaderboard queried', [
            'timeWindow' => $query->timeWindow,
            'daysBack' => $daysBack,
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
