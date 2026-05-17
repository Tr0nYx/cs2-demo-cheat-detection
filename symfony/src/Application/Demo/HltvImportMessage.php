<?php

declare(strict_types=1);

namespace App\Application\Demo;

final readonly class HltvImportMessage
{
    public function __construct(
        public string $url,
    ) {
    }
}
