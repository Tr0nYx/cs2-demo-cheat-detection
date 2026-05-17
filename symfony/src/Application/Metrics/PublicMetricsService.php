<?php

declare(strict_types=1);

namespace App\Application\Metrics;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStatus;
use App\Infrastructure\Persistence\DemoRepository;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

final class PublicMetricsService
{
    private const CACHE_KEY = 'metrics:public';
    private const CACHE_TTL = 3600; // 1 hour in seconds

    public function __construct(
        private readonly DemoRepository $demoRepository,
        private readonly AnalysisResultRepository $analysisResultRepository,
        private readonly CacheInterface $cache,
    ) {
    }

    /**
     * Calculate and cache public metrics
     *
     * @return array<string, mixed>
     */
    public function calculateAndCache(): array
    {
        return $this->cache->get(self::CACHE_KEY, function (ItemInterface $item): array {
            $item->expiresAfter(self::CACHE_TTL);

            $metrics = [
                'total_demos_analyzed' => 0,
                'avg_suspicion_score' => 0.0,
                'total_players_analyzed' => 0,
                'total_matches' => 0,
                'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ];

            try {
                // Get all demos with status 'done'
                $allDemos = $this->demoRepository->findAll();
                $completedDemos = array_filter(
                    $allDemos,
                    fn (Demo $demo) => $demo->getStatus() === DemoStatus::Done
                );

                $metrics['total_demos_analyzed'] = count($completedDemos);
                $metrics['total_matches'] = count($completedDemos);

                // Calculate average suspicion score
                $allResults = $this->analysisResultRepository->findAll();
                if (!empty($allResults)) {
                    $totalSuspicion = 0;
                    foreach ($allResults as $result) {
                        $totalSuspicion += $result->getOverallSuspicion();
                    }
                    $metrics['avg_suspicion_score'] = round(
                        $totalSuspicion / count($allResults),
                        2
                    );
                }

                // Count unique players analyzed
                $uniquePlayers = [];
                foreach ($allResults as $result) {
                    $uniquePlayers[$result->getPlayer()->getSteamId()] = true;
                }
                $metrics['total_players_analyzed'] = count($uniquePlayers);
            } catch (\Exception $e) {
                // If calculation fails, return empty metrics with current timestamp
                $metrics['updated_at'] = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
            }

            return $metrics;
        });
    }

    /**
     * Get cached metrics or calculate if missing
     *
     * @return array<string, mixed>
     */
    public function getOrCalculate(): array
    {
        return $this->cache->get(self::CACHE_KEY, function (ItemInterface $item): array {
            $item->expiresAfter(self::CACHE_TTL);
            return $this->calculateMetrics();
        });
    }

    /**
     * Force recalculation of metrics (ignores cache)
     *
     * @return array<string, mixed>
     */
    public function recalculate(): array
    {
        $this->cache->delete(self::CACHE_KEY);
        return $this->calculateAndCache();
    }

    /**
     * Calculate metrics without caching
     *
     * @return array<string, mixed>
     */
    private function calculateMetrics(): array
    {
        $metrics = [
            'total_demos_analyzed' => 0,
            'avg_suspicion_score' => 0.0,
            'total_players_analyzed' => 0,
            'total_matches' => 0,
            'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];

        try {
            // Get all demos with status 'done'
            $allDemos = $this->demoRepository->findAll();
            $completedDemos = array_filter(
                $allDemos,
                fn (Demo $demo) => $demo->getStatus() === DemoStatus::Done
            );

            $metrics['total_demos_analyzed'] = count($completedDemos);
            $metrics['total_matches'] = count($completedDemos);

            // Calculate average suspicion score
            $allResults = $this->analysisResultRepository->findAll();
            if (!empty($allResults)) {
                $totalSuspicion = 0;
                foreach ($allResults as $result) {
                    $totalSuspicion += $result->getOverallSuspicion();
                }
                $metrics['avg_suspicion_score'] = round(
                    $totalSuspicion / count($allResults),
                    2
                );
            }

            // Count unique players analyzed
            $uniquePlayers = [];
            foreach ($allResults as $result) {
                $uniquePlayers[$result->getPlayer()->getSteamId()] = true;
            }
            $metrics['total_players_analyzed'] = count($uniquePlayers);
        } catch (\Exception $e) {
            // If calculation fails, return metrics with current timestamp
            $metrics['updated_at'] = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
        }

        return $metrics;
    }
}
