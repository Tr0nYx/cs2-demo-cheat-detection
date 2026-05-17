<?php

declare(strict_types=1);

namespace App\Application\Query;

readonly class DemoSummaryDto
{
    public function __construct(
        public string $id,
        public ?string $map,
        public string $status,
        public string $uploadedAt,
        public ?float $traceAdjusted,
        public ?string $outcome,
    ) {
    }
}
