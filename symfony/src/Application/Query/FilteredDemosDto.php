<?php

declare(strict_types=1);

namespace App\Application\Query;

/** @param list<DemoSummaryDto> $demos */
readonly class FilteredDemosDto
{
    public function __construct(
        public array $demos,
        public int $total,
        public bool $hasMore,
    ) {
    }
}
