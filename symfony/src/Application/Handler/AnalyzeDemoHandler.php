<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Command\AnalyzeDemoMessage;
use App\Infrastructure\Persistence\DemoRepository;
use App\Infrastructure\Queue\AnalysisJobPublisher;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class AnalyzeDemoHandler
{
    public function __construct(
        private DemoRepository $demos,
        private AnalysisJobPublisher $publisher,
    ) {
    }

    public function __invoke(AnalyzeDemoMessage $message): void
    {
        $demo = $this->demos->findByUuidString($message->demoId);

        if ($demo === null) {
            throw new \RuntimeException('Demo not found for analysis dispatch.');
        }

        $this->publisher->publish($demo);
        $demo->markQueued();
        $this->demos->save($demo);
    }
}
