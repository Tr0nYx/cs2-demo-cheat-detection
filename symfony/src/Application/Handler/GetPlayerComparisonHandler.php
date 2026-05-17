<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Leaderboard\ComponentBreakdownCardDto;
use App\Application\Leaderboard\MapAffinityCardDto;
use App\Application\Leaderboard\MatchHistoryCardDto;
use App\Application\Leaderboard\PlayerComparisonDto;
use App\Application\Leaderboard\TrendCardDto;
use App\Application\Query\GetPlayerComparisonQuery;
use App\Application\Service\PercentileCalculator;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Handler\MessageHandlerInterface;

/**
 * GetPlayerComparisonHandler - CQRS query handler for player comparison view.
 *
 * Aggregates 4 metrics for two players: component breakdown, TRACE trend,
 * map affinity, and shared demo history. Returns comprehensive comparison data
 * for side-by-side player benchmarking.
 *
 * Responsibilities:
 * - Load both players
 * - Build component breakdown cards with percentiles
 * - Build trend cards from last 10 demos
 * - Build map affinity cards (top 3 maps)
 * - Build match history cards (shared demos)
 * - Return aggregated comparison DTO
 */
final readonly class GetPlayerComparisonHandler implements MessageHandlerInterface
{
    public function __construct(
        private TraceRatingRepository $traceRepo,
        private AnalysisResultRepository $analysisRepo,
        private PlayerRepository $playerRepo,
        private PercentileCalculator $percentiles,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Handle query for player comparison.
     *
     * @param GetPlayerComparisonQuery $query Query with playerId and compareWithId
     * @return PlayerComparisonDto Aggregated comparison data for both players
     * @throws \InvalidArgumentException if players not found
     */
    public function __invoke(GetPlayerComparisonQuery $query): PlayerComparisonDto
    {
        try {
            // Load both players
            $playerA = $this->playerRepo->find($query->playerId);
            $playerB = $this->playerRepo->find($query->compareWithId);

            if (!$playerA || !$playerB) {
                throw new \InvalidArgumentException('One or both players not found');
            }

            $playerAName = $playerA->getDisplayName() ?? 'Unknown';
            $playerBName = $playerB->getDisplayName() ?? 'Unknown';

            // Build component breakdown cards
            $componentCardA = $this->buildComponentBreakdownCard($query->playerId);
            $componentCardB = $this->buildComponentBreakdownCard($query->compareWithId);

            // Build trend cards
            $trendCardA = $this->buildTrendCard($query->playerId);
            $trendCardB = $this->buildTrendCard($query->compareWithId);

            // Build map affinity cards
            $mapAffinityCardA = $this->buildMapAffinityCard($query->playerId);
            $mapAffinityCardB = $this->buildMapAffinityCard($query->compareWithId);

            // Build match history cards
            $historyCardA = $this->buildMatchHistoryCard($query->playerId, $query->compareWithId);
            $historyCardB = $this->buildMatchHistoryCard($query->compareWithId, $query->playerId);

            // Aggregate and return
            return new PlayerComparisonDto(
                playerAId: $query->playerId,
                playerAName: $playerAName,
                playerAComponents: $componentCardA,
                playerATrend: $trendCardA,
                playerAMaps: $mapAffinityCardA,
                playerAHistory: $historyCardA,
                playerBId: $query->compareWithId,
                playerBName: $playerBName,
                playerBComponents: $componentCardB,
                playerBTrend: $trendCardB,
                playerBMaps: $mapAffinityCardB,
                playerBHistory: $historyCardB,
            );
        } catch (\InvalidArgumentException $e) {
            $this->logger->warning('Player comparison failed: invalid arguments', [
                'playerId' => $query->playerId,
                'compareWithId' => $query->compareWithId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } catch (\Throwable $e) {
            $this->logger->error('Player comparison failed: unexpected error', [
                'playerId' => $query->playerId,
                'compareWithId' => $query->compareWithId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Build component breakdown card for a player.
     *
     * @param string $playerId Player ID to build card for
     * @return ComponentBreakdownCardDto Component scores with percentiles
     */
    private function buildComponentBreakdownCard(string $playerId): ComponentBreakdownCardDto
    {
        // Get latest TRACE rating
        $traces = $this->traceRepo->findLatestByPlayer($playerId, 1);
        $trace = $traces[0] ?? null;

        if (!$trace) {
            // No TRACE data yet - return empty card
            return new ComponentBreakdownCardDto(
                components: [],
                traceDatetime: new \DateTimeImmutable(),
            );
        }

        // Calculate percentiles with validation
        $percentileData = $this->percentiles->calculateComponentPercentiles($trace);

        // Validate percentile data structure and bounds
        if (!is_array($percentileData)) {
            $percentileData = [];
        }

        // Build components array with values and percentiles
        $components = [];
        foreach (['ekill', 'aim', 'kast', 'util', 'clutch'] as $component) {
            $percentile = $percentileData[$component] ?? 0;

            // Validate percentile is in valid range [0, 100]
            if (!is_numeric($percentile) || $percentile < 0 || $percentile > 100) {
                $percentile = 0;  // Reset to safe default if invalid
            }

            $method = 'get' . ucfirst($component);
            $components[$component] = [
                'value' => (float) $trace->$method(),
                'percentile' => (int) round($percentile),
            ];
        }

        return new ComponentBreakdownCardDto(
            components: $components,
            traceDatetime: $trace->getCalculatedAt(),
        );
    }

    /**
     * Build trend card for a player (last 10 demos).
     *
     * @param string $playerId Player ID to build card for
     * @return TrendCardDto Historical TRACE data with trend direction
     */
    private function buildTrendCard(string $playerId): TrendCardDto
    {
        // Get last 10 TRACE ratings
        $traces = $this->traceRepo->findLatestByPlayer($playerId, 10);

        if (count($traces) < 2) {
            // Insufficient data for trend
            return new TrendCardDto(
                history: [],
                trending: false,
            );
        }

        // Convert to history format (array in reverse chronological order)
        $history = array_map(fn($trace) => [
            'date' => $trace->getCalculatedAt(),
            'value' => $trace->getTraceAdjusted(),
        ], $traces);

        // Determine trending: compare latest vs oldest
        $latest = $traces[0]->getTraceAdjusted();
        $oldest = $traces[count($traces) - 1]->getTraceAdjusted();
        $trending = $latest > $oldest;

        return new TrendCardDto(
            history: $history,
            trending: $trending,
        );
    }

    /**
     * Build map affinity card for a player (top 3 maps).
     *
     * @param string $playerId Player ID to build card for
     * @return MapAffinityCardDto Top 3 maps by TRACE score
     */
    private function buildMapAffinityCard(string $playerId): MapAffinityCardDto
    {
        // Get top 3 maps
        $topMaps = $this->traceRepo->findTopMapsByPlayer($playerId, 3);

        return new MapAffinityCardDto(
            topMaps: $topMaps,
        );
    }

    /**
     * Build match history card (shared demos).
     *
     * @param string $playerAId First player ID
     * @param string $playerBId Second player ID
     * @return MatchHistoryCardDto Shared demos between players
     */
    private function buildMatchHistoryCard(string $playerAId, string $playerBId): MatchHistoryCardDto
    {
        // Get shared demos
        $sharedDemos = $this->analysisRepo->findSharedByPlayers($playerAId, $playerBId, 10);

        $demoData = array_map(fn($demo) => [
            'demoId' => $demo->getId(),
            'date' => $demo->getUploadedAt(),
            'mapId' => $demo->getMap(),
        ], $sharedDemos);

        return new MatchHistoryCardDto(
            sharedDemos: $demoData,
        );
    }
}
