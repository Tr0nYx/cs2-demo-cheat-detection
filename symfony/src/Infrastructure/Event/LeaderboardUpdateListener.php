<?php

declare(strict_types=1);

namespace App\Infrastructure\Event;

use App\Application\Service\LeaderboardUpdateService;
use App\Domain\Analysis\AnalysisResultCreated;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

/**
 * LeaderboardUpdateListener - Listens to AnalysisResultCreated event and triggers leaderboard updates.
 *
 * Part of Wave 4 (Event-Driven Updates) architecture:
 * - Listens for AnalysisResultCreated event (fired after demo analysis completes)
 * - Extracts player, map, and team data from AnalysisResult
 * - Triggers LeaderboardUpdateService to mark leaderboards for refresh
 * - Non-blocking: failures are logged but don't propagate to analysis pipeline
 *
 * Event flow:
 * 1. Python worker analyzes demo, creates AnalysisResult + TraceRating in PostgreSQL
 * 2. AnalysisResultCreated domain event is dispatched
 * 3. This listener's onAnalysisResultCreated() is invoked
 * 4. LeaderboardUpdateService.updateLeaderboardsForPlayer() is called
 * 5. Leaderboard dimensions are marked for refresh (best-effort)
 *
 * Per decision D-13 and D-14:
 * - Real-time incremental updates (when demo completes, update leaderboards)
 * - No batch refresh jobs; leaderboards computed on-demand
 * - React Query cache handles freshness via staleTime=5min
 */
final readonly class LeaderboardUpdateListener
{
    public function __construct(
        private LeaderboardUpdateService $updateService,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle AnalysisResultCreated event and trigger leaderboard updates.
     *
     * Called automatically by Symfony's EventDispatcher when AnalysisResultCreated is fired.
     * Extracts player, map, and team data from the event and triggers update service.
     *
     * @param AnalysisResultCreated $event The domain event containing the created AnalysisResult
     * @return void
     */
    #[AsEventListener(event: AnalysisResultCreated::class, priority: 0)]
    public function onAnalysisResultCreated(AnalysisResultCreated $event): void
    {
        try {
            $analysisResult = $event->getAnalysisResult();

            // Extract player ID from AnalysisResult
            $playerId = (string) $analysisResult->getPlayer()->getId();

            // Extract map from Demo entity (populated during demo analysis in Phase 3)
            $demo = $analysisResult->getDemo();
            $mapId = $demo->getMap() ?? null;

            // Extract team from player-team association (Wave 4)
            // A player can be on multiple teams, but we use the first (primary team) for now
            $teamId = null;
            $teams = $analysisResult->getPlayer()->getTeams();
            if (!$teams->isEmpty()) {
                $teamId = (string) $teams->first()->getId();
            }

            // Trigger leaderboard updates (best-effort, non-blocking)
            $this->updateService->updateLeaderboardsForPlayer($playerId, $mapId, $teamId);

            $this->logger->debug('LeaderboardUpdateListener processed event', [
                'playerId' => $playerId,
                'mapId' => $mapId,
                'teamId' => $teamId,
                'demoId' => (string) $demo->getId(),
            ]);
        } catch (\Throwable $e) {
            // Log but don't propagate; leaderboard update is not blocking
            $this->logger->error('LeaderboardUpdateListener failed to process event', [
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);
        }
    }
}
