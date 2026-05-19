<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class TrackSteamMatchHistoryMessage
{
    public function __construct(
        public string $connectionId,
        public string $reason = 'scheduled',
        public int $perRunLimit = 10,
        public bool $force = false,
    ) {
    }
}
