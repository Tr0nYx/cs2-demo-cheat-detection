<?php

declare(strict_types=1);

namespace App\Domain\Demo;

enum DemoStatus: string
{
    case Uploaded = 'uploaded';
    case Queued = 'queued';
    case Processing = 'processing';
    case Done = 'done';
    case Error = 'error';
}
