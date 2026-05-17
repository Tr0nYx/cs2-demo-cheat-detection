<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\Auth\SteamVerifyHandler;
use App\Application\Auth\SteamVerifyRequest;
use App\Repository\UserRepository;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    public function __construct(
        private SteamVerifyHandler $steamVerifyHandler,
        private UserRepository $userRepository,
        private string $jwtSecret,
        private LoggerInterface $logger,
    ) {}

    /**
     * POST /api/auth/steam-verify
     *
     * Verify OpenID assertion from Steam and return JWT tokens
     */
    #[Route('/steam-verify', name: 'auth_steam_verify', methods: ['POST'])]
    public function steamVerify(Request $request): JsonResponse
    {
        try {
            // Parse request body
            $data = json_decode($request->getContent(), true);

            if (!is_array($data)) {
                return $this->json(
                    ['error' => 'Invalid request body'],
                    JsonResponse::HTTP_BAD_REQUEST
                );
            }

            // Create verification request from OpenID parameters
            $verifyRequest = new SteamVerifyRequest($data);

            // Handle verification
            $response = $this->steamVerifyHandler->handle($verifyRequest);

            return $this->json($response);
        } catch (\Exception $e) {
            $this->logger->error('Steam verify error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->json(
                ['error' => $e->getMessage()],
                JsonResponse::HTTP_UNAUTHORIZED
            );
        }
    }

    /**
     * POST /api/auth/refresh
     *
     * Refresh an access token using a refresh token
     */
    #[Route('/refresh', name: 'auth_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!is_array($data) || empty($data['refreshToken'])) {
                return $this->json(
                    ['error' => 'Missing or invalid refreshToken'],
                    JsonResponse::HTTP_BAD_REQUEST
                );
            }

            $refreshToken = $data['refreshToken'];

            // Decode and validate refresh token
            $payload = $this->decodeJwt($refreshToken);

            if (empty($payload['sub']) || ($payload['type'] ?? null) !== 'refresh') {
                throw new \RuntimeException('Invalid refresh token');
            }

            if ($payload['exp'] < time()) {
                throw new \RuntimeException('Refresh token expired');
            }

            // Generate new access token (and optionally rotate refresh token)
            $now = time();
            $accessTokenPayload = [
                'iss' => 'cs2-demo-cheat-detection',
                'sub' => $payload['sub'],
                'steam_id' => $payload['sub'],
                'iat' => $now,
                'exp' => $now + (24 * 60 * 60), // 1 day
            ];

            // Create new refresh token (rotation)
            $newRefreshTokenPayload = [
                'iss' => 'cs2-demo-cheat-detection',
                'sub' => $payload['sub'],
                'type' => 'refresh',
                'iat' => $now,
                'exp' => $now + (30 * 24 * 60 * 60), // 30 days
            ];

            $newAccessToken = $this->encodeJwt($accessTokenPayload);
            $newRefreshToken = $this->encodeJwt($newRefreshTokenPayload);

            return $this->json([
                'access_token' => $newAccessToken,
                'refresh_token' => $newRefreshToken,
                'expires_at' => $accessTokenPayload['exp'],
            ]);
        } catch (\Exception $e) {
            $this->logger->warning('Token refresh failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->json(
                ['error' => $e->getMessage()],
                JsonResponse::HTTP_UNAUTHORIZED
            );
        }
    }

    /**
     * GET /api/auth/me
     *
     * Return the authenticated user's profile information
     */
    #[Route('/me', name: 'auth_me', methods: ['GET'])]
    public function me(Request $request): JsonResponse
    {
        try {
            // Extract JWT from Authorization header
            $authHeader = $request->headers->get('Authorization');

            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                return $this->json(
                    ['error' => 'Missing or invalid Authorization header'],
                    JsonResponse::HTTP_UNAUTHORIZED
                );
            }

            $token = substr($authHeader, 7); // Remove "Bearer " prefix
            $payload = $this->decodeJwt($token);

            // Get user by steam_id
            if (empty($payload['steam_id'])) {
                return $this->json(
                    ['error' => 'Invalid token: missing steam_id'],
                    JsonResponse::HTTP_UNAUTHORIZED
                );
            }

            $user = $this->userRepository->findBySteamId($payload['steam_id']);

            if (!$user) {
                return $this->json(
                    ['error' => 'User not found'],
                    JsonResponse::HTTP_UNAUTHORIZED
                );
            }

            return $this->json([
                'id' => $user->getId()->toRfc4122(),
                'steam_id' => $user->getSteamId(),
                'username' => $user->getUsername(),
                'avatar_url' => $user->getAvatarUrl(),
                'email' => $user->getEmail(),
                'created_at' => $user->getCreatedAt()->format('c'),
                'last_login_at' => $user->getLastLoginAt()?->format('c'),
            ]);
        } catch (\Exception $e) {
            $this->logger->warning('Auth me error', [
                'error' => $e->getMessage(),
            ]);

            return $this->json(
                ['error' => $e->getMessage()],
                JsonResponse::HTTP_UNAUTHORIZED
            );
        }
    }

    /**
     * Decode JWT token
     *
     * @param string $token JWT token
     * @return array<string, mixed> Token payload
     * @throws \RuntimeException If token is invalid
     */
    private function decodeJwt(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid JWT format');
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        // Verify signature
        $expectedSignature = hash_hmac(
            'sha256',
            "{$headerEncoded}.{$payloadEncoded}",
            $this->jwtSecret,
            true
        );
        $expectedSignatureEncoded = $this->base64UrlEncode($expectedSignature);

        if (!hash_equals($signatureEncoded, $expectedSignatureEncoded)) {
            throw new \RuntimeException('Invalid JWT signature');
        }

        // Decode payload
        $payload = json_decode($this->base64UrlDecode($payloadEncoded), true);

        if (!is_array($payload)) {
            throw new \RuntimeException('Invalid JWT payload');
        }

        return $payload;
    }

    /**
     * Encode JWT token
     *
     * @param array<string, mixed> $payload JWT payload
     * @return string JWT token
     */
    private function encodeJwt(array $payload): string
    {
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

    /**
     * Base64 URL-safe decoding
     *
     * @param string $data Data to decode
     * @return string
     */
    private function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 4 - (strlen($data) % 4)), true);
    }
}
