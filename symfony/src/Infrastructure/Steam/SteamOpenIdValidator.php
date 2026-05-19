<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

/**
 * OpenID 2.0 Validator for Steam authentication
 *
 * Validates OpenID assertions returned by Steam and fetches user profile data
 */
class SteamOpenIdValidator
{
    private const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
    private const STEAM_API_URL = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';

    public function __construct(
        private string $steamApiKey,
    ) {}

    /**
     * Validate OpenID assertion and return Steam ID
     *
     * @param array<string, string> $queryParams Query parameters from OpenID callback
     * @return string Validated Steam ID
     * @throws \RuntimeException If validation fails
     */
    public function validateOpenIdAssertion(array $queryParams): string
    {
        // Normalize keys: convert dots (from next-auth JSON) to underscores
        $normalizedParams = [];
        foreach ($queryParams as $key => $value) {
            $normalizedKey = str_replace('.', '_', $key);
            $normalizedParams[$normalizedKey] = $value;
        }
        $queryParams = $normalizedParams;

        // Verify OpenID mode is id_res (positive assertion)
        if (($queryParams['openid_mode'] ?? null) !== 'id_res') {
            throw new \RuntimeException('Invalid OpenID mode');
        }

        // Check required fields
        $requiredFields = ['openid_ns', 'openid_identity', 'openid_claimed_id', 'openid_sig'];
        foreach ($requiredFields as $field) {
            if (empty($queryParams[$field])) {
                throw new \RuntimeException("Missing required OpenID field: $field");
            }
        }

        // Validate OpenID namespace
        if ($queryParams['openid_ns'] !== 'http://specs.openid.net/auth/2.0') {
            throw new \RuntimeException('Invalid OpenID namespace');
        }

        // Verify assertion signature with Steam servers using standard dot-delimited keys
        $verificationParams = [];
        foreach ($queryParams as $key => $value) {
            $dotKey = str_replace('_', '.', $key);
            $verificationParams[$dotKey] = $value;
        }
        $verificationParams['openid.mode'] = 'check_authentication';

        try {
            // Use file_get_contents with stream context for POST request
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => 'Content-type: application/x-www-form-urlencoded',
                    'content' => http_build_query($verificationParams),
                    'timeout' => 5,
                ],
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                ],
            ]);

            $content = file_get_contents(self::STEAM_OPENID_URL, false, $context);

            if ($content === false) {
                throw new \RuntimeException('Failed to connect to Steam OpenID server');
            }

            // Check if Steam returned valid:true
            if (strpos($content, 'is_valid:true') === false) {
                throw new \RuntimeException('OpenID assertion validation failed');
            }
        } catch (\Exception $e) {
            throw new \RuntimeException("Steam OpenID validation error: {$e->getMessage()}");
        }

        // Extract steam_id from openid.identity (format: http://steamcommunity.com/openid/id/{steamid})
        $identity = $queryParams['openid_identity'] ?? '';
        if (!preg_match('/\/(\d+)$/', $identity, $matches)) {
            throw new \RuntimeException('Invalid identity format');
        }

        return $matches[1];
    }

    /**
     * Fetch user profile from Steam Web API
     *
     * @param string $steamId Steam ID (numeric)
     * @return array<string, mixed> User profile data
     * @throws \RuntimeException If API call fails
     */
    public function getUserProfile(string $steamId): array
    {
        if (empty($this->steamApiKey)) {
            return [
                'steam_id' => $steamId,
                'username' => 'SteamUser_' . substr($steamId, -6),
                'avatar_url' => 'https://avatars.steamstatic.com/fef44917ad5e9061f1f2a1d3d37543e57aff62a3_full.jpg',
                'profile_url' => 'https://steamcommunity.com/profiles/' . $steamId,
            ];
        }

        try {
            $url = self::STEAM_API_URL . '?' . http_build_query([
                'key' => $this->steamApiKey,
                'steamids' => $steamId,
                'format' => 'json',
            ]);

            $context = stream_context_create([
                'http' => [
                    'timeout' => 5,
                ],
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                ],
            ]);

            $response = file_get_contents($url, false, $context);

            if ($response === false) {
                throw new \RuntimeException('Failed to connect to Steam Web API');
            }

            $data = json_decode($response, true);

            if (!is_array($data) || empty($data['response']['players'])) {
                throw new \RuntimeException("Steam profile not found for ID: $steamId");
            }

            $player = $data['response']['players'][0];

            // Ensure avatar URL is HTTPS
            $avatarUrl = $player['avatarfull'] ?? '';
            if (!empty($avatarUrl) && !str_starts_with($avatarUrl, 'https://')) {
                $avatarUrl = str_replace('http://', 'https://', $avatarUrl);
            }

            return [
                'steam_id' => $steamId,
                'username' => $player['personaname'] ?? 'Unknown',
                'avatar_url' => $avatarUrl,
                'profile_url' => $player['profileurl'] ?? '',
            ];
        } catch (\Exception $e) {
            throw new \RuntimeException("Failed to fetch Steam profile: {$e->getMessage()}");
        }
    }
}
