<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Leaderboard\FilteredLeaderboardDto;
use App\Application\Leaderboard\PlayerLeaderboardEntryDto;
use App\Application\Query\GetFilteredLeaderboardQuery;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;
use Psr\Log\LoggerInterface;

final readonly class GetFilteredLeaderboardHandler
{
    public function __construct(
        private Connection $connection,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(GetFilteredLeaderboardQuery $query): FilteredLeaderboardDto
    {
        $params = [
            'limit' => $query->limit,
            'offset' => $query->offset,
            'rankStart' => $query->offset,
            'rankEnd' => $query->offset + $query->limit,
        ];
        $types = [
            'limit' => Types::INTEGER,
            'offset' => Types::INTEGER,
            'rankStart' => Types::INTEGER,
            'rankEnd' => Types::INTEGER,
        ];
        $where = [];

        if ($query->map !== null) {
            $where[] = 'd.map = :map';
            $params['map'] = $query->map;
            $types['map'] = Types::STRING;
        }

        if ($query->ratingBand !== null) {
            $where[] = $this->ratingBandSql() . ' = :ratingBand';
            $params['ratingBand'] = $query->ratingBand;
            $types['ratingBand'] = Types::STRING;
        }

        if ($query->effectiveDaysBack() !== null) {
            $where[] = 'tr.calculated_at >= :cutoff';
            $params['cutoff'] = new \DateTimeImmutable(sprintf('-%d days', $query->effectiveDaysBack()));
            $types['cutoff'] = Types::DATETIME_IMMUTABLE;
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        $sql = <<<SQL
            WITH player_percentiles AS (
                SELECT
                    tr.player_id,
                    COALESCE(p.display_name, tr.player_id) AS username,
                    PERCENTILE_CONT(:percentile) WITHIN GROUP (ORDER BY tr.trace_adjusted) AS percentile_95,
                    COUNT(*) AS demo_count,
                    AVG(tr.ekill) AS ekill,
                    AVG(tr.aim) AS aim,
                    AVG(tr.kast) AS kast,
                    AVG(tr.util) AS util,
                    AVG(tr.clutch) AS clutch,
                    MAX(tr.calculated_at) AS last_analyzed_at
                FROM trace_rating tr
                INNER JOIN analysis_result ar ON ar.id = tr.analysis_result_id
                INNER JOIN demo d ON d.id = ar.demo_id
                LEFT JOIN player p ON p.steam_id = tr.player_id
                {$whereSql}
                GROUP BY tr.player_id, p.display_name
                HAVING COUNT(*) >= :minDemos
            ),
            ranked_players AS (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY percentile_95 DESC, player_id ASC) AS rank,
                    COUNT(*) OVER () AS total_count,
                    player_id,
                    username,
                    percentile_95,
                    demo_count,
                    ekill,
                    aim,
                    kast,
                    util,
                    clutch,
                    last_analyzed_at
                FROM player_percentiles
            )
            SELECT *
            FROM ranked_players
            WHERE rank > :rankStart AND rank <= :rankEnd
            ORDER BY rank ASC
            SQL;

        $params['percentile'] = GetFilteredLeaderboardQuery::PERCENTILE_THRESHOLD;
        $params['minDemos'] = GetFilteredLeaderboardQuery::MIN_DEMO_QUALIFICATION;
        $types['percentile'] = Types::FLOAT;
        $types['minDemos'] = Types::INTEGER;

        $rows = $this->connection->executeQuery($sql, $params, $types)->fetchAllAssociative();
        $total = isset($rows[0]['total_count']) ? (int) $rows[0]['total_count'] : 0;

        $players = array_map(
            fn(array $row): PlayerLeaderboardEntryDto => new PlayerLeaderboardEntryDto(
                rank: (int) $row['rank'],
                playerId: (string) $row['player_id'],
                username: (string) $row['username'],
                avatar: null,
                percentile95: round((float) $row['percentile_95'], 4),
                demoCount: (int) $row['demo_count'],
                components: [
                    'ekill' => round((float) $row['ekill'], 4),
                    'aim' => round((float) $row['aim'], 4),
                    'kast' => round((float) $row['kast'], 4),
                    'util' => round((float) $row['util'], 4),
                    'clutch' => round((float) $row['clutch'], 4),
                ],
                lastAnalyzedAt: $this->formatTimestamp($row['last_analyzed_at']),
            ),
            $rows
        );

        $this->logger->info('Filtered leaderboard queried', [
            'map' => $query->map,
            'ratingBand' => $query->ratingBand,
            'daysBack' => $query->effectiveDaysBack(),
            'limit' => $query->limit,
            'offset' => $query->offset,
            'total' => $total,
            'returned' => count($players),
        ]);

        return new FilteredLeaderboardDto(
            players: $players,
            total: $total,
            hasMore: ($query->offset + $query->limit) < $total,
        );
    }

    private function ratingBandSql(): string
    {
        return <<<'SQL'
            CASE
                WHEN tr.trace_adjusted < 0.33 THEN '0-5'
                WHEN tr.trace_adjusted < 0.67 THEN '5-10'
                ELSE '10+'
            END
            SQL;
    }

    private function formatTimestamp(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('c');
        }

        return (new \DateTimeImmutable((string) $value))->format('c');
    }
}
