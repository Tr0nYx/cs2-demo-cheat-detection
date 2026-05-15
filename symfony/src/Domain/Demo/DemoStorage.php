<?php

declare(strict_types=1);

namespace App\Domain\Demo;

use App\Infrastructure\Storage\StoredDemoFile;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Uid\Uuid;

interface DemoStorage
{
    public function store(Uuid $demoId, UploadedFile $file): StoredDemoFile;

    public function delete(string $filePath): void;
}
