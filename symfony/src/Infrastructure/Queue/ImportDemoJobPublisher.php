<?php
declare(strict_types=1);

namespace App\Infrastructure\Queue;

use App\Application\Command\ImportDemoMessage;
use Symfony\Component\Messenger\MessageBusInterface;
use Psr\Log\LoggerInterface;

final readonly class ImportDemoJobPublisher
{
    public function __construct(
        private MessageBusInterface $messageBus,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Publish sharecode import job to async queue.
     * Per D-07: Queue job to Redis for Python worker processing.
     * Per D-09: Worker handles all download, parsing, error handling.
     */
    public function publish(
        string $sharecode,
        string $userId,
        string $sharecodedImportId,
        string $platform,
        int $attemptCount = 0,
    ): void {
        $message = new ImportDemoMessage(
            sharecode: $sharecode,
            userId: $userId,
            sharecodedImportId: $sharecodedImportId,
            platform: $platform,
            attemptCount: $attemptCount,
        );

        $this->messageBus->dispatch($message);

        $this->logger->info('Import job published to queue', [
            'sharecode' => $sharecode,
            'user_id' => $userId,
            'import_id' => $sharecodedImportId,
            'platform' => $platform,
            'attempt' => $attemptCount + 1,
        ]);
    }
}
