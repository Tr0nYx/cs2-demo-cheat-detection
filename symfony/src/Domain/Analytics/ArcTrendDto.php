<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

final readonly class ArcTrendDto
{
    /** @param list<OutlierDto> $outliersDetected */
    public function __construct(
        public float $slope,
        public float $intercept,
        public float $rSquared,
        public array $outliersDetected = [],
        public ?string $message = null,
    ) {
    }

    /** @return array{slope: float, intercept: float, rSquared: float, outliersDetected: list<array<string, mixed>>, message: string|null} */
    public function toArray(): array
    {
        return [
            'slope' => round($this->slope, 6),
            'intercept' => round($this->intercept, 3),
            'rSquared' => round($this->rSquared, 3),
            'outliersDetected' => array_map(static fn (OutlierDto $outlier) => $outlier->toArray(), $this->outliersDetected),
            'message' => $this->message,
        ];
    }
}
