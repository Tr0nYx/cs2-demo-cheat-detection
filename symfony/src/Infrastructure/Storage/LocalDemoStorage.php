<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use App\Domain\Demo\DemoStorage;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Uid\Uuid;

final readonly class LocalDemoStorage implements DemoStorage
{
    public function __construct(
        #[Autowire(param: 'demo_storage_path')]
        private string $storagePath,
        #[Autowire(param: 'demo_storage_disk')]
        private string $storageDisk,
    ) {
    }

    public function store(Uuid $demoId, UploadedFile $file): StoredDemoFile
    {
        $basePath = rtrim($this->storagePath, '/\\');
        $targetName = $demoId->toRfc4122().'.dem';

        if (!is_dir($basePath) && !mkdir($basePath, 0775, true) && !is_dir($basePath)) {
            throw new FileException('Demo storage directory could not be created.');
        }

        $targetPath = $basePath.DIRECTORY_SEPARATOR.$targetName;
        $realBase = realpath($basePath);

        if ($realBase === false) {
            throw new FileException('Demo storage directory is not readable.');
        }

        $normalizedTarget = $realBase.DIRECTORY_SEPARATOR.$targetName;
        if (!str_starts_with($normalizedTarget, $realBase.DIRECTORY_SEPARATOR)) {
            throw new FileException('Demo storage path is invalid.');
        }

        $file->move($realBase, $targetName);

        return new StoredDemoFile($targetPath, $this->storageDisk);
    }

    public function delete(string $filePath): void
    {
        $basePath = realpath(rtrim($this->storagePath, '/\\'));
        $realFile = realpath($filePath);

        if ($basePath === false || $realFile === false || !str_starts_with($realFile, $basePath.DIRECTORY_SEPARATOR)) {
            return;
        }

        if (is_file($realFile)) {
            @unlink($realFile);
        }
    }
}
