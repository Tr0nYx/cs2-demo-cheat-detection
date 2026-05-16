<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Trace\TraceRating;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * Repository for TraceRating entities.
 *
 * Provides custom query methods for finding TRACE data by player, calibration version, and time ranges.
 */
class TraceRatingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TraceRating::class);
    }

    /**
     * Find the N most recent TRACE ratings for a player.
     *
     * @param string $playerId Player ID to search for
     * @param int $limit Maximum number of results (default 10)
     * @return array<TraceRating> Array of TraceRating entities, ordered by calculated_at DESC
     */
    public function findLatestByPlayer(string $playerId, ?int $limit = 10): array
    {
        return $this->createQueryBuilder('tr')
            ->where('tr.playerId = :playerId')
            ->setParameter('playerId', $playerId)
            ->orderBy('tr.calculatedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all TRACE ratings for a specific calibration version.
     *
     * @param string $version Calibration version identifier
     * @return array<TraceRating> Array of TraceRating entities
     */
    public function findByCalibrationVersion(string $version): array
    {
        return $this->createQueryBuilder('tr')
            ->where('tr.calibrationVersion = :version')
            ->setParameter('version', $version)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count TRACE ratings for a specific calibration version.
     *
     * Used by calibration logic to determine if recalibration threshold (100 samples) is met.
     *
     * @param string $version Calibration version identifier
     * @return int Count of matching TRACE ratings
     */
    public function countByCalibrationVersion(string $version): int
    {
        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(tr.id)')
            ->where('tr.calibrationVersion = :version')
            ->setParameter('version', $version)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
