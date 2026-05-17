<?php

declare(strict_types=1);

namespace App\Application\Service;

use App\Infrastructure\Persistence\TraceRatingRepository;
use App\Infrastructure\Persistence\TeamRepository;
use Psr\Log\LoggerInterface;

/**
 * LeaderboardUpdateService - Encapsulates leaderboard update logic triggered by demo analysis completion.
 *
 * Purpose: Trigger incremental leaderboard updates when demo analysis completes.
 * This service is called by event listeners after AnalysisResult is persisted.
 *
 * Architecture (Wave 4 - Event-Driven Updates):
 * 1. Demo analysis worker completes, AnalysisResult + TraceRating are persisted
 * 2. AnalysisResultCreated event is dispatched
 * 3. LeaderboardUpdateListener invokes this service
 * 4. Service marks leaderboards for refresh (best-effort, non-blocking)
 * 5. Frontend's React Query cache expires (5-minute max-age), fetches fresh data on next request
 *
 * Current implementation (Wave 4):
 * - Leaderboards are computed on-demand (no materialized views)
 * - React Query's staleTime=5min handles freshness for the frontend
 * - This service logs updates (best-effort, non-blocking)
 * - No active cache invalidation needed (HTTP cache headers sufficient)
 *
 * Future (Wave 5+):
 * - Could implement Redis cache invalidation webhook if sub-1-minute freshness required
 * - Could maintain materialized leaderboard views for high-traffic scenarios
 */
final readonly class LeaderboardUpdateService
{
    public function __construct(
        private TraceRatingRepository $traceRepo,
        private TeamRepository $teamRepo,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Trigger leaderboard updates for affected dimensions when demo analysis completes.
     *
     * Called from LeaderboardUpdateListener after AnalysisResult + TraceRating are persisted.
     * This method is best-effort and non-blocking: failures are logged but don't propagate.
     *
     * Affected dimensions:
     * - Global leaderboard: Player's new TRACE score affects global ranking
     * - Per-map leaderboard: Player's map-specific TRACE affects map ranking
     * - Time-window leaderboard: Player's recent TRACE affects time-windowed ranking
     * - Team leaderboard: If player is on a team, team aggregated score is affected
     *
     * Current implementation (Wave 4):
     * - All leaderboards are computed on-demand from database
     * - React Query's 5-minute staleTime ensures frontend gets fresh data within 5 minutes
     * - HTTP cache headers (max-age=300) allow CDN/browser cache expiry
     * - No additional action required beyond logging
     *
     * @param string $playerId Player whose analysis just completed
     * @param string|null $mapId Map from the demo (nullable if unknown)
     * @param string|null $teamId Team the player is on (nullable if no team)
     * @return void
     */
    public function updateLeaderboardsForPlayer(
        string $playerId,
        ?string $mapId = null,
        ?string $teamId = null
    ): void {
        try {
            // Log the update trigger (best-effort documentation)
            $this->logger->info('Leaderboards marked for refresh after demo completion', [
                'playerId' => $playerId,
                'mapId' => $mapId,
                'teamId' => $teamId,
                'timestamp' => (new \DateTimeImmutable())->format('c'),
            ]);

            // Per Wave 4 design, leaderboards are computed on-demand (no materialized views)
            // and React Query's staleTime=5min handles eventual consistency.
            // No additional cache invalidation needed for the current wave.

            // Future: Could implement cache invalidation here if using Redis or memcached
            // This would allow sub-1-minute cache expiry for high-traffic scenarios.
        } catch (\Throwable $e) {
            // Don't throw; leaderboard update is best-effort, not blocking analysis
            $this->logger->error('Failed to mark leaderboards for update', [
                'playerId' => $playerId,
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);
        }
    }

    /**
     * Optional: Invalidate cached leaderboard data in frontend via webhook.
     *
     * Implement only if using Redis/memcached for leaderboard caching.
     * Current Wave 4 relies on HTTP cache headers and React Query staleTime.
     *
     * Usage (future):
     * ```php
     * $this->invalidateCache(['leaderboard:global', 'leaderboard:maps:de_mirage', 'leaderboard:teams']);
     * ```
     *
     * @param array<string> $cacheKeys List of cache keys to invalidate (e.g., 'leaderboard:global')
     * @return void
     */
    private function invalidateCache(array $cacheKeys): void
    {
        // Not implemented in Wave 4; relies on React Query's staleTime + HTTP cache expiry
        // POST /api/cache/invalidate?keys=leaderboard:global,leaderboard:maps:de_mirage
        // Implementation deferred to Wave 5 if active cache invalidation needed.
    }
}
