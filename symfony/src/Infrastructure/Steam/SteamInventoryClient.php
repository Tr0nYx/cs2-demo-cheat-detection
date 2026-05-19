<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final readonly class SteamInventoryClient
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private int $appId = 730,
        private string $contextId = '2',
    ) {
    }

    public function fetchInventory(string $steamId): SteamInventoryResult
    {
        $url = sprintf('https://steamcommunity.com/inventory/%s/%d/%s', rawurlencode($steamId), $this->appId, rawurlencode($this->contextId));

        try {
            $response = $this->httpClient->request('GET', $url, ['query' => ['l' => 'english', 'count' => 5000], 'timeout' => 10]);
            $status = $response->getStatusCode();

            if ($status === 403) {
                return new SteamInventoryResult($steamId, 'private', errorCode: 'private_inventory');
            }
            if ($status === 429) {
                return new SteamInventoryResult($steamId, 'rate_limited', errorCode: 'rate_limited');
            }
            if ($status >= 400) {
                return new SteamInventoryResult($steamId, 'unavailable', errorCode: 'http_'.$status);
            }

            $payload = $response->toArray(false);
            if (($payload['success'] ?? true) === false) {
                return new SteamInventoryResult($steamId, 'unavailable', raw: is_array($payload) ? $payload : [], errorCode: 'inventory_failed');
            }

            return new SteamInventoryResult($steamId, 'public', $this->itemsFromPayload($payload), is_array($payload) ? $payload : []);
        } catch (\Throwable $e) {
            return new SteamInventoryResult($steamId, 'unavailable', errorCode: 'request_failed', errorMessage: $e->getMessage());
        }
    }

    /** @param array<string, mixed> $payload @return list<SteamInventoryItem> */
    private function itemsFromPayload(array $payload): array
    {
        $descriptions = [];
        foreach (($payload['descriptions'] ?? []) as $description) {
            if (!is_array($description)) {
                continue;
            }
            $key = ($description['classid'] ?? '').':'.($description['instanceid'] ?? '');
            $descriptions[$key] = $description;
        }

        $items = [];
        foreach (($payload['assets'] ?? []) as $asset) {
            if (!is_array($asset)) {
                continue;
            }
            $classId = (string) ($asset['classid'] ?? '');
            $instanceId = (string) ($asset['instanceid'] ?? '0');
            $description = $descriptions[$classId.':'.$instanceId] ?? [];
            $items[] = new SteamInventoryItem(
                assetId: (string) ($asset['assetid'] ?? ''),
                classId: $classId,
                instanceId: $instanceId,
                marketHashName: isset($description['market_hash_name']) ? (string) $description['market_hash_name'] : null,
                marketable: (int) ($description['marketable'] ?? 0) === 1,
                tradable: (int) ($description['tradable'] ?? 0) === 1,
            );
        }

        return $items;
    }
}
