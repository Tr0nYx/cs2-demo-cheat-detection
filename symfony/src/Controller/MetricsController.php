<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\Metrics\PublicMetricsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/metrics')]
final class MetricsController extends AbstractController
{
    public function __construct(
        private readonly PublicMetricsService $metricsService,
    ) {
    }

    /**
     * GET /api/metrics/public
     *
     * Return public metrics (no authentication required)
     * Cached in Redis with 1-hour TTL
     */
    #[Route('/public', name: 'metrics_public', methods: ['GET'])]
    public function public(): JsonResponse
    {
        try {
            $metrics = $this->metricsService->getOrCalculate();
            return $this->json($metrics);
        } catch (\Exception $e) {
            return $this->json(
                [
                    'total_demos_analyzed' => 0,
                    'avg_suspicion_score' => 0.0,
                    'total_players_analyzed' => 0,
                    'total_matches' => 0,
                    'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                    'error' => 'Metrics temporarily unavailable',
                ],
                JsonResponse::HTTP_OK
            );
        }
    }
}
