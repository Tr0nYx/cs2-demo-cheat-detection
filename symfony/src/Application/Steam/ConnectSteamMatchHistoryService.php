<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Entity\User;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;
use Doctrine\ORM\EntityManagerInterface;

readonly class ConnectSteamMatchHistoryService
{
    public function __construct(
        private SharecodeSeedParser $seedParser,
        private SteamMatchHistorySecretCipher $cipher,
        private SteamMatchHistoryConnectionRepository $connections,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function connect(User $user, string $steamIdKey, string $seedInput): SteamMatchHistoryConnection
    {
        $seedSharecode = $this->seedParser->parse($seedInput);
        $encrypted = $this->cipher->encrypt($steamIdKey);
        $fingerprint = $this->cipher->fingerprint($steamIdKey);

        $connection = $this->connections->findForUserSteamId($user->getId(), $user->getSteamId());
        if ($connection === null) {
            $connection = new SteamMatchHistoryConnection(
                userId: $user->getId(),
                steamId: $user->getSteamId(),
                encryptedSteamIdKey: $encrypted,
                credentialFingerprint: $fingerprint,
                seedSharecode: $seedSharecode,
            );
            $this->entityManager->persist($connection);
        } else {
            $connection->connect($encrypted, $fingerprint, $seedSharecode);
        }

        $this->entityManager->flush();

        return $connection;
    }
}
