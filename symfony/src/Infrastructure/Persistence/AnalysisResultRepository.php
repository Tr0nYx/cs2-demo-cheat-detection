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
}
