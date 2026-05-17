<?php

declare(strict_types=1);

namespace App\Application\Dto;

/** @param array<string, float> $impactBreakdown */
final readonly class SensitivityComparisonDto
{
    public function __construct(
        public float $baselineSuspicion,
        public float $tunedSuspicion,
        public array $impactBreakdown,
    ) {
    }

    /** @return array{baselineSuspicion: float, tunedSuspicion: float, impactBreakdown: array<string, float>} */
    public function toArray(): array
    {
        return [
            'baselineSuspicion' => $this->baselineSuspicion,
            'tunedSuspicion' => $this->tunedSuspicion,
            'impactBreakdown' => $this->impactBreakdown,
        ];
    }
}
