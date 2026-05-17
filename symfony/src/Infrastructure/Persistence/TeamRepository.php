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

    /**
     * Find teams with qualifying members (5+ demos per member), sorted by aggregated TRACE.
     *
     * Team score = average 95th percentile (traceAdjusted) of all qualified members.
     * A team appears in results only if at least one member is qualified (5+ demos).
     * Results are sorted by team aggregated score in descending order.
     *
     * @param int $limit Results per page (default 100)
     * @param int $offset Skip first N results for pagination
     * @return array<Team> Array of Team entities with highest aggregated scores first
     */
    public function findQualifiedTeamsAndSorted(int $limit = 100, int $offset = 0): array
    {
        // Fetch team IDs with their aggregated scores via DQL
        $qb = $this->createQueryBuilder('t')
            ->select('t.id as team_id, AVG(tr.traceAdjusted) as team_score')
            ->innerJoin('t.players', 'p')
            ->leftJoin('App\Domain\Trace\TraceRating', 'tr', 'WITH', 'tr.playerId = p.id')
            ->where('(SELECT COUNT(tr2.id) FROM App\Domain\Trace\TraceRating tr2 WHERE tr2.playerId = p.id) >= 5')
            ->groupBy('t.id')
            ->orderBy('team_score', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $results = $qb->getQuery()->getResult();

        // Extract team IDs and fetch full Team entities
        if (empty($results)) {
            return [];
        }

        $teamIds = array_map(fn($r) => $r['team_id'], $results);

        return $this->createQueryBuilder('t')
            ->where('t.id IN (:ids)')
            ->setParameter('ids', $teamIds)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count qualifying teams (teams with at least one member having 5+ demos).
     *
     * Used for pagination metadata (total count, hasMore calculation).
     *
     * @return int Number of teams with at least one qualified member
     */
    public function countQualifiedTeams(): int
    {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(DISTINCT t.id)')
            ->innerJoin('t.players', 'p')
            ->where('(SELECT COUNT(tr2.id) FROM App\Domain\Trace\TraceRating tr2 WHERE tr2.playerId = p.id) >= 5')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Get aggregated TRACE score for a team (average of member 95th percentiles).
     *
     * Calculates the team's aggregated TRACE score by averaging the traceAdjusted
     * values of all qualified members (5+ demos each).
     *
     * @param string $teamId Team ID (UUID string)
     * @return float|null Aggregated TRACE score or null if no qualified members
     */
    public function getTeamAggregatedScore(string $teamId): ?float
    {
        $result = $this->createQueryBuilder('t')
            ->select('AVG(tr.traceAdjusted) as aggregated_score')
            ->innerJoin('t.players', 'p')
            ->leftJoin('App\Domain\Trace\TraceRating', 'tr', 'WITH', 'tr.playerId = p.id')
            ->where('t.id = :teamId')
            ->andWhere('(SELECT COUNT(tr2.id) FROM App\Domain\Trace\TraceRating tr2 WHERE tr2.playerId = p.id) >= 5')
            ->setParameter('teamId', $teamId)
            ->getQuery()
            ->getOneOrNullResult();

        return $result ? (float) $result['aggregated_score'] : null;
    }
}
