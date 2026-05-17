<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Dto\SensitivityComparisonDto;
use App\Application\Query\ValidateSensitivityComparisonQuery;
use App\Application\Service\SensitivityComparisonService;

final readonly class ValidateSensitivityComparisonHandler
{
    public function __construct(private SensitivityComparisonService $comparisons)
    {
    }

    public function __invoke(ValidateSensitivityComparisonQuery $query): SensitivityComparisonDto
    {
        return $this->comparisons->createComparison(
            demoId: $query->demoId,
            userId: $query->userId,
            adjustedThresholds: $query->adjustedThresholds,
        );
    }
}
