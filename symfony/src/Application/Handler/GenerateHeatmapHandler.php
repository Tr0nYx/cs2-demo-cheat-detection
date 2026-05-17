<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Command\GenerateHeatmapMessage;
use App\Infrastructure\Queue\RedisViewerJobPublisher;

final readonly class GenerateHeatmapHandler
{
    public function __construct(private RedisViewerJobPublisher $viewerJobs)
    {
    }

    public function __invoke(GenerateHeatmapMessage $message): void
    {
        $this->viewerJobs->publish($message->toPayload());
    }
}
