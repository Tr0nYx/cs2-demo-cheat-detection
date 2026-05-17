<?php

declare(strict_types=1);

namespace App\Domain\Analysis;

/**
 * AnalysisResultCreated - Domain event fired when an AnalysisResult is created and persisted.
 *
 * This event is dispatched after an AnalysisResult entity is successfully persisted to the database.
 * Listeners can hook into this event to trigger side effects like leaderboard updates, caching,
 * notifications, or other dependent operations.
 *
 * Event lifecycle:
 * 1. Worker processes demo and creates AnalysisResult + TraceRating
 * 2. AnalysisResult is persisted via EntityManager.flush()
 * 3. AnalysisResultCreated event is dispatched
 * 4. Listeners (e.g., LeaderboardUpdateListener) are invoked
 *
 * Note: This is a domain event, not a Symfony event. It uses Symfony's EventDispatcher
 * for delivery, but semantically represents a domain state change (analysis completion).
 */
final readonly class AnalysisResultCreated
{
    public function __construct(
        private AnalysisResult $analysisResult,
    ) {
    }

    /**
     * Get the AnalysisResult that was created.
     *
     * @return AnalysisResult
     */
    public function getAnalysisResult(): AnalysisResult
    {
        return $this->analysisResult;
    }
}
