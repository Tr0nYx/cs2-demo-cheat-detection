<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class RefreshSteamProfileMessage
{
    public function __construct(
        public string $steamId,
        public string $tier = 'stale',
        public string $reason = 'scheduled',
        public bool $force = false,
    ) {
    }
}
