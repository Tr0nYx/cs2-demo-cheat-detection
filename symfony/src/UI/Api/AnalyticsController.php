<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Handler\ValidateSensitivityComparisonHandler;
use App\Application\Exception\AccessDeniedException;
use App\Application\Handler\GetAnalyticsTrendHandler;
use App\Application\Query\ValidateSensitivityComparisonQuery;
use App\Application\Query\GetAnalyticsTrendQuery;
use App\Application\Service\SensitivityComparisonRateLimiter;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/analytics')]
final class AnalyticsController extends AbstractController
{
    public function __construct(
        private readonly ValidateSensitivityComparisonHandler $comparisonHandler,
        private readonly GetAnalyticsTrendHandler $trendHandler,
        private readonly SensitivityComparisonRateLimiter $rateLimiter,
        private readonly ApiErrorResponder $errors,
        private readonly LoggerInterface $logger,
        private readonly string $jwtSecret,
    ) {
    }

    #[Route('/trends/{metric}', name: 'api_analytics_trend', methods: ['GET'])]
    public function trend(string $metric, Request $request): JsonResponse
    {
        $payload = $this->authenticatedPayload($request);
        $userId = is_array($payload) ? (string) ($payload['steam_id'] ?? $payload['sub'] ?? '') : '';

        if ($userId === '') {
            return $this->errors->problem(ApiProblem::unauthorized('unauthorized', 'Missing or invalid Authorization header.'));
        }

        if (!$this->rateLimiter->consume($userId.':trend')) {
            return $this->errors->problem(ApiProblem::tooManyRequests('rate_limited', 'Too many trend requests. Try again in a minute.'));
        }

        try {
            $window = $metric === 'consistency' ? $request->query->getInt('window', 30) : 999;
            $trend = ($this->trendHandler)(new GetAnalyticsTrendQuery($userId, $metric, $window));

            return new JsonResponse($trend->toArray());
        } catch (\InvalidArgumentException $e) {
            return $this->errors->problem(ApiProblem::badRequest('invalid_trend_request', $e->getMessage()));
        } catch (\Throwable $e) {
            $this->logger->error('Trend request failed.', ['message' => $e->getMessage()]);

            return $this->errors->unexpected();
        }
    }

    #[Route('/compare', name: 'api_analytics_compare', methods: ['POST'])]
    public function compare(Request $request): JsonResponse
    {
        $payload = $this->authenticatedPayload($request);
        $userId = is_array($payload) ? (string) ($payload['steam_id'] ?? $payload['sub'] ?? '') : '';

        if ($userId === '') {
            return $this->errors->problem(ApiProblem::unauthorized('unauthorized', 'Missing or invalid Authorization header.'));
        }

        if (!$this->rateLimiter->consume($userId)) {
            return $this->errors->problem(ApiProblem::tooManyRequests('rate_limited', 'Too many comparison requests. Try again in a minute.'));
        }

        try {
            $body = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($body)) {
                throw new \InvalidArgumentException('Request body must be a JSON object.');
            }

            $demoId = (string) ($body['demo_id'] ?? '');
            $thresholds = $body['adjusted_thresholds'] ?? null;
            if (!is_array($thresholds)) {
                throw new \InvalidArgumentException('adjusted_thresholds must be an object.');
            }

            $comparison = ($this->comparisonHandler)(new ValidateSensitivityComparisonQuery(
                demoId: $demoId,
                userId: $userId,
                adjustedThresholds: $thresholds,
            ));

            $this->logger->debug('Sensitivity comparison created.', [
                'demoId' => $demoId,
                'baseline' => $comparison->baselineSuspicion,
                'tuned' => $comparison->tunedSuspicion,
            ]);

            return new JsonResponse($comparison->toArray());
        } catch (\JsonException|\InvalidArgumentException $e) {
            $this->logger->warning('Invalid sensitivity comparison request.', ['message' => $e->getMessage()]);

            return $this->errors->problem(ApiProblem::badRequest('invalid_comparison_request', $e->getMessage()));
        } catch (AccessDeniedException $e) {
            $this->logger->warning('Sensitivity comparison forbidden.', ['message' => $e->getMessage()]);

            return $this->errors->problem(ApiProblem::forbidden('comparison_forbidden', $e->getMessage()));
        } catch (\LogicException $e) {
            $this->logger->warning('Sensitivity comparison rejected.', ['message' => $e->getMessage()]);

            return $this->errors->problem(ApiProblem::unprocessable('analysis_incomplete', $e->getMessage()));
        } catch (\Throwable $e) {
            $this->logger->error('Sensitivity comparison failed.', ['message' => $e->getMessage()]);

            return $this->errors->unexpected();
        }
    }

    /** @return array<string, mixed>|null */
    private function authenticatedPayload(Request $request): ?array
    {
        $authHeader = $request->headers->get('Authorization');
        if ($authHeader === null || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        try {
            return $this->decodeJwt(substr($authHeader, 7));
        } catch (\Throwable) {
            return null;
        }
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
