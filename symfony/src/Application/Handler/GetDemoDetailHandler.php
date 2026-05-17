<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Demo\DemoResponseFactory;
use App\Application\Query\GetDemoDetailQuery;
use App\Domain\Analytics\FeatureVectorsDto;
use App\Domain\Analysis\AnalysisResult;
use App\Infrastructure\Persistence\DemoRepository;

final readonly class GetDemoDetailHandler
{
    public function __construct(
        private DemoRepository $demos,
        private DemoResponseFactory $responses,
    ) {
    }

    /** @return array<string, mixed>|null */
    public function __invoke(GetDemoDetailQuery $query): ?array
    {
        $demo = $this->demos->findByUuidString($query->demoId);
        if ($demo === null) {
            return null;
        }

        $analysisResult = $this->findScopedAnalysisResult($demo->getAnalysisResults()->toArray(), $query->userId);
        $payload = $this->responses->demo($demo);
        $payload['id'] = $demo->getIdString();
        $payload['metadata']['map'] = $demo->getMap();
        $payload['metadata']['outcome'] = $demo->getOutcome();
        $payload['featureVectors'] = $analysisResult instanceof AnalysisResult
            ? FeatureVectorsDto::fromAnalysisResult($analysisResult)->toArray()
            : null;
        $payload['baselineSuspicion'] = $analysisResult?->getOverallSuspicion();

        return $payload;
    }

    /** @param list<AnalysisResult> $results */
    private function findScopedAnalysisResult(array $results, ?string $userId): ?AnalysisResult
    {
        if ($userId !== null && $userId !== '') {
            foreach ($results as $result) {
                if ($result->getPlayer()->getSteamId() === $userId) {
                    return $result;
                }
            }

            return null;
        }

        return $results[0] ?? null;
    }
}
