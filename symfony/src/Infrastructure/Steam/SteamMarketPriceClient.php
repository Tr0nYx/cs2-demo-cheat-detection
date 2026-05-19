<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

use App\Domain\Steam\SteamMarketPrice;
use App\Infrastructure\Persistence\SteamMarketPriceRepository;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final readonly class SteamMarketPriceClient
{
    private const SOURCE = 'steam_market_priceoverview';

    public function __construct(
        private HttpClientInterface $httpClient,
        private SteamMarketPriceRepository $prices,
    ) {
    }

    public function priceFor(int $appId, string $marketHashName, string $currency = 'USD'): SteamMarketPrice
    {
        $cached = $this->prices->freshPrice($appId, $marketHashName, $currency, self::SOURCE);
        if ($cached instanceof SteamMarketPrice) {
            return $cached;
        }

        $now = new \DateTimeImmutable();
        $expires = $now->modify('+12 hours');

        try {
            $response = $this->httpClient->request('GET', 'https://steamcommunity.com/market/priceoverview/', [
                'query' => [
                    'appid' => $appId,
                    'currency' => $this->currencyCode($currency),
                    'market_hash_name' => $marketHashName,
                ],
                'timeout' => 6,
            ]);

            if ($response->getStatusCode() >= 400) {
                return $this->saveUnknown($appId, $marketHashName, $currency, $now, $expires, 'http_'.$response->getStatusCode());
            }

            $payload = $response->toArray(false);
            $price = $this->parsePrice((string) ($payload['lowest_price'] ?? $payload['median_price'] ?? ''));
            $volume = isset($payload['volume']) ? (int) preg_replace('/\D+/', '', (string) $payload['volume']) : null;
            $row = new SteamMarketPrice($appId, $marketHashName, $currency, self::SOURCE, $price, $volume, $now, $expires, $price === null ? 'price_unknown' : null);
            $this->prices->save($row);

            return $row;
        } catch (\Throwable $e) {
            return $this->saveUnknown($appId, $marketHashName, $currency, $now, $expires, 'request_failed', $e->getMessage());
        }
    }

    private function saveUnknown(int $appId, string $marketHashName, string $currency, \DateTimeImmutable $now, \DateTimeImmutable $expires, string $code, ?string $message = null): SteamMarketPrice
    {
        $row = new SteamMarketPrice($appId, $marketHashName, $currency, self::SOURCE, null, null, $now, $expires, $code, $message);
        $this->prices->save($row);

        return $row;
    }

    private function parsePrice(string $text): ?float
    {
        $normalized = preg_replace('/[^0-9.,]/', '', $text);
        if ($normalized === null || $normalized === '') {
            return null;
        }
        $normalized = str_replace(',', '.', str_replace(',', '', $normalized));
        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function currencyCode(string $currency): int
    {
        return match (strtoupper($currency)) {
            'USD' => 1,
            'GBP' => 2,
            'EUR' => 3,
            default => 1,
        };
    }
}
