<?php

declare(strict_types=1);

namespace App\Infrastructure\Event;

use App\Domain\Analysis\AnalysisResultCreated;
use App\Infrastructure\Cache\AnalyticsCacheAdapter;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

final readonly class OnAnalysisResultCreated
{
    public function __construct(
        private AnalyticsCacheAdapter $cache,
        private LoggerInterface $logger,
    ) {
    }

    #[AsEventListener(event: AnalysisResultCreated::class)]
    public function onAnalysisCreated(AnalysisResultCreated $event): void
    {
        $playerId = $event->getAnalysisResult()->getPlayer()->getSteamId();
        $this->cache->invalidate($playerId);
        $this->logger->debug('Trend cache invalidated.', ['playerId' => $playerId]);
    }
}
