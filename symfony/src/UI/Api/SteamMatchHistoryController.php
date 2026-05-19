<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Steam\ConnectSteamMatchHistoryService;
use App\Application\Steam\DisconnectSteamMatchHistoryService;
use App\Application\Steam\SteamMatchHistoryStatusProvider;
use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/steam/match-history')]
final class SteamMatchHistoryController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly ConnectSteamMatchHistoryService $connect,
        private readonly DisconnectSteamMatchHistoryService $disconnect,
        private readonly SteamMatchHistoryStatusProvider $statuses,
        private readonly ApiErrorResponder $errors,
        private readonly string $jwtSecret,
    ) {
    }

    #[Route('', name: 'api_steam_match_history_status', methods: ['GET'])]
    public function status(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);
        if (!$user instanceof User) {
            return $this->errors->problem(ApiProblem::unauthorized('unauthorized', 'Missing or invalid Authorization header.'));
        }

        return new JsonResponse($this->statuses->forUser($user));
    }

    #[Route('/connect', name: 'api_steam_match_history_connect', methods: ['POST'])]
    public function connect(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);
        if (!$user instanceof User) {
            return $this->errors->problem(ApiProblem::unauthorized('unauthorized', 'Missing or invalid Authorization header.'));
        }

        try {
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($data)) {
                return $this->errors->problem(ApiProblem::badRequest('invalid_json', 'Request body must be an object.'));
            }
            if (isset($data['steamid']) || isset($data['steam_id'])) {
                return $this->errors->problem(ApiProblem::badRequest('steam_id_not_allowed', 'Steam ID is taken from the authenticated session.'));
            }
            if (!isset($data['steamidkey'], $data['seed']) || !is_string($data['steamidkey']) || !is_string($data['seed'])) {
                return $this->errors->problem(ApiProblem::badRequest('missing_fields', 'Provide steamidkey and seed.'));
            }

            $connection = $this->connect->connect($user, $data['steamidkey'], $data['seed']);

            return new JsonResponse($this->statuses->fromConnection($connection), 201);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\JsonException) {
            return $this->errors->problem(ApiProblem::badRequest('invalid_json', 'Request body must be valid JSON.'));
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'STEAM_MATCH_HISTORY_ENCRYPTION_KEY')) {
                return $this->errors->problem(ApiProblem::serverError('match_history_secret_not_configured', 'Match-history secret encryption is not configured.'));
            }

            return $this->errors->unexpected();
        }
    }

    #[Route('', name: 'api_steam_match_history_disconnect', methods: ['DELETE'])]
    public function disconnect(Request $request): JsonResponse
    {
        $user = $this->authenticatedUser($request);
        if (!$user instanceof User) {
            return $this->errors->problem(ApiProblem::unauthorized('unauthorized', 'Missing or invalid Authorization header.'));
        }

        $connection = $this->disconnect->disconnect($user);

        return new JsonResponse($connection === null ? $this->statuses->forUser($user) : $this->statuses->fromConnection($connection));
    }

    private function authenticatedUser(Request $request): ?User
    {
        $authHeader = $request->headers->get('Authorization');
        if ($authHeader === null || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        try {
            $payload = $this->decodeJwt(substr($authHeader, 7));
        } catch (\Throwable) {
            return null;
        }

        $steamId = (string) ($payload['steam_id'] ?? $payload['sub'] ?? '');
        if ($steamId === '') {
            return null;
        }

        return $this->users->findBySteamId($steamId);
    }

    /** @return array<string, mixed> */
    private function decodeJwt(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid JWT format');
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
        $expectedSignature = hash_hmac('sha256', "{$headerEncoded}.{$payloadEncoded}", $this->jwtSecret, true);
        $expectedSignatureEncoded = rtrim(strtr(base64_encode($expectedSignature), '+/', '-_'), '=');
        if (!hash_equals($signatureEncoded, $expectedSignatureEncoded)) {
            throw new \RuntimeException('Invalid JWT signature');
        }

        $payload = json_decode($this->base64UrlDecode($payloadEncoded), true);
        if (!is_array($payload) || (isset($payload['exp']) && (int) $payload['exp'] < time())) {
            throw new \RuntimeException('Invalid JWT payload');
        }

        return $payload;
    }

    private function base64UrlDecode(string $data): string
    {
        $decoded = base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4), true);
        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64 payload');
        }

        return $decoded;
    }
}
