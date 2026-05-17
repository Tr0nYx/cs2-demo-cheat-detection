<?php

declare(strict_types=1);

namespace App\Application\Query;

/**
 * GetPlayerComparisonQuery - CQRS query for fetching player comparison data.
 *
 * Encapsulates the request to compare two players across 4 metrics:
 * component breakdown, TRACE trend, map affinity, and shared demos.
 *
 * @package App\Application\Query
 */
final readonly class GetPlayerComparisonQuery
{
    /**
     * @param string $playerId ID of the first player
     * @param string $compareWithId ID of the second player to compare with
     * @throws \InvalidArgumentException if either ID is empty or they are identical
     */
    public function __construct(
        public string $playerId,
        public string $compareWithId,
    ) {
        if (empty($playerId) || empty($compareWithId)) {
            throw new \InvalidArgumentException('Both playerId and compareWithId are required');
        }
        if ($playerId === $compareWithId) {
            throw new \InvalidArgumentException('Cannot compare player with themselves');
        }
    }
}
