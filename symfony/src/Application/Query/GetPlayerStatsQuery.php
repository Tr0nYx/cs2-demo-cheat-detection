<?php

declare(strict_types=1);

namespace App\Application\Query;

final readonly class GetPlayerStatsQuery
{
    public function __construct(
        public string $steamId,
        public string $window = '30d',
    ) {
        if ($steamId === '') {
            throw new \InvalidArgumentException('Player Steam ID is required.');
        }

        if (!\in_array($window, ['10d', '30d', 'all'], true)) {
            throw new \InvalidArgumentException('Window must be one of: 10d, 30d, all.');
        }
    }
}
