<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Entity\User;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;

readonly class SteamMatchHistoryStatusProvider
{
    public function __construct(private SteamMatchHistoryConnectionRepository $connections)
    {
    }

    /** @return array<string, mixed> */
    public function forUser(User $user): array
    {
        $connection = $this->connections->findForUserSteamId($user->getId(), $user->getSteamId());
        if (!$connection instanceof SteamMatchHistoryConnection || $connection->getStatus() === SteamMatchHistoryConnection::STATUS_DISCONNECTED) {
            return [
                'connected' => false,
                'status' => SteamMatchHistoryConnection::STATUS_DISCONNECTED,
                'connected_since' => null,
                'last_check_at' => null,
                'next_check_at' => null,
                'known_sharecode' => null,
                'discovered_count' => 0,
                'queued_count' => 0,
                'imported_count' => 0,
                'last_error' => null,
            ];
        }

        return [
            'connected' => true,
            'status' => $connection->getStatus(),
            'connected_since' => $connection->getConnectedAt()->format(\DateTimeInterface::ATOM),
            'last_check_at' => $connection->getLastCheckAt()?->format(\DateTimeInterface::ATOM),
            'next_check_at' => $connection->getNextCheckAt()?->format(\DateTimeInterface::ATOM),
            'known_sharecode' => $this->maskSharecode($connection->getKnownSharecode()),
            'discovered_count' => $connection->getDiscoveredCount(),
            'queued_count' => $connection->getQueuedCount(),
            'imported_count' => $connection->getImportedCount(),
            'last_error' => $connection->getLastErrorCode() === null ? null : [
                'code' => $connection->getLastErrorCode(),
                'message' => $connection->getLastErrorMessage(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function fromConnection(SteamMatchHistoryConnection $connection): array
    {
        if ($connection->getStatus() === SteamMatchHistoryConnection::STATUS_DISCONNECTED) {
            return [
                'connected' => false,
                'status' => SteamMatchHistoryConnection::STATUS_DISCONNECTED,
                'connected_since' => null,
                'last_check_at' => $connection->getLastCheckAt()?->format(\DateTimeInterface::ATOM),
                'next_check_at' => null,
                'known_sharecode' => null,
                'discovered_count' => $connection->getDiscoveredCount(),
                'queued_count' => $connection->getQueuedCount(),
                'imported_count' => $connection->getImportedCount(),
                'last_error' => null,
            ];
        }

        return [
            'connected' => true,
            'status' => $connection->getStatus(),
            'connected_since' => $connection->getConnectedAt()->format(\DateTimeInterface::ATOM),
            'last_check_at' => $connection->getLastCheckAt()?->format(\DateTimeInterface::ATOM),
            'next_check_at' => $connection->getNextCheckAt()?->format(\DateTimeInterface::ATOM),
            'known_sharecode' => $this->maskSharecode($connection->getKnownSharecode()),
            'discovered_count' => $connection->getDiscoveredCount(),
            'queued_count' => $connection->getQueuedCount(),
            'imported_count' => $connection->getImportedCount(),
            'last_error' => $connection->getLastErrorCode() === null ? null : [
                'code' => $connection->getLastErrorCode(),
                'message' => $connection->getLastErrorMessage(),
            ],
        ];
    }

    private function maskSharecode(string $sharecode): string
    {
        return substr($sharecode, 0, 10).'...'.substr($sharecode, -5);
    }
}
