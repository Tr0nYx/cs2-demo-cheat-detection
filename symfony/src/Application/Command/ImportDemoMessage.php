<?php
declare(strict_types=1);

namespace App\Application\Command;

final readonly class ImportDemoMessage
{
    public function __construct(
        public string $sharecode,
        public string $userId,
        public string $sharecodedImportId, // Primary key for tracking
        public string $platform, // 'steam' | 'faceit' | 'esea'
        public int $attemptCount = 0,
    ) {
    }
}
