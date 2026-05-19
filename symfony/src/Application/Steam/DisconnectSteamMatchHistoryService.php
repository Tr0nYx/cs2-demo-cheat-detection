<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Entity\User;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;
use Doctrine\ORM\EntityManagerInterface;

readonly class DisconnectSteamMatchHistoryService
{
    public function __construct(
        private SteamMatchHistoryConnectionRepository $connections,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function disconnect(User $user): ?SteamMatchHistoryConnection
    {
        $connection = $this->connections->findForUserSteamId($user->getId(), $user->getSteamId());
        if (!$connection instanceof SteamMatchHistoryConnection) {
            return null;
        }

        $connection->disconnect();
        $this->entityManager->flush();

        return $connection;
    }
}
