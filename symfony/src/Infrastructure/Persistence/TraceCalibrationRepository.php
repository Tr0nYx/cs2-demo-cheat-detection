<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Trace\TraceCalibration;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * Repository for TraceCalibration entities.
 *
 * Provides custom query methods for finding calibration versions by identifier, retrieving
 * the latest active version, and querying historical calibration data.
 */
class TraceCalibrationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TraceCalibration::class);
    }

    /**
     * Find a calibration version by its version string.
     *
     * @param string $version Version identifier (e.g., "default-v1", "live-v1")
     * @return ?TraceCalibration The matching TraceCalibration entity, or null if not found
     */
    public function findByVersion(string $version): ?TraceCalibration
    {
        return $this->findOneBy(['version' => $version]);
    }

    /**
     * Find the most recent unlocked calibration version.
     *
     * Returns the calibration with the latest created_at timestamp that is not locked.
     * Useful for getting the "active" calibration for normalizing new TRACE scores.
     *
     * @return ?TraceCalibration The most recent unlocked calibration, or null if none exist
     */
    public function findLatest(): ?TraceCalibration
    {
        return $this->createQueryBuilder('tc')
            ->where('tc.locked = :locked')
            ->setParameter('locked', false)
            ->orderBy('tc.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find all calibration versions, ordered by creation time.
     *
     * Useful for auditing and version history.
     *
     * @return array<TraceCalibration> All TraceCalibration entities, ordered by created_at DESC
     */
    public function findAllVersions(): array
    {
        return $this->createQueryBuilder('tc')
            ->orderBy('tc.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
