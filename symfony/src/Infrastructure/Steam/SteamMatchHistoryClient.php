<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

use Symfony\Contracts\HttpClient\HttpClientInterface;

readonly class SteamMatchHistoryClient
{
    private const ENDPOINT = 'https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1';

    public function __construct(
        private HttpClientInterface $httpClient,
        private string $steamApiKey,
    ) {
    }

    public function getNextCode(string $steamId, string $steamIdKey, string $knownCode): SteamMatchHistoryResult
    {
        try {
            $response = $this->httpClient->request('GET', self::ENDPOINT, [
                'query' => [
                    'key' => $this->steamApiKey,
                    'steamid' => $steamId,
                    'steamidkey' => $steamIdKey,
                    'knowncode' => $knownCode,
                ],
                'timeout' => 8,
            ]);

            $retryAfterSeconds = $this->parseRetryAfterHeader($response->getHeaders(false));

            return match ($response->getStatusCode()) {
                200 => $this->fromSuccessfulPayload($response->toArray(false)),
                202 => $this->fromAcceptedPayload($response->toArray(false)),
                403 => SteamMatchHistoryResult::authFailed(),
                412 => SteamMatchHistoryResult::invalidSeed(),
                429 => SteamMatchHistoryResult::rateLimited($retryAfterSeconds),
                503 => SteamMatchHistoryResult::steamUnavailable('steam_unavailable', null, $retryAfterSeconds),
                default => $response->getStatusCode() >= 500
                    ? SteamMatchHistoryResult::steamUnavailable('steam_server_error', null, $retryAfterSeconds)
                    : SteamMatchHistoryResult::malformedResponse('Unexpected Valve status '.$response->getStatusCode()),
            };
        } catch (\Throwable $e) {
            return SteamMatchHistoryResult::steamUnavailable('request_failed', $e->getMessage());
        }
    }

    private function parseRetryAfterHeader(array $headers): ?int
    {
        $retryAfterValues = $headers['retry-after'] ?? [];
        if (!$retryAfterValues) {
            return null;
        }

        $value = trim($retryAfterValues[0]);
        if ($value === '') {
            return null;
        }

        if (ctype_digit($value)) {
            return (int) $value;
        }

        try {
            $deadline = new \DateTimeImmutable($value);
        } catch (\Throwable) {
            return null;
        }

        $now = new \DateTimeImmutable();
        $interval = $deadline->getTimestamp() - $now->getTimestamp();

        return $interval > 0 ? $interval : null;
    }

    /** @param array<string, mixed> $payload */
    private function fromSuccessfulPayload(array $payload): SteamMatchHistoryResult
    {
        $nextCode = $payload['result']['nextcode'] ?? $payload['nextcode'] ?? null;
        if (!is_string($nextCode) || trim($nextCode) === '') {
            return SteamMatchHistoryResult::malformedResponse('Missing nextcode in Valve response.');
        }

        return SteamMatchHistoryResult::nextCode($nextCode);
    }

    /** @param array<string, mixed> $payload */
    private function fromAcceptedPayload(array $payload): SteamMatchHistoryResult
    {
        $nextCode = $payload['result']['nextcode'] ?? $payload['nextcode'] ?? null;
        if ($nextCode === 'n/a') {
            return SteamMatchHistoryResult::caughtUp();
        }

        return is_string($nextCode) && $nextCode !== ''
            ? SteamMatchHistoryResult::nextCode($nextCode)
            : SteamMatchHistoryResult::caughtUp();
    }
}
