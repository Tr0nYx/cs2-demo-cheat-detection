<?php

declare(strict_types=1);

namespace App\Application\Query;

/**
 * GetTimeWindowLeaderboardQuery - Immutable CQRS query for time-windowed leaderboards.
 *
 * Carries parameters for fetching qualified players ranked by TRACE score
 * within a specific time window (30 days or 90 days).
 *
 * Validation:
 * - timeWindow must be '30d' or '90d' (enum-like)
 * - limit must be between 1 and 100 (inclusive)
 * - offset must be >= 0
 */
readonly class GetTimeWindowLeaderboardQuery
{
    /**
     * @param string $timeWindow Time window identifier ('30d' or '90d')
     * @param int $limit Maximum results per page (1-100, default 100)
     * @param int $offset Skip first N results for pagination (>= 0, default 0)
     * @throws \InvalidArgumentException if parameters are invalid
     */
    public function __construct(
        public string $timeWindow,
        public int $limit = 100,
        public int $offset = 0,
    ) {
        if (!in_array($timeWindow, ['30d', '90d'], true)) {
            throw new \InvalidArgumentException('timeWindow must be 30d or 90d');
        }
        if ($limit < 1 || $limit > 100) {
            throw new \InvalidArgumentException('Limit must be between 1 and 100');
        }
        if ($offset < 0) {
            throw new \InvalidArgumentException('Offset must be >= 0');
        }
    }

    /**
     * Get the number of days back for this time window.
     *
     * @return int Number of days (30 or 90)
     */
    public function getIntervalsBack(): int
    {
        return match ($this->timeWindow) {
            '30d' => 30,
            '90d' => 90,
        };
    }
}
