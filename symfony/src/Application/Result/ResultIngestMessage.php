<?php

declare(strict_types=1);

namespace App\Application\Result;

final readonly class ResultIngestMessage
{
    /** @param array<string, mixed> $payload */
    public function __construct(public array $payload)
    {
    }
}
