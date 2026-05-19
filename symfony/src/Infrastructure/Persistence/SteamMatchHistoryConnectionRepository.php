<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Steam\SteamMatchHistoryConnection;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/** @extends ServiceEntityRepository<SteamMatchHistoryConnection> */
class SteamMatchHistoryConnectionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SteamMatchHistoryConnection::class);
    }

    public function findForUserSteamId(Uuid $userId, string $steamId): ?SteamMatchHistoryConnection
    {
        return $this->findOneBy(['userId' => $userId, 'steamId' => $steamId]);
    }

    public function findById(string $id): ?SteamMatchHistoryConnection
    {
        return Uuid::isValid($id) ? $this->find(Uuid::fromString($id)) : null;
    }

    /** @return list<SteamMatchHistoryConnection> */
    public function findDue(\DateTimeImmutable $now, int $limit, bool $force = false): array
    {
        $qb = $this->createQueryBuilder('connection')
            ->orderBy('connection.nextCheckAt', 'ASC')
            ->setMaxResults($limit);

        if (!$force) {
            $qb
                ->andWhere('connection.status IN (:statuses)')
                ->andWhere('connection.nextCheckAt IS NOT NULL')
                ->andWhere('connection.nextCheckAt <= :now')
                ->setParameter('statuses', [
                    SteamMatchHistoryConnection::STATUS_ACTIVE,
                    SteamMatchHistoryConnection::STATUS_CAUGHT_UP,
                    SteamMatchHistoryConnection::STATUS_RATE_LIMITED,
                    SteamMatchHistoryConnection::STATUS_STEAM_UNAVAILABLE,
                ])
                ->setParameter('now', $now);
        }

        return $qb->getQuery()->getResult();
    }
}
