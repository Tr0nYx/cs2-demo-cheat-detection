<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * TrendCardDto - DTO for TRACE trend visualization in player comparison.
 *
 * Shows historical TRACE scores over last 10 demos and trending direction.
 *
 * @package App\Application\Leaderboard
 */
final readonly class TrendCardDto
{
    /**
     * @param array<int, array{date: \DateTimeImmutable, value: float}> $history Historical TRACE scores
     * @param bool $trending True if trending up (latest > oldest), false if trending down
     */
    public function __construct(
        public array $history,
        public bool $trending,
    ) {
    }
}
