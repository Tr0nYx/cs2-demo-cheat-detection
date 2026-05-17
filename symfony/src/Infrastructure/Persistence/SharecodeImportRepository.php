<?php
declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Import\SharecodeImport;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SharecodeImport>
 */
final class SharecodeImportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SharecodeImport::class);
    }

    public function findBySharecode(string $sharecode): ?SharecodeImport
    {
        return $this->findOneBy(['sharecode' => strtoupper(trim($sharecode))]);
    }

    public function findPendingByUser(string $userId, int $limit = 50)
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.userId = :userId')
            ->andWhere('s.status IN (:statuses)')
            ->setParameter('userId', $userId)
            ->setParameter('statuses', ['pending', 'downloading', 'parsing'])
            ->orderBy('s.importedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function findRecentByUser(string $userId, int $limit = 50)
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.userId = :userId')
            ->setParameter('userId', $userId)
            ->orderBy('s.importedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
