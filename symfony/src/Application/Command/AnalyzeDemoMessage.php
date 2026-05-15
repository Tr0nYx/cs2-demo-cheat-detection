<?php

declare(strict_types=1);

namespace App\Application\Command;

final readonly class AnalyzeDemoMessage
{
    public function __construct(public string $demoId)
    {
    }
}
