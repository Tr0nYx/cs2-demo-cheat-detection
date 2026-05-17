<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Team\Team;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * Repository for Team entities.
 *
 * Provides custom query methods for finding teams by name and other criteria.
 */
class TeamRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Team::class);
    }

    /**
     * Find a team by name.
     *
     * @param string $name Team name to search for
     * @return Team|null Team entity or null if not found
     */
    public function findByName(string $name): ?Team
    {
        return $this->createQueryBuilder('t')
            ->where('t.name = :name')
            ->setParameter('name', $name)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
