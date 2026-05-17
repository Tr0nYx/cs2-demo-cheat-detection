<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Query\DemoSummaryDto;
use App\Application\Query\FilteredDemosDto;
use App\Application\Query\GetFilteredDemosQuery;
use App\Domain\Demo\Demo;
use App\Infrastructure\Persistence\DemoRepository;
use Psr\Log\LoggerInterface;

final readonly class GetFilteredDemosHandler
{
    public function __construct(
        private DemoRepository $demos,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(GetFilteredDemosQuery $query): FilteredDemosDto
    {
        $rows = $this->demos->findFilteredForPlayer(
            playerId: $query->userId,
            map: $query->map,
            ratingBand: $query->ratingBand,
            outcome: $query->outcome,
            daysBack: $query->effectiveDaysBack(),
            limit: $query->limit,
            offset: $query->offset,
        );

        $total = $this->demos->countFilteredForPlayer(
            playerId: $query->userId,
            map: $query->map,
            ratingBand: $query->ratingBand,
            outcome: $query->outcome,
            daysBack: $query->effectiveDaysBack(),
        );

        $summaries = [];
        foreach ($rows as $row) {
            $demo = $row['demo'];
            if (!$demo instanceof Demo) {
                continue;
            }

            $summaries[] = new DemoSummaryDto(
                id: $demo->getIdString(),
                map: $demo->getMap(),
                status: $demo->getStatus()->value,
                uploadedAt: $demo->getUploadedAt()->format('c'),
                traceAdjusted: isset($row['traceAdjusted']) ? (float) $row['traceAdjusted'] : null,
                outcome: $demo->getOutcome(),
            );
        }

        $this->logger->info('Filtered demos queried', [
            'playerId' => $query->userId,
            'map' => $query->map,
            'ratingBand' => $query->ratingBand,
            'outcome' => $query->outcome,
            'daysBack' => $query->effectiveDaysBack(),
            'limit' => $query->limit,
            'offset' => $query->offset,
            'total' => $total,
            'returned' => count($summaries),
        ]);

        return new FilteredDemosDto(
            demos: $summaries,
            total: $total,
            hasMore: ($query->offset + $query->limit) < $total,
        );
    }
}
