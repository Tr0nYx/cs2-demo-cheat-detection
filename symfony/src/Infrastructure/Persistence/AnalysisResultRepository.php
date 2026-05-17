<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<AnalysisResult> */
final class AnalysisResultRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AnalysisResult::class);
    }

    public function save(AnalysisResult $result, bool $flush = true): void
    {
        $this->getEntityManager()->persist($result);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** @return list<AnalysisResult> */
    public function newestForSteamId(string $steamId, int $limit = 20, int $offset = 0): array
    {
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);

        return $this->createQueryBuilder('result')
            ->join('result.player', 'player')
            ->andWhere('player.steamId = :steamId')
            ->setParameter('steamId', $steamId)
            ->orderBy('result.analyzedAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function findByDemoIdAndUserId(string $demoId, string $steamId): ?AnalysisResult
    {
        return $this->createQueryBuilder('result')
            ->join('result.demo', 'demo')
            ->join('result.player', 'player')
            ->andWhere('demo.id = :demoId')
            ->andWhere('player.steamId = :steamId')
            ->setParameter('demoId', $demoId)
            ->setParameter('steamId', $steamId)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** @param array<string, mixed> $featureData @param array<string, mixed> $supportData */
    public function upsertForDemoAndPlayer(
        Demo $demo,
        Player $player,
        int $roundCount,
        float $aimbotScore,
        float $wallhackScore,
        float $triggerbotScore,
        float $recoilScore,
        float $bhopScore,
        float $sessionConsistencyScore,
        float $overallSuspicion,
        SuspicionLabel $suspicionLabel,
        array $featureData = [],
        array $supportData = [],
        ?\DateTimeImmutable $analyzedAt = null,
    ): AnalysisResult {
        $result = $this->findOneBy(['demo' => $demo, 'player' => $player]);

        if ($result instanceof AnalysisResult) {
            $result->replaceScores($roundCount, $aimbotScore, $wallhackScore, $triggerbotScore, $recoilScore, $bhopScore, $sessionConsistencyScore, $overallSuspicion, $suspicionLabel, $featureData, $supportData, $analyzedAt);

            return $result;
        }

        $result = new AnalysisResult($demo, $player, $roundCount, $aimbotScore, $wallhackScore, $triggerbotScore, $recoilScore, $bhopScore, $sessionConsistencyScore, $overallSuspicion, $suspicionLabel, $featureData, $supportData, analyzedAt: $analyzedAt);
        $this->getEntityManager()->persist($result);

        return $result;
    }

    /**
     * Find demos where both players participated together.
     *
     * Returns distinct Demo entities where both specified players have AnalysisResult records.
     * Used for match history comparison view to show shared gameplay history.
     *
     * @param string $playerAId ID of first player
     * @param string $playerBId ID of second player
     * @param int $limit Maximum number of demos to return (default 10)
     * @return array<Demo> Array of demos with both players
     */
    public function findSharedByPlayers(
        string $playerAId,
        string $playerBId,
        int $limit = 10
    ): array {
        return $this->createQueryBuilder('arA')
            ->select('DISTINCT d')
            ->from(Demo::class, 'd')
            ->innerJoin('d.analysisResults', 'arA')
            ->innerJoin('d.analysisResults', 'arB')
            ->where('arA.player = :playerA')
            ->andWhere('arB.player = :playerB')
            ->setParameter('playerA', $playerAId)
            ->setParameter('playerB', $playerBId)
            ->orderBy('d.uploadedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
