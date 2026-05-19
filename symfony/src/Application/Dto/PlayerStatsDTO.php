<?php

declare(strict_types=1);

namespace App\Application\Dto;

final readonly class PlayerStatsDTO
{
    /**
     * @param list<array{map: string, demoCount: int, winRate: float|null, averageTraceScore: float|null}> $maps
     * @param list<array{weapon: string, category: string, usageCount: int, killCount: int, killRate: float|null}> $weapons
     * @param array{dataWindow: string, computedAt: string, demoCount: int, insufficientData: bool} $metadata
     */
    public function __construct(
        public array $maps,
        public array $weapons,
        public array $metadata,
    ) {
    }
}
