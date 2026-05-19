<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Infrastructure\Steam\SteamInventoryItem;
use App\Infrastructure\Steam\SteamMarketPriceClient;

final readonly class SteamInventoryValuator
{
    public function __construct(private SteamMarketPriceClient $prices)
    {
    }

    /** @param list<SteamInventoryItem> $items */
    public function value(array $items, int $appId = 730, string $currency = 'USD'): SteamInventoryValuation
    {
        $total = 0.0;
        $priced = 0;
        $unpriced = 0;

        foreach ($items as $item) {
            if (!$item->marketable || $item->marketHashName === null || $item->marketHashName === '') {
                $unpriced++;
                continue;
            }

            $price = $this->prices->priceFor($appId, $item->marketHashName, $currency)->getPrice();
            if ($price === null) {
                $unpriced++;
                continue;
            }

            $priced++;
            $total += $price;
        }

        return new SteamInventoryValuation($priced > 0 ? round($total, 2) : null, $currency, $priced, $unpriced, new \DateTimeImmutable());
    }
}
