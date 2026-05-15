<?php

declare(strict_types=1);

namespace App\Application\Demo;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final readonly class UploadDemoRequest
{
    public function __construct(
        public UploadedFile $file,
        public ?string $steamMatchId = null,
    ) {
    }
}
