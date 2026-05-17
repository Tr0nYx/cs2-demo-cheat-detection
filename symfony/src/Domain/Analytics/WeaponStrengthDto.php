<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

final readonly class WeaponStrengthDto
{
    /** @param array<string, float> $strengths */
    public function __construct(
        public array $strengths,
        public ?string $message = null,
    ) {
    }

    /** @return array{strengths: array<string, float>, message: string|null} */
    public function toArray(): array
    {
        return [
            'strengths' => array_map(static fn (float $score) => round($score, 3), $this->strengths),
            'message' => $this->message,
        ];
    }
}
