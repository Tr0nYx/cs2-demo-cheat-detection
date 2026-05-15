<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Demo\Demo;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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
}
