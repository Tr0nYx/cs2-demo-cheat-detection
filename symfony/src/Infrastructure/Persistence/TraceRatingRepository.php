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

    /**
     * Find paginated TRACE ratings for a player with optional sorting.
     *
     * Returns a paginated set of TRACE history for a specific player.
     * Supports sorting by calculated_at in ascending or descending order.
     *
     * @param string $playerId Player ID to search for
     * @param int $limit Maximum number of results (typically 10-100)
     * @param int $offset Skip first N results for pagination
     * @param string $sortBy Sort order: 'date' (DESC), 'date_asc' (ASC)
     * @return array<TraceRating> Array of TraceRating entities
     */
    public function findByPlayerIdPaginated(
        string $playerId,
        int $limit = 10,
        int $offset = 0,
        string $sortBy = 'date'
    ): array {
        $sortOrder = ($sortBy === 'date_asc') ? 'ASC' : 'DESC';

        return $this->createQueryBuilder('tr')
            ->where('tr.playerId = :playerId')
            ->setParameter('playerId', $playerId)
            ->orderBy('tr.calculatedAt', $sortOrder)
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count total TRACE ratings for a player.
     *
     * Used for pagination metadata (hasMore, total count).
     *
     * @param string $playerId Player ID to count records for
     * @return int Total count of TRACE ratings for player
     */
    public function countByPlayerId(string $playerId): int
    {
        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(tr.id)')
            ->where('tr.playerId = :playerId')
            ->setParameter('playerId', $playerId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find qualified players (5+ demos) sorted by trace_adjusted descending for global leaderboard.
     *
     * Returns the N most recent TRACE ratings for players who have at least 5 qualifying demos.
     * Sorted by trace_adjusted in descending order for leaderboard ranking by 95th percentile.
     *
     * @param int $limit Maximum number of results (default 100)
     * @param int $offset Skip first N results for pagination
     * @return array<TraceRating> Array of TraceRating entities from qualified players
     */
    public function findQualifiedAndSorted(int $limit = 100, int $offset = 0): array
    {
        return $this->createQueryBuilder('tr')
            ->select('tr')
            ->where('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->orderBy('tr.traceAdjusted', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count total qualified players (5+ demos) for leaderboard pagination metadata.
     *
     * Returns distinct count of players who have at least 5 TRACE ratings.
     * Used for pagination total and hasMore calculation.
     *
     * @return int Number of qualified players
     */
    public function countQualified(): int
    {
        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(DISTINCT tr.playerId)')
            ->where('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find qualified players (5+ demos) for a specific map, sorted by trace_adjusted descending.
     *
     * Filters TRACE ratings by map (Demo.map field) and applies global qualification filter
     * (players must have 5+ total demos across all maps). Returns results sorted by trace_adjusted DESC.
     *
     * BLOCKER-003 VERIFICATION: Map field is stored in Demo.map entity column (populated during demo analysis).
     * Per D-06: Qualification is GLOBAL (5+ total demos), not per-map.
     *
     * @param string $mapId Map identifier (e.g., 'de_mirage')
     * @param int $limit Maximum number of results (default 100)
     * @param int $offset Skip first N results for pagination
     * @return array<TraceRating> Array of TraceRating entities filtered to specific map
     */
    public function findQualifiedByMapAndSorted(
        string $mapId,
        int $limit = 100,
        int $offset = 0
    ): array {
        return $this->createQueryBuilder('tr')
            ->select('tr')
            ->innerJoin('tr.analysisResult', 'ar')
            ->innerJoin('ar.demo', 'd')
            ->where('d.map = :mapId')
            ->andWhere('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->setParameter('mapId', $mapId)
            ->orderBy('tr.traceAdjusted', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count qualified players for a specific map.
     *
     * Returns distinct count of players who have at least 5 total demos (global qualification)
     * and have played the specified map.
     *
     * @param string $mapId Map identifier (e.g., 'de_mirage')
     * @return int Number of qualified players on this map
     */
    public function countQualifiedByMap(string $mapId): int
    {
        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(DISTINCT tr.playerId)')
            ->innerJoin('tr.analysisResult', 'ar')
            ->innerJoin('ar.demo', 'd')
            ->where('d.map = :mapId')
            ->andWhere('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId) >= 5')
            ->setParameter('mapId', $mapId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find qualified players within a time window, sorted by trace_adjusted descending.
     *
     * Filters TRACE ratings by calculated_at timestamp (demos analyzed within N days ago).
     * Applies global qualification filter: players must have 5+ demos within the time window.
     * All timestamps are in UTC (configured in TraceRating entity).
     *
     * Per D-04: Time-windows filter by TraceRating.calculated_at timestamp.
     * Per D-06: Qualification is GLOBAL and TIME-WINDOWED (5+ demos in the specified window).
     *
     * @param int $daysBack Number of days to look back (e.g., 30 or 90)
     * @param int $limit Maximum number of results (default 100)
     * @param int $offset Skip first N results for pagination
     * @return array<TraceRating> Array of TraceRating entities within time window
     */
    public function findQualifiedByTimeWindowAndSorted(
        int $daysBack,
        int $limit = 100,
        int $offset = 0
    ): array {
        $cutoffDate = new \DateTimeImmutable('-' . $daysBack . ' days');

        return $this->createQueryBuilder('tr')
            ->select('tr')
            ->where('tr.calculatedAt >= :cutoff')
            ->andWhere('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId AND tr2.calculatedAt >= :cutoff) >= 5')
            ->setParameter('cutoff', $cutoffDate, \Doctrine\DBAL\Types\Types::DATETIME_IMMUTABLE)
            ->orderBy('tr.traceAdjusted', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count qualified players within a time window.
     *
     * Returns distinct count of players who have at least 5 demos within the specified time window.
     *
     * @param int $daysBack Number of days to look back (e.g., 30 or 90)
     * @return int Number of qualified players within time window
     */
    public function countQualifiedByTimeWindow(int $daysBack): int
    {
        $cutoffDate = new \DateTimeImmutable('-' . $daysBack . ' days');

        return (int) $this->createQueryBuilder('tr')
            ->select('COUNT(DISTINCT tr.playerId)')
            ->where('tr.calculatedAt >= :cutoff')
            ->andWhere('(SELECT COUNT(tr2.id) FROM TraceRating tr2 WHERE tr2.playerId = tr.playerId AND tr2.calculatedAt >= :cutoff) >= 5')
            ->setParameter('cutoff', $cutoffDate, \Doctrine\DBAL\Types\Types::DATETIME_IMMUTABLE)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Find top N maps for a player by TRACE score.
     *
     * Returns the highest TRACE-adjusted scores for each unique map that the player has played.
     * Used for map affinity comparison view to show which maps the player performs best on.
     *
     * Note: SQL query aliases 'd.map' as 'mapId', but array key is 'map' for
     * consistency with frontend MapAffinityCardDto expectations.
     *
     * @param string $playerId Player ID to search for
     * @param int $limit Maximum number of maps to return (default 3)
     * @return array<array{map: string, traceAdjusted: float}> Array of top maps with scores
     */
    public function findTopMapsByPlayer(string $playerId, int $limit = 3): array
    {
        $results = $this->createQueryBuilder('tr')
            ->select('d.map as mapId, MAX(tr.traceAdjusted) as traceAdjusted')
            ->innerJoin('tr.analysisResult', 'ar')
            ->innerJoin('ar.demo', 'd')
            ->where('tr.playerId = :playerId')
            // Safe: d.map is a direct entity column reference, not user input.
            // The groupBy clause is safe from SQL injection as it references the mapped column.
            // If refactoring to parameterize map filtering, ensure new parameters are properly bound.
            ->groupBy('d.map')
            ->setParameter('playerId', $playerId)
            ->orderBy('traceAdjusted', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        // Convert to expected format (returning 'map' instead of 'mapId' for consistency with frontend)
        return array_map(fn(array $row) => [
            'map' => $row['mapId'],  // Clarify: this is the Map ID string, not a Map object
            'traceAdjusted' => (float) $row['traceAdjusted'],
        ], $results);
    }
}
