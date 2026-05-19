<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class SteamInventoryValuation
{
    public function __construct(
        public ?float $estimatedValue,
        public string $currency,
        public int $pricedItemCount,
        public int $unpricedItemCount,
        public \DateTimeImmutable $valuedAt,
    ) {
    }
}
