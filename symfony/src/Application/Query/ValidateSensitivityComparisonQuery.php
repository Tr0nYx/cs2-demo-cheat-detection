<?php

declare(strict_types=1);

namespace App\Application\Query;

use Symfony\Component\Uid\Uuid;

readonly class ValidateSensitivityComparisonQuery
{
    /** @param array<string, mixed> $adjustedThresholds */
    public function __construct(
        public string $demoId,
        public string $userId,
        public array $adjustedThresholds,
    ) {
        if (!Uuid::isValid($demoId)) {
            throw new \InvalidArgumentException('Invalid demo ID.');
        }
    }
}
