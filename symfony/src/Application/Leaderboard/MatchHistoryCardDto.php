<?php

declare(strict_types=1);

namespace App\Application\Leaderboard;

/**
 * MatchHistoryCardDto - DTO for shared demos in player comparison.
 *
 * Shows demos where both players participated together.
 *
 * @package App\Application\Leaderboard
 */
final readonly class MatchHistoryCardDto
{
    /**
     * @param array<int, array{demoId: string, date: \DateTimeImmutable, mapId: string|null}> $sharedDemos Demos with both players
     */
    public function __construct(
        public array $sharedDemos,
    ) {
    }
}
