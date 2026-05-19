<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final readonly class SteamProfileClient
{
    private const ENDPOINT = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';
    private const CHUNK_SIZE = 100;

    public function __construct(
        private HttpClientInterface $httpClient,
        private string $steamApiKey,
    ) {
    }

    /** @param list<string> $steamIds @return array<string, SteamProfileSummary> */
    public function fetchSummaries(array $steamIds): array
    {
        $result = [];
        $steamIds = array_values(array_unique(array_filter($steamIds, static fn (string $id): bool => $id !== '')));

        foreach (array_chunk($steamIds, self::CHUNK_SIZE) as $chunk) {
            try {
                $response = $this->httpClient->request('GET', self::ENDPOINT, [
                    'query' => [
                        'key' => $this->steamApiKey,
                        'steamids' => implode(',', $chunk),
                        'format' => 'json',
                    ],
                    'timeout' => 8,
                ]);

                if ($response->getStatusCode() === 429) {
                    foreach ($chunk as $steamId) {
                        $result[$steamId] = new SteamProfileSummary($steamId, 'rate_limited', errorCode: 'rate_limited');
                    }
                    continue;
                }

                if ($response->getStatusCode() >= 500) {
                    foreach ($chunk as $steamId) {
                        $result[$steamId] = new SteamProfileSummary($steamId, 'unavailable', errorCode: 'steam_server_error');
                    }
                    continue;
                }

                $payload = $response->toArray(false);
                $players = $payload['response']['players'] ?? [];
                $bySteamId = [];
                foreach (is_array($players) ? $players : [] as $player) {
                    if (!is_array($player) || !isset($player['steamid'])) {
                        continue;
                    }
                    $bySteamId[(string) $player['steamid']] = $player;
                }

                foreach ($chunk as $steamId) {
                    $result[$steamId] = isset($bySteamId[$steamId])
                        ? $this->summaryFromPlayer($steamId, $bySteamId[$steamId])
                        : new SteamProfileSummary($steamId, 'missing', errorCode: 'not_found');
                }
            } catch (\Throwable $e) {
                foreach ($chunk as $steamId) {
                    $result[$steamId] = new SteamProfileSummary($steamId, 'unavailable', errorCode: 'request_failed', errorMessage: $e->getMessage());
                }
            }
        }

        return $result;
    }

    public function fetchSummary(string $steamId): SteamProfileSummary
    {
        return $this->fetchSummaries([$steamId])[$steamId] ?? new SteamProfileSummary($steamId, 'missing', errorCode: 'not_found');
    }

    /** @param array<string, mixed> $player */
    private function summaryFromPlayer(string $steamId, array $player): SteamProfileSummary
    {
        $visibility = (int) ($player['communityvisibilitystate'] ?? 0);
        $avatarUrl = $player['avatarfull'] ?? $player['avatarmedium'] ?? null;
        if (is_string($avatarUrl) && str_starts_with($avatarUrl, 'http://')) {
            $avatarUrl = 'https://' . substr($avatarUrl, 7);
        }

        return new SteamProfileSummary(
            steamId: $steamId,
            visibilityState: $visibility === 3 ? 'public' : 'private_or_limited',
            personaName: isset($player['personaname']) ? (string) $player['personaname'] : null,
            avatarUrl: is_string($avatarUrl) ? $avatarUrl : null,
            profileUrl: isset($player['profileurl']) ? (string) $player['profileurl'] : null,
            profileState: isset($player['profilestate']) ? (int) $player['profilestate'] : null,
            communityVisibilityState: $visibility,
            timeCreated: isset($player['timecreated']) ? (new \DateTimeImmutable())->setTimestamp((int) $player['timecreated']) : null,
            lastLogoff: isset($player['lastlogoff']) ? (new \DateTimeImmutable())->setTimestamp((int) $player['lastlogoff']) : null,
            raw: $player,
        );
    }
}
