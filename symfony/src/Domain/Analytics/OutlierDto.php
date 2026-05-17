<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

final readonly class OutlierDto
{
    public function __construct(
        public int $demoIndex,
        public string $demoId,
        public float $actualScore,
        public float $predictedScore,
        public float $deviation,
    ) {
    }

    /** @return array{demoIndex: int, demoId: string, actualScore: float, predictedScore: float, deviation: float} */
    public function toArray(): array
    {
        return [
            'demoIndex' => $this->demoIndex,
            'demoId' => $this->demoId,
            'actualScore' => round($this->actualScore, 3),
            'predictedScore' => round($this->predictedScore, 3),
            'deviation' => round($this->deviation, 3),
        ];
    }
}
