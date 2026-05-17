<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Demo\DemoResponseFactory;
use App\Application\Handler\GetFilteredDemosHandler;
use App\Application\Query\GetFilteredDemosQuery;
use App\Application\Demo\UploadDemoRequest;
use App\Application\Demo\UploadDemoService;
use App\Infrastructure\Persistence\DemoRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/demos')]
final class DemoController extends AbstractController
{
    public function __construct(
        private readonly UploadDemoService $uploadDemos,
        private readonly DemoRepository $demos,
        private readonly DemoResponseFactory $responses,
        private readonly ApiErrorResponder $errors,
        private readonly GetFilteredDemosHandler $filteredDemos,
        private readonly string $jwtSecret,
    ) {
    }

    #[Route('', name: 'api_demos_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $file = $request->files->get('demo') ?? $request->files->get('file');

        if ($file === null) {
            return $this->errors->problem(ApiProblem::badRequest('missing_file', 'Upload a .dem file in the demo field.'));
        }

        try {
            $demo = $this->uploadDemos->upload(new UploadDemoRequest($file, $request->request->getString('steam_match_id') ?: null));

            return new JsonResponse($this->responses->demo($demo), 202);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('', name: 'api_demos_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        try {
            if ($this->isFilteredRequest($request)) {
                return $this->getDemosByFilter($request);
            }

            $page = $request->query->getInt('page', 1);
            $limit = $request->query->getInt('limit', 20);
            $sortBy = $request->query->getString('sort', 'date');
            $sortOrder = $request->query->getString('order', 'desc');

            // Validate pagination parameters
            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;

            $offset = ($page - 1) * $limit;

            // Get all demos (for now, no user filtering)
            // TODO: When user authentication is integrated, filter by current user's steam_id
            $allDemos = $this->demos->findAll();

            // Sort demos
            usort($allDemos, function ($a, $b) use ($sortBy, $sortOrder) {
                $comparison = 0;

                if ($sortBy === 'date') {
                    $comparison = ($b->getUploadedAt() <=> $a->getUploadedAt());
                } elseif ($sortBy === 'suspicion') {
                    // Get average suspicion score from all analysis results
                    $aResults = $a->getAnalysisResults()->toArray();
                    $bResults = $b->getAnalysisResults()->toArray();

                    $aScore = 0;
                    if (!empty($aResults)) {
                        $sum = 0;
                        foreach ($aResults as $result) {
                            $sum += $result->getOverallSuspicion();
                        }
                        $aScore = $sum / count($aResults);
                    }

                    $bScore = 0;
                    if (!empty($bResults)) {
                        $sum = 0;
                        foreach ($bResults as $result) {
                            $sum += $result->getOverallSuspicion();
                        }
                        $bScore = $sum / count($bResults);
                    }

                    $comparison = $bScore <=> $aScore;
                }

                return $sortOrder === 'asc' ? -$comparison : $comparison;
            });

            $total = count($allDemos);
            $demos = array_slice($allDemos, $offset, $limit);

            $demoResponses = array_map(fn ($demo) => $this->responses->demo($demo), $demos);

            return new JsonResponse([
                'demos' => $demoResponses,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit,
                    'hasMore' => ($offset + $limit) < $total,
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->errors->unexpected();
        }
    }

    private function getDemosByFilter(Request $request): JsonResponse
    {
        $tokenPayload = $this->authenticatedPayload($request);
        if ($tokenPayload === null) {
            return new JsonResponse(['error' => 'Missing or invalid Authorization header'], 401);
        }

        $playerId = (string) ($tokenPayload['steam_id'] ?? $tokenPayload['sub'] ?? '');
        if ($playerId === '') {
            return new JsonResponse(['error' => 'Invalid token: missing steam_id'], 401);
        }

        $map = $this->normalizedMap($request->query->get('map'));
        if ($map === false) {
            return $this->badFilter('Invalid map. Allowed values: Ancient, Anubis, Dust2, Inferno, Mirage, Nuke, Vertigo');
        }

        $ratingBand = $request->query->get('rating_band');
        if ($ratingBand !== null && !in_array($ratingBand, GetFilteredDemosQuery::ALLOWED_RATING_BANDS, true)) {
            return $this->badFilter('Invalid rating band. Allowed values: 0-5, 5-10, 10+');
        }

        $outcome = $request->query->get('outcome');
        if ($outcome !== null && !in_array($outcome, GetFilteredDemosQuery::ALLOWED_OUTCOMES, true)) {
            return $this->badFilter('Invalid outcome. Allowed values: win, loss, draw');
        }

        $daysBack = $request->query->has('days_back') ? $request->query->getInt('days_back') : null;
        if ($daysBack !== null && !in_array($daysBack, GetFilteredDemosQuery::ALLOWED_DAYS_BACK, true)) {
            return $this->badFilter('Invalid timeframe. Allowed values: 7, 30, 90, 999');
        }

        $limit = $request->query->getInt('limit', 20);
        if ($limit < 1 || $limit > 100) {
            return $this->badFilter('Invalid limit. Allowed values: 1-100');
        }

        $offset = $request->query->getInt('offset', 0);
        if ($offset < 0) {
            return $this->badFilter('Invalid offset. Value must be >= 0');
        }

        $query = new GetFilteredDemosQuery(
            userId: $playerId,
            map: $map,
            ratingBand: $ratingBand,
            outcome: $outcome,
            daysBack: $daysBack,
            limit: $limit,
            offset: $offset,
        );

        $result = ($this->filteredDemos)($query);
        $response = new JsonResponse([
            'demos' => array_map(static fn ($demo) => [
                'id' => $demo->id,
                'map' => $demo->map,
                'status' => $demo->status,
                'uploaded_at' => $demo->uploadedAt,
                'trace_adjusted' => $demo->traceAdjusted,
                'outcome' => $demo->outcome,
            ], $result->demos),
            'pagination' => [
                'total' => $result->total,
                'limit' => $limit,
                'offset' => $offset,
                'hasMore' => $result->hasMore,
            ],
        ]);
        $response->headers->set('X-Total-Count', (string) $result->total);

        return $response;
    }

    #[Route('/{id}', name: 'api_demos_show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $demo = $this->demos->findByUuidString($id);

        if ($demo === null) {
            return $this->errors->problem(ApiProblem::notFound('demo_not_found', 'Demo not found.'));
        }

        return new JsonResponse($this->responses->demo($demo));
    }

    private function isFilteredRequest(Request $request): bool
    {
        foreach (['map', 'rating_band', 'outcome', 'days_back', 'offset'] as $filterKey) {
            if ($request->query->has($filterKey)) {
                return true;
            }
        }

        return false;
    }

    private function badFilter(string $message): JsonResponse
    {
        return new JsonResponse(['error' => ['code' => 'invalid_filter', 'message' => $message]], 400);
    }

    private function normalizedMap(mixed $value): string|false|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        $allowed = [
            'ancient' => 'Ancient',
            'anubis' => 'Anubis',
            'dust2' => 'Dust2',
            'inferno' => 'Inferno',
            'mirage' => 'Mirage',
            'nuke' => 'Nuke',
            'vertigo' => 'Vertigo',
        ];

        $key = strtolower((string) $value);

        return $allowed[$key] ?? false;
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
