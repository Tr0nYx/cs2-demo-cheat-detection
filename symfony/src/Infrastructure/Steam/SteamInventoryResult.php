<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

final readonly class SteamInventoryResult
{
    /** @param list<SteamInventoryItem> $items @param array<string, mixed> $raw */
    public function __construct(
        public string $steamId,
        public string $visibilityState,
        public array $items = [],
        public array $raw = [],
        public ?string $errorCode = null,
        public ?string $errorMessage = null,
    ) {
    }
}
