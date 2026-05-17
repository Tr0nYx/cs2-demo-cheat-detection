<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Demo\Demo;
use App\Domain\Trace\TraceRating;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/** @extends ServiceEntityRepository<Demo> */
final class DemoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Demo::class);
    }

    public function save(Demo $demo, bool $flush = true): void
    {
        $this->getEntityManager()->persist($demo);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Demo $demo, bool $flush = true): void
    {
        $this->getEntityManager()->remove($demo);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findByUuidString(string $id): ?Demo
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->find(Uuid::fromString($id));
    }

    /** @return list<array{demo: Demo, traceAdjusted: float|null}> */
    public function findFilteredForPlayer(
        string $playerId,
        ?string $map,
        ?string $ratingBand,
        ?string $outcome,
        ?int $daysBack,
        int $limit,
        int $offset,
    ): array {
        $qb = $this->createFilteredQueryBuilder($playerId, $map, $ratingBand, $outcome, $daysBack)
            ->select('d AS demo', 'tr.traceAdjusted AS traceAdjusted')
            ->orderBy('d.uploadedAt', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        return $qb->getQuery()->getResult();
    }

    public function countFilteredForPlayer(
        string $playerId,
        ?string $map,
        ?string $ratingBand,
        ?string $outcome,
        ?int $daysBack,
    ): int {
        $qb = $this->createFilteredQueryBuilder($playerId, $map, $ratingBand, $outcome, $daysBack)
            ->select('COUNT(DISTINCT d.id)');

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function createFilteredQueryBuilder(
        string $playerId,
        ?string $map,
        ?string $ratingBand,
        ?string $outcome,
        ?int $daysBack,
    ): QueryBuilder {
        $qb = $this->createQueryBuilder('d')
            ->innerJoin('d.analysisResults', 'ar')
            ->leftJoin(TraceRating::class, 'tr', 'WITH', 'tr.analysisResult = ar')
            ->innerJoin('ar.player', 'player')
            ->andWhere('player.steamId = :playerId')
            ->setParameter('playerId', $playerId);

        if ($map !== null) {
            $qb->andWhere('LOWER(d.map) = :map')
                ->setParameter('map', strtolower($map));
        }

        if ($ratingBand !== null) {
            match ($ratingBand) {
                '0-5' => $qb->andWhere('tr.traceAdjusted < :ratingHigh')
                    ->setParameter('ratingHigh', 0.33),
                '5-10' => $qb->andWhere('tr.traceAdjusted >= :ratingLow AND tr.traceAdjusted <= :ratingHigh')
                    ->setParameter('ratingLow', 0.33)
                    ->setParameter('ratingHigh', 0.67),
                '10+' => $qb->andWhere('tr.traceAdjusted > :ratingLow')
                    ->setParameter('ratingLow', 0.67),
            };
        }

        if ($outcome !== null) {
            $qb->andWhere('d.outcome = :outcome')
                ->setParameter('outcome', $outcome);
        }

        if ($daysBack !== null) {
            $since = new \DateTimeImmutable(sprintf('-%d days', $daysBack));
            $qb->andWhere('d.uploadedAt >= :uploadedSince')
                ->setParameter('uploadedSince', $since);
        }

        return $qb;
    }
}
