<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class SteamProfileRefreshCandidate
{
    public function __construct(
        public string $steamId,
        public string $tier,
        public string $reason,
    ) {
    }
}
