<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Steam\SteamInventorySnapshot;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<SteamInventorySnapshot> */
final class SteamInventorySnapshotRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SteamInventorySnapshot::class);
    }

    public function save(SteamInventorySnapshot $snapshot, bool $flush = true): void
    {
        $this->getEntityManager()->persist($snapshot);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function latestForSteamId(string $steamId): ?SteamInventorySnapshot
    {
        return $this->createQueryBuilder('snapshot')
            ->andWhere('snapshot.steamId = :steamId')
            ->setParameter('steamId', $steamId)
            ->orderBy('snapshot.fetchedAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
