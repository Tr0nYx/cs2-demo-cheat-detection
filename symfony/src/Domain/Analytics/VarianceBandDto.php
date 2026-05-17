<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

final readonly class VarianceBandDto
{
    public function __construct(
        public \DateTimeImmutable $timestamp,
        public float $meanScore,
        public float $upperBound,
        public float $lowerBound,
        public int $demoCount,
    ) {
    }

    /** @return array{timestamp: string, meanScore: float, upperBound: float, lowerBound: float, demoCount: int} */
    public function toArray(): array
    {
        return [
            'timestamp' => $this->timestamp->format('Y-m-d'),
            'meanScore' => round($this->meanScore, 3),
            'upperBound' => round($this->upperBound, 3),
            'lowerBound' => round($this->lowerBound, 3),
            'demoCount' => $this->demoCount,
        ];
    }
}
