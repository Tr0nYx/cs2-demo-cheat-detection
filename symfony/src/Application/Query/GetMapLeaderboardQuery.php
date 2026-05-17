<?php

declare(strict_types=1);

namespace App\Application\Query;

/**
 * GetMapLeaderboardQuery - Immutable CQRS query for per-map leaderboards.
 *
 * Carries parameters for fetching qualified players ranked by TRACE score
 * on a specific map (e.g., de_mirage, de_ancient).
 *
 * Validation:
 * - mapId must not be empty
 * - limit must be between 1 and 100 (inclusive)
 * - offset must be >= 0
 */
readonly class GetMapLeaderboardQuery
{
    /**
     * @param string $mapId Map identifier (e.g., 'de_mirage')
     * @param int $limit Maximum results per page (1-100, default 100)
     * @param int $offset Skip first N results for pagination (>= 0, default 0)
     * @throws \InvalidArgumentException if parameters are invalid
     */
    public function __construct(
        public string $mapId,
        public int $limit = 100,
        public int $offset = 0,
    ) {
        if (empty($mapId)) {
            throw new \InvalidArgumentException('mapId cannot be empty');
        }
        if ($limit < 1 || $limit > 100) {
            throw new \InvalidArgumentException('Limit must be between 1 and 100');
        }
        if ($offset < 0) {
            throw new \InvalidArgumentException('Offset must be >= 0');
        }
    }
}
