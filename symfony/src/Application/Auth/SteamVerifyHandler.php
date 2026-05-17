<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Infrastructure\Steam\SteamOpenIdValidator;
use App\Repository\UserRepository;
use App\Repository\UserRefreshTokenRepository;
use DateTimeImmutable;
use Psr\Log\LoggerInterface;

/**
 * Handler for Steam OpenID verification and JWT token generation
 */
class SteamVerifyHandler
{
    public function __construct(
        private SteamOpenIdValidator $openIdValidator,
        private UserRepository $userRepository,
        private UserRefreshTokenRepository $refreshTokenRepository,
        private string $jwtSecret,
        private LoggerInterface $logger,
    ) {}

    /**
     * Handle Steam verification and return tokens
     *
     * @param SteamVerifyRequest $request Steam verification request
     * @return array<string, mixed> User data with JWT tokens
     * @throws \RuntimeException If validation fails
     */
    public function handle(SteamVerifyRequest $request): array
    {
        try {
            // Validate OpenID assertion
            $steamId = $this->openIdValidator->validateOpenIdAssertion(
                $request->getOpenidParams()
            );

            $this->logger->info('Steam OpenID validated', ['steamId' => $steamId]);

            // Fetch user profile from Steam
            $profile = $this->openIdValidator->getUserProfile($steamId);

            // Create or update user in database
            $user = $this->userRepository->createOrUpdate(
                $steamId,
                $profile['username'],
                $profile['avatar_url'],
                $profile['email'] ?? null
            );

            // Update last login timestamp
            $user->updateLastLogin();

            $this->logger->info('User persisted', [
                'userId' => $user->getId(),
                'steamId' => $steamId,
            ]);

            // Generate JWT tokens
            $now = time();
            $refreshTokenExpiresAt = $now + (30 * 24 * 60 * 60); // 30 days

            $accessTokenPayload = [
                'iss' => 'cs2-demo-cheat-detection',
                'sub' => $steamId,
                'user_id' => $user->getId()->toRfc4122(),
                'steam_id' => $steamId,
                'iat' => $now,
                'exp' => $now + (24 * 60 * 60), // 1 day
            ];

            $refreshTokenPayload = [
                'iss' => 'cs2-demo-cheat-detection',
                'sub' => $steamId,
                'user_id' => $user->getId()->toRfc4122(),
                'type' => 'refresh',
                'iat' => $now,
                'exp' => $refreshTokenExpiresAt,
            ];

            $accessToken = $this->encodeJwt($accessTokenPayload);
            $refreshToken = $this->encodeJwt($refreshTokenPayload);
            $refreshTokenHash = hash('sha256', $refreshToken);

            // Store refresh token hash in database
            $this->refreshTokenRepository->createToken(
                $user,
                $refreshTokenHash,
                DateTimeImmutable::createFromFormat('U', (string) $refreshTokenExpiresAt)
            );

            return [
                'id' => $user->getId()->toRfc4122(),
                'steam_id' => $steamId,
                'username' => $profile['username'],
                'avatar_url' => $profile['avatar_url'],
                'email' => $user->getEmail(),
                'created_at' => $user->getCreatedAt()->format('c'),
                'last_login_at' => $user->getLastLoginAt()?->format('c'),
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'expires_at' => $accessTokenPayload['exp'],
            ];
        } catch (\Exception $e) {
            $this->logger->error('Steam verification failed', [
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException("Steam authentication failed: {$e->getMessage()}");
        }
    }

    /**
     * Encode payload as JWT using HS256
     *
     * @param array<string, mixed> $payload JWT payload
     * @return string JWT token
     */
    private function encodeJwt(array $payload): string
    {
        // JWT format: header.payload.signature
        $header = [
            'alg' => 'HS256',
            'typ' => 'JWT',
        ];

        $headerEncoded = $this->base64UrlEncode(json_encode($header));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac(
            'sha256',
            "{$headerEncoded}.{$payloadEncoded}",
            $this->jwtSecret,
            true
        );
        $signatureEncoded = $this->base64UrlEncode($signature);

        return "{$headerEncoded}.{$payloadEncoded}.{$signatureEncoded}";
    }

    /**
     * Base64 URL-safe encoding
     *
     * @param string $data Data to encode
     * @return string
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
