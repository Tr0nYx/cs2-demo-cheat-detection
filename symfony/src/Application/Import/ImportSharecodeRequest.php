<?php
declare(strict_types=1);

namespace App\Application\Import;

final readonly class ImportSharecodeRequest
{
    public function __construct(
        public array $sharecodes,
        public string $userId,
    ) {
    }
}
