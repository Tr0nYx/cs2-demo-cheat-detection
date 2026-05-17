<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Leaderboard\LeaderboardEntryDto;
use App\Application\Leaderboard\LeaderboardResponseDto;
use App\Application\Leaderboard\PaginationDto;
use App\Application\Query\GetTeamLeaderboardQuery;
use App\Infrastructure\Persistence\TeamRepository;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;

/**
 * GetTeamLeaderboardHandler - CQRS query handler for team leaderboard.
 *
 * Fetches qualified teams (teams with members having 5+ demos) ranked by aggregated
 * 95th percentile TRACE score, builds paginated leaderboard entries with team data,
 * and returns response.
 *
 * Responsibilities:
 * - Query qualified teams from repository
 * - Build ranking with 1-indexed positions (offset-aware)
 * - Fetch team display names and aggregated TRACE scores
 * - Count total demos analyzed by team members
 * - Return paginated response with metadata
 */
final readonly class GetTeamLeaderboardHandler
{
    public function __construct(
        private TeamRepository $teamRepo,
        private TraceRatingRepository $traceRepo,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle query for team leaderboard.
     *
     * @param GetTeamLeaderboardQuery $query Query with limit, offset
     * @return LeaderboardResponseDto Paginated team leaderboard entries with metadata
     * @throws \InvalidArgumentException if query parameters are invalid
     */
    public function __invoke(GetTeamLeaderboardQuery $query): LeaderboardResponseDto
    {
        // Fetch qualified teams sorted by aggregated trace_adjusted DESC
        $teams = $this->teamRepo->findQualifiedTeamsAndSorted($query->limit, $query->offset);

        // Build leaderboard entries with ranking
        $entries = [];
        $rank = $query->offset + 1;  // Start rank counter separately from array index

        foreach ($teams as $team) {
            // Get aggregated TRACE score for this team
            $aggregatedScore = $this->teamRepo->getTeamAggregatedScore((string) $team->getId());
            if (null === $aggregatedScore) {
                // Skip teams with no qualified members (shouldn't happen due to query filter)
                continue;
            }

            // Team name for display (prefer displayName, fallback to name)
            $teamName = $team->getDisplayName() ?? $team->getName();

            // Get total demo count for all team members
            $demoCount = 0;
            foreach ($team->getPlayers() as $player) {
                $demoCount += $this->traceRepo->countByPlayerId((string) $player->getId());
            }

            // Create entry DTO (use teamId as playerId for API consistency)
            $entries[] = new LeaderboardEntryDto(
                rank: $rank,
                playerId: (string) $team->getId(),
                playerName: $teamName,
                traceAdjusted: $aggregatedScore,
                components: [], // Teams don't have components; could aggregate member components
                demoCount: $demoCount,
                createdAt: $team->getUpdatedAt()->format('c'),
            );

            $rank++;  // Increment rank after adding entry
        }

        // Fetch total count for pagination
        $totalCount = $this->teamRepo->countQualifiedTeams();

        // Create pagination metadata
        $pagination = new PaginationDto(
            total: $totalCount,
            limit: $query->limit,
            offset: $query->offset,
        );

        $this->logger->info('Team leaderboard queried', [
            'limit' => $query->limit,
            'offset' => $query->offset,
            'totalQualifiedTeams' => $totalCount,
            'returnedCount' => count($entries),
        ]);

        return new LeaderboardResponseDto(
            entries: $entries,
            pagination: $pagination,
        );
    }
}
