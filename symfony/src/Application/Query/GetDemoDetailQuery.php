<?php

declare(strict_types=1);

namespace App\Application\Query;

use Symfony\Component\Uid\Uuid;

readonly class GetDemoDetailQuery
{
    public function __construct(
        public string $demoId,
        public ?string $userId = null,
    ) {
        if (!Uuid::isValid($demoId)) {
            throw new \InvalidArgumentException('Invalid demo ID');
        }
    }
}
