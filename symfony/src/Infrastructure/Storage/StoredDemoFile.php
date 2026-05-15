<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

final readonly class StoredDemoFile
{
    public function __construct(
        public string $path,
        public string $disk,
    ) {
    }
}
