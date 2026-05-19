<?php
declare(strict_types=1);

namespace App\Application\Import;

use App\Domain\Import\SharecodeImport;
use App\Infrastructure\Persistence\SharecodeImportRepository;
use App\Infrastructure\Queue\ImportDemoJobPublisher;
use App\Infrastructure\Import\RateLimiter;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Psr\Log\LoggerInterface;
use Symfony\Component\Uid\Uuid;

readonly class ImportSharecodeService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private SharecodeImportRepository $importRepository,
        private ImportDemoJobPublisher $jobPublisher,
        private RateLimiter $rateLimiter,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Import multiple sharecodes per user.
     * Per D-13: Validate format before queueing
     * Per D-10: Detect duplicates by UNIQUE constraint
     * Per D-24: Enforce per-user rate limit (10/hour)
     * Per D-25: Log all attempts
     *
     * @return array{queued: array, failed: array}
     */
    public function importMultiple(array $sharecodes, string $userId): array
    {
        $queued = [];
        $failed = [];

        // Check rate limit first (D-24)
        if (!$this->rateLimiter->isAllowed($userId)) {
            $this->logger->warning('Rate limit exceeded for user', [
                'user_id' => $userId,
                'request_count' => count($sharecodes),
            ]);

            // Mark all as failed due to rate limit
            foreach ($sharecodes as $sharecode) {
                $failed[] = [
                    'sharecode' => $sharecode,
                    'reason' => 'rate_limit_exceeded',
                    'message' => 'Max 10 imports per hour.',
                ];
            }

            return ['queued' => $queued, 'failed' => $failed];
        }

        foreach ($sharecodes as $sharecode) {
            try {
                // Normalize and validate format (D-13)
                $normalized = SharecodeValidator::normalize($sharecode);

                if (!SharecodeValidator::validate($normalized)) {
                    $failed[] = [
                        'sharecode' => $sharecode,
                        'reason' => 'invalid_format',
                        'message' => 'Must be CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format.',
                    ];

                    $this->logger->warning('Invalid sharecode format', [
                        'sharecode' => $sharecode,
                        'user_id' => $userId,
                    ]);

                    continue;
                }

                // Check for duplicate (D-10)
                $existing = $this->importRepository->findBySharecode($normalized);

                if ($existing !== null) {
                    $failed[] = [
                        'sharecode' => $normalized,
                        'reason' => 'duplicate',
                        'message' => 'This demo was already imported on ' .
                            $existing->getImportedAt()->format('Y-m-d H:i:s'),
                        'existing_id' => $existing->getId()->toRfc4122(),
                        'existing_demo_id' => $existing->getDemoId()?->toRfc4122(),
                    ];

                    $this->logger->info('Duplicate sharecode detected', [
                        'sharecode' => $normalized,
                        'user_id' => $userId,
                        'existing_import_id' => $existing->getId()->toRfc4122(),
                    ]);

                    continue;
                }

                // Create import record (status: pending)
                $import = new SharecodeImport(
                    sharecode: $normalized,
                    platform: $this->detectPlatform($normalized), // Infer platform from user context or default 'steam'
                    userId: Uuid::fromString($userId),
                );

                $this->entityManager->persist($import);
                $this->entityManager->flush();

                // Dispatch to queue
                $this->jobPublisher->publish(
                    sharecode: $normalized,
                    userId: $userId,
                    sharecodedImportId: $import->getId()->toRfc4122(),
                    platform: $import->getPlatform(),
                );

                $queued[] = [
                    'id' => $import->getId()->toRfc4122(),
                    'sharecode' => $normalized,
                    'platform' => $import->getPlatform(),
                    'status' => 'pending',
                ];

                $this->logger->info('Sharecode queued for import', [
                    'sharecode' => $normalized,
                    'user_id' => $userId,
                    'import_id' => $import->getId()->toRfc4122(),
                    'platform' => $import->getPlatform(),
                ]);

            } catch (UniqueConstraintViolationException) {
                // Race condition: another request imported same sharecode concurrently
                $existing = $this->importRepository->findBySharecode(
                    SharecodeValidator::normalize($sharecode)
                );

                $failed[] = [
                    'sharecode' => SharecodeValidator::normalize($sharecode),
                    'reason' => 'duplicate',
                    'message' => 'This demo was already imported on ' .
                        ($existing?->getImportedAt()->format('Y-m-d H:i:s') ?? 'recently'),
                ];

                $this->logger->warning('Race condition: duplicate import detected', [
                    'sharecode' => SharecodeValidator::normalize($sharecode),
                    'user_id' => $userId,
                ]);

            } catch (\Exception $e) {
                $failed[] = [
                    'sharecode' => $sharecode,
                    'reason' => 'internal_error',
                    'message' => 'Failed to queue import. Please try again later.',
                ];

                $this->logger->error('Unexpected error queueing sharecode import', [
                    'sharecode' => $sharecode,
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return ['queued' => $queued, 'failed' => $failed];
    }

    public function getHistory(string $userId, int $limit = 50)
    {
        return $this->importRepository->findRecentByUser($userId, $limit);
    }

    /** @return array{queued: bool, duplicate: bool, import_id: string|null, demo_id: string|null} */
    public function importDiscoveredSharecode(string $sharecode, string $userId): array
    {
        $normalized = SharecodeValidator::normalize($sharecode);
        if (!SharecodeValidator::validate($normalized)) {
            throw new \InvalidArgumentException('Discovered sharecode is malformed.');
        }

        $existing = $this->importRepository->findBySharecode($normalized);
        if ($existing !== null) {
            return [
                'queued' => false,
                'duplicate' => true,
                'import_id' => $existing->getId()->toRfc4122(),
                'demo_id' => $existing->getDemoId()?->toRfc4122(),
            ];
        }

        $import = new SharecodeImport(
            sharecode: $normalized,
            platform: $this->detectPlatform($normalized),
            userId: Uuid::fromString($userId),
        );

        $this->entityManager->persist($import);
        $this->entityManager->flush();

        $this->jobPublisher->publish(
            sharecode: $normalized,
            userId: $userId,
            sharecodedImportId: $import->getId()->toRfc4122(),
            platform: $import->getPlatform(),
        );

        $this->logger->info('Match-history sharecode queued for import', [
            'sharecode' => $normalized,
            'user_id' => $userId,
            'import_id' => $import->getId()->toRfc4122(),
        ]);

        return [
            'queued' => true,
            'duplicate' => false,
            'import_id' => $import->getId()->toRfc4122(),
            'demo_id' => null,
        ];
    }

    private function detectPlatform(string $sharecode): string
    {
        // All CS2 matchmaking uses CSGO- prefix.
        // Platform must be inferred from user context or caller must specify.
        // Default to 'steam' for now (D-01 primary source).
        // Future: Accept platform parameter in request if needed.
        return 'steam';
    }
}
