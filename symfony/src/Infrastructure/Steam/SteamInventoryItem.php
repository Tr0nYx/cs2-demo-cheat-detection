<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

final readonly class SteamInventoryItem
{
    public function __construct(
        public string $assetId,
        public string $classId,
        public string $instanceId,
        public ?string $marketHashName,
        public bool $marketable,
        public bool $tradable,
    ) {
    }
}
