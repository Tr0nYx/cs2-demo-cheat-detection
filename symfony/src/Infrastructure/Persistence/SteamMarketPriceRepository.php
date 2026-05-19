<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Steam\SteamMarketPrice;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<SteamMarketPrice> */
final class SteamMarketPriceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SteamMarketPrice::class);
    }

    public function save(SteamMarketPrice $price, bool $flush = true): void
    {
        $this->getEntityManager()->persist($price);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function freshPrice(int $appId, string $marketHashName, string $currency, string $source, ?\DateTimeImmutable $now = null): ?SteamMarketPrice
    {
        $price = $this->createQueryBuilder('price')
            ->andWhere('price.appId = :appId')
            ->andWhere('price.marketHashName = :name')
            ->andWhere('price.currency = :currency')
            ->andWhere('price.source = :source')
            ->setParameters([
                'appId' => $appId,
                'name' => $marketHashName,
                'currency' => $currency,
                'source' => $source,
            ])
            ->orderBy('price.fetchedAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        return $price instanceof SteamMarketPrice && $price->isFresh($now) ? $price : null;
    }
}
