<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Analysis\AnalysisResult;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<AnalysisResult> */
final class PlayerStatsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AnalysisResult::class);
    }

    public function countDemos(string $steamId, ?\DateTimeImmutable $since): int
    {
        $qb = $this->createQueryBuilder('result')
            ->select('COUNT(DISTINCT demo.id)')
            ->join('result.player', 'player')
            ->join('result.demo', 'demo')
            ->andWhere('player.steamId = :steamId')
            ->setParameter('steamId', $steamId);

        if ($since !== null) {
            $qb->andWhere('result.analyzedAt >= :since')
                ->setParameter('since', $since, Types::DATETIME_IMMUTABLE);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * @return list<array{map: string, demoCount: int, winRate: float|null, averageTraceScore: float|null}>
     */
    public function getMapAffinity(string $steamId, ?\DateTimeImmutable $since, int $limit = 3): array
    {
        $qb = $this->createQueryBuilder('result')
            ->select('demo.map AS map')
            ->addSelect('COUNT(DISTINCT demo.id) AS demoCount')
            ->addSelect("SUM(CASE WHEN demo.outcome = 'win' THEN 1 ELSE 0 END) AS wins")
            ->addSelect('AVG(trace.traceAdjusted) AS averageTraceScore')
            ->join('result.player', 'player')
            ->join('result.demo', 'demo')
            ->leftJoin('App\Domain\Trace\TraceRating', 'trace', 'WITH', 'trace.analysisResult = result')
            ->andWhere('player.steamId = :steamId')
            ->andWhere('demo.map IS NOT NULL')
            ->setParameter('steamId', $steamId)
            ->groupBy('demo.map')
            ->orderBy('demoCount', 'DESC')
            ->addOrderBy('averageTraceScore', 'DESC')
            ->setMaxResults($limit);

        if ($since !== null) {
            $qb->andWhere('result.analyzedAt >= :since')
                ->setParameter('since', $since, Types::DATETIME_IMMUTABLE);
        }

        $rows = $qb->getQuery()->getArrayResult();

        return array_map(static function (array $row): array {
            $demoCount = (int) $row['demoCount'];

            return [
                'map' => (string) $row['map'],
                'demoCount' => $demoCount,
                'winRate' => $demoCount > 0 ? round(((int) $row['wins']) / $demoCount, 4) : null,
                'averageTraceScore' => $row['averageTraceScore'] !== null ? round((float) $row['averageTraceScore'], 4) : null,
            ];
        }, $rows);
    }

    /**
     * @return list<array{weapon: string, category: string, usageCount: int, killCount: int, killRate: float|null}>
     */
    public function getWeaponStats(string $steamId, ?\DateTimeImmutable $since, int $limit = 8): array
    {
        $qb = $this->createQueryBuilder('result')
            ->join('result.player', 'player')
            ->andWhere('player.steamId = :steamId')
            ->setParameter('steamId', $steamId)
            ->orderBy('result.analyzedAt', 'DESC');

        if ($since !== null) {
            $qb->andWhere('result.analyzedAt >= :since')
                ->setParameter('since', $since, Types::DATETIME_IMMUTABLE);
        }

        /** @var list<AnalysisResult> $results */
        $results = $qb->getQuery()->getResult();
        $weapons = [];

        foreach ($results as $result) {
            foreach ($this->extractWeaponRows($result->getFeatureData()) as $row) {
                $weapon = $this->normalizeWeaponName($row['weapon']);
                if ($weapon === '') {
                    continue;
                }

                $weapons[$weapon] ??= [
                    'weapon' => $weapon,
                    'category' => $this->weaponCategory($weapon),
                    'usageCount' => 0,
                    'killCount' => 0,
                ];
                $weapons[$weapon]['usageCount'] += max(0, $row['usage']);
                $weapons[$weapon]['killCount'] += max(0, $row['kills']);
            }
        }

        uasort($weapons, static fn(array $a, array $b): int => [$b['usageCount'], $b['killCount']] <=> [$a['usageCount'], $a['killCount']]);

        return array_map(static function (array $row): array {
            return [
                'weapon' => $row['weapon'],
                'category' => $row['category'],
                'usageCount' => $row['usageCount'],
                'killCount' => $row['killCount'],
                'killRate' => $row['usageCount'] > 0 ? round($row['killCount'] / $row['usageCount'], 4) : null,
            ];
        }, array_slice(array_values($weapons), 0, $limit));
    }

    /**
     * @param array<string, mixed> $featureData
     * @return list<array{weapon: string, usage: int, kills: int}>
     */
    private function extractWeaponRows(array $featureData): array
    {
        $rows = [];
        $candidates = [
            $featureData['weapon_stats'] ?? null,
            $featureData['weapons'] ?? null,
            $featureData['WeaponStatsExtractor']['raw_measurements']['weapons'] ?? null,
            $featureData['RecoilExtractor']['raw_measurements']['weapon_stats'] ?? null,
            $featureData['AimbotExtractor']['raw_measurements']['weapon_stats'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (!\is_array($candidate)) {
                continue;
            }

            foreach ($candidate as $key => $value) {
                if (\is_array($value)) {
                    $weapon = \is_string($key) ? $key : (string) ($value['weapon'] ?? $value['name'] ?? '');
                    $rows[] = [
                        'weapon' => $weapon,
                        'usage' => (int) ($value['usage_count'] ?? $value['shots'] ?? $value['events'] ?? $value['count'] ?? 0),
                        'kills' => (int) ($value['kills'] ?? $value['kill_count'] ?? 0),
                    ];
                } elseif (\is_numeric($value) && \is_string($key)) {
                    $rows[] = ['weapon' => $key, 'usage' => (int) $value, 'kills' => 0];
                }
            }
        }

        return $rows;
    }

    private function normalizeWeaponName(string $weapon): string
    {
        return strtolower(trim(str_replace('weapon_', '', $weapon)));
    }

    private function weaponCategory(string $weapon): string
    {
        return match (true) {
            \in_array($weapon, ['ak47', 'm4a1', 'm4a1_silencer', 'm4a4', 'galilar', 'famas', 'sg556', 'aug'], true) => 'rifle',
            \in_array($weapon, ['awp', 'ssg08', 'scar20', 'g3sg1'], true) => 'sniper',
            \in_array($weapon, ['mac10', 'mp9', 'mp7', 'mp5sd', 'ump45', 'p90', 'bizon'], true) => 'smg',
            \in_array($weapon, ['hegrenade', 'molotov', 'incgrenade', 'flashbang', 'smokegrenade', 'decoy'], true) => 'utility',
            default => 'other',
        };
    }
}
