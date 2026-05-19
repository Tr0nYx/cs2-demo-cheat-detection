<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Application\Import\ImportSharecodeService;
use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;
use App\Infrastructure\Steam\SteamMatchHistoryClient;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class TrackSteamMatchHistoryHandler
{
    public function __construct(
        private SteamMatchHistoryConnectionRepository $connections,
        private SteamMatchHistorySecretCipher $cipher,
        private SteamMatchHistoryClient $client,
        private ImportSharecodeService $imports,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(TrackSteamMatchHistoryMessage $message): void
    {
        $connection = $this->connections->findById($message->connectionId);
        if (!$connection instanceof SteamMatchHistoryConnection) {
            return;
        }

        if (!$message->force && in_array($connection->getStatus(), [
            SteamMatchHistoryConnection::STATUS_DISCONNECTED,
            SteamMatchHistoryConnection::STATUS_AUTH_FAILED,
            SteamMatchHistoryConnection::STATUS_INVALID_SEED,
        ], true)) {
            return;
        }

        $encrypted = $connection->getEncryptedSteamIdKey();
        if ($encrypted === null) {
            $connection->markFailed(SteamMatchHistoryConnection::STATUS_AUTH_FAILED, 'missing_credential', 'Reconnect match-history tracking.', null);
            $this->entityManager->flush();
            return;
        }

        $limit = max(1, $message->perRunLimit);
        $steamIdKey = $this->cipher->decrypt($encrypted);

        for ($i = 0; $i < $limit; $i++) {
            $result = $this->client->getNextCode($connection->getSteamId(), $steamIdKey, $connection->getKnownSharecode());

            if ($result->isNextCode()) {
                $import = $this->imports->importDiscoveredSharecode($result->nextCode, $connection->getUserId()->toRfc4122());
                $connection->advanceCursor($result->nextCode, $import['queued']);
                $this->entityManager->flush();
                continue;
            }

            $now = new \DateTimeImmutable();
            match ($result->status) {
                'caught_up' => $connection->markCaughtUp($now->modify('+30 minutes'), $now),
                'auth_failed' => $connection->markFailed(SteamMatchHistoryConnection::STATUS_AUTH_FAILED, 'auth_failed', 'Steam rejected the game authentication code.', null, $now),
                'invalid_seed' => $connection->markFailed(SteamMatchHistoryConnection::STATUS_INVALID_SEED, 'invalid_seed', 'Steam rejected the seed or known sharecode.', null, $now),
                'rate_limited' => $connection->markFailed(SteamMatchHistoryConnection::STATUS_RATE_LIMITED, 'rate_limited', 'Valve rate limit reached.', $now->modify('+2 hours'), $now),
                default => $connection->markFailed(SteamMatchHistoryConnection::STATUS_STEAM_UNAVAILABLE, $result->errorCode ?? 'steam_unavailable', $result->errorMessage, $now->modify('+30 minutes'), $now),
            };
            $this->entityManager->flush();

            $this->logger->info('Steam match-history tracking run stopped', [
                'connection_id' => $connection->getId()->toRfc4122(),
                'user_id' => $connection->getUserId()->toRfc4122(),
                'steam_id' => $connection->getSteamId(),
                'status' => $connection->getStatus(),
                'reason' => $message->reason,
            ]);

            return;
        }

        $now = new \DateTimeImmutable();
        $connection->scheduleNextActiveCheck($now->modify('+5 minutes'), $now);
        $this->entityManager->flush();
    }
}
