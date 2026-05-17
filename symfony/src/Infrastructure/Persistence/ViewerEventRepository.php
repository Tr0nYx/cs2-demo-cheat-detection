<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Demo\Demo;
use App\Domain\Viewer\DemoGrenade;
use App\Domain\Viewer\DemoHeatmap;
use App\Domain\Viewer\DemoRound;
use App\Domain\Viewer\DemoSuspiciousKill;
use Doctrine\ORM\EntityManagerInterface;

final readonly class ViewerEventRepository
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
    }

    /** @return list<array<string, mixed>> */
    public function findRoundsForDemo(Demo $demo): array
    {
        return array_map($this->round(...), $this->roundEntitiesForDemo($demo));
    }

    /** @return list<array<string, mixed>> */
    public function findGrenadesForDemo(Demo $demo, ?int $round = null, ?string $player = null): array
    {
        return array_map($this->grenade(...), $this->grenadeEntitiesForDemo($demo, $round, $player));
    }

    /** @return list<array<string, mixed>> */
    public function findKillsForDemo(Demo $demo, ?int $round = null, ?string $player = null): array
    {
        return array_map($this->kill(...), $this->killEntitiesForDemo($demo, $round, $player));
    }

    /** @return list<array<string, mixed>> */
    public function findDamageEventsForDemo(Demo $demo, ?int $round = null, ?string $player = null): array
    {
        // Extension point: add a compact damage summary entity when the parser starts emitting it.
        return [];
    }

    /** @return array<string, mixed>|null */
    public function findHeatmapReference(
        Demo $demo,
        string $heatmapType,
        ?string $playerSteamId = null,
        ?int $roundFrom = null,
        ?int $roundTo = null,
    ): ?array {
        $heatmap = $this->entityManager->createQueryBuilder()
            ->select('heatmap')
            ->from(DemoHeatmap::class, 'heatmap')
            ->andWhere('heatmap.demo = :demo')
            ->andWhere('heatmap.heatmapType = :heatmapType')
            ->andWhere('heatmap.playerSteamId '.($playerSteamId === null ? 'IS NULL' : '= :playerSteamId'))
            ->andWhere('heatmap.roundFrom '.($roundFrom === null ? 'IS NULL' : '= :roundFrom'))
            ->andWhere('heatmap.roundTo '.($roundTo === null ? 'IS NULL' : '= :roundTo'))
            ->setParameter('demo', $demo)
            ->setParameter('heatmapType', $heatmapType);

        if ($playerSteamId !== null) {
            $heatmap->setParameter('playerSteamId', $playerSteamId);
        }

        if ($roundFrom !== null) {
            $heatmap->setParameter('roundFrom', $roundFrom);
        }

        if ($roundTo !== null) {
            $heatmap->setParameter('roundTo', $roundTo);
        }

        $result = $heatmap->getQuery()->getOneOrNullResult();

        return $result instanceof DemoHeatmap ? $this->heatmap($result) : null;
    }

    /** @param array<string, mixed> $metadata */
    public function upsertHeatmapReference(
        Demo $demo,
        string $heatmapType,
        string $filePath,
        int $fileSizeBytes,
        ?string $playerSteamId = null,
        ?int $roundFrom = null,
        ?int $roundTo = null,
        array $metadata = [],
    ): DemoHeatmap {
        $heatmap = new DemoHeatmap(
            $demo,
            $heatmapType,
            $filePath,
            $fileSizeBytes,
            $playerSteamId,
            $roundFrom,
            $roundTo,
            $metadata,
        );

        $this->entityManager->persist($heatmap);
        $this->entityManager->flush();

        return $heatmap;
    }

    public function clearViewerSummaries(Demo $demo): void
    {
        foreach ([DemoSuspiciousKill::class, DemoGrenade::class, DemoRound::class] as $className) {
            $this->entityManager->createQueryBuilder()
                ->delete($className, 'summary')
                ->andWhere('summary.demo = :demo')
                ->setParameter('demo', $demo)
                ->getQuery()
                ->execute();
        }
    }

    /** @param array<string, mixed> $data */
    public function addRoundSummary(Demo $demo, array $data): void
    {
        $this->entityManager->persist(new DemoRound(
            $demo,
            (int) ($data['round_number'] ?? $data['round'] ?? 0),
            (int) ($data['start_tick'] ?? 0),
            (int) ($data['end_tick'] ?? 0),
            is_string($data['winner'] ?? null) ? $data['winner'] : null,
            is_string($data['reason'] ?? $data['end_reason'] ?? null) ? ($data['reason'] ?? $data['end_reason']) : null,
            (int) ($data['duration_ms'] ?? 0),
            (int) ($data['kills'] ?? 0),
            isset($data['first_kill_tick']) ? (int) $data['first_kill_tick'] : null,
            (bool) ($data['bomb_planted'] ?? false),
        ));
    }

    /** @param array<string, mixed> $data */
    public function addGrenadeSummary(Demo $demo, array $data): void
    {
        $start = is_array($data['start'] ?? null) ? $data['start'] : [];
        $end = is_array($data['end'] ?? null) ? $data['end'] : [];
        $thrower = is_array($data['thrower'] ?? null) ? $data['thrower'] : [];

        $this->entityManager->persist(new DemoGrenade(
            $demo,
            (int) ($data['round_number'] ?? 0),
            (int) ($data['tick'] ?? 0),
            (string) ($data['thrower_steam_id'] ?? $thrower['steam_id'] ?? ''),
            (string) ($data['type'] ?? $data['grenade_type'] ?? 'unknown'),
            (float) ($data['start_x'] ?? $start['x'] ?? 0.0),
            (float) ($data['start_y'] ?? $start['y'] ?? 0.0),
            (float) ($data['start_z'] ?? $start['z'] ?? 0.0),
            isset($data['end_x']) || isset($end['x']) ? (float) ($data['end_x'] ?? $end['x']) : null,
            isset($data['end_y']) || isset($end['y']) ? (float) ($data['end_y'] ?? $end['y']) : null,
            isset($data['end_z']) || isset($end['z']) ? (float) ($data['end_z'] ?? $end['z']) : null,
            is_array($data['trajectory'] ?? null) ? $data['trajectory'] : [],
            is_string($data['thrower_name'] ?? $thrower['name'] ?? null) ? ($data['thrower_name'] ?? $thrower['name']) : null,
            (int) ($data['time_ms'] ?? 0),
            isset($data['end_map_px']) ? (int) $data['end_map_px'] : null,
            isset($data['end_map_py']) ? (int) $data['end_map_py'] : null,
        ));
    }

    /** @param array<string, mixed> $data */
    public function addSuspiciousKillSummary(Demo $demo, array $data): void
    {
        $attacker = is_array($data['attacker'] ?? null) ? $data['attacker'] : [];
        $victim = is_array($data['victim'] ?? null) ? $data['victim'] : [];
        $signal = is_array($data['review_signal'] ?? null) ? $data['review_signal'] : [];

        $this->entityManager->persist(new DemoSuspiciousKill(
            $demo,
            (int) ($data['round_number'] ?? 0),
            (int) ($data['tick'] ?? 0),
            (string) ($data['attacker_steam_id'] ?? $attacker['steam_id'] ?? ''),
            (string) ($data['victim_steam_id'] ?? $victim['steam_id'] ?? ''),
            (float) ($data['aimbot_score'] ?? $signal['aimbot_score'] ?? $signal['suspicion_score'] ?? 0.0),
            is_array($data['flag_reasons'] ?? $signal['flag_reasons'] ?? null) ? ($data['flag_reasons'] ?? $signal['flag_reasons']) : [],
            is_string($data['weapon'] ?? null) ? $data['weapon'] : null,
            (bool) ($data['headshot'] ?? false),
            is_string($data['attacker_name'] ?? $attacker['name'] ?? null) ? ($data['attacker_name'] ?? $attacker['name']) : null,
            is_string($data['victim_name'] ?? $victim['name'] ?? null) ? ($data['victim_name'] ?? $victim['name']) : null,
            (float) ($data['snap_ratio'] ?? $signal['snap_ratio'] ?? 0.0),
            isset($data['reaction_ms']) || isset($signal['reaction_ms']) ? (int) ($data['reaction_ms'] ?? $signal['reaction_ms']) : null,
            $this->positionValue($data, $attacker, 'attacker', 'x'),
            $this->positionValue($data, $attacker, 'attacker', 'y'),
            $this->positionValue($data, $attacker, 'attacker', 'z'),
            $this->positionValue($data, $victim, 'victim', 'x'),
            $this->positionValue($data, $victim, 'victim', 'y'),
            $this->positionValue($data, $victim, 'victim', 'z'),
        ));
    }

    /** @return list<DemoRound> */
    private function roundEntitiesForDemo(Demo $demo): array
    {
        return $this->entityManager->createQueryBuilder()
            ->select('demoRound')
            ->from(DemoRound::class, 'demoRound')
            ->andWhere('demoRound.demo = :demo')
            ->setParameter('demo', $demo)
            ->orderBy('demoRound.roundNumber', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return list<DemoGrenade> */
    private function grenadeEntitiesForDemo(Demo $demo, ?int $roundNumber = null, ?string $playerSteamId = null): array
    {
        $query = $this->entityManager->createQueryBuilder()
            ->select('grenade')
            ->from(DemoGrenade::class, 'grenade')
            ->andWhere('grenade.demo = :demo')
            ->setParameter('demo', $demo)
            ->orderBy('grenade.tick', 'ASC');

        if ($roundNumber !== null) {
            $query->andWhere('grenade.roundNumber = :roundNumber')
                ->setParameter('roundNumber', $roundNumber);
        }

        if ($playerSteamId !== null) {
            $query->andWhere('grenade.throwerSteamId = :playerSteamId')
                ->setParameter('playerSteamId', $playerSteamId);
        }

        return $query->getQuery()->getResult();
    }

    /** @return list<DemoSuspiciousKill> */
    private function killEntitiesForDemo(Demo $demo, ?int $roundNumber = null, ?string $playerSteamId = null): array
    {
        $query = $this->entityManager->createQueryBuilder()
            ->select('kill')
            ->from(DemoSuspiciousKill::class, 'kill')
            ->andWhere('kill.demo = :demo')
            ->setParameter('demo', $demo)
            ->orderBy('kill.tick', 'ASC');

        if ($roundNumber !== null) {
            $query->andWhere('kill.roundNumber = :roundNumber')
                ->setParameter('roundNumber', $roundNumber);
        }

        if ($playerSteamId !== null) {
            $query->andWhere('kill.attackerSteamId = :playerSteamId OR kill.victimSteamId = :playerSteamId')
                ->setParameter('playerSteamId', $playerSteamId);
        }

        return $query->getQuery()->getResult();
    }

    /** @return array<string, mixed> */
    private function round(DemoRound $round): array
    {
        return [
            'roundNumber' => $round->getRoundNumber(),
            'startTick' => $round->getStartTick(),
            'endTick' => $round->getEndTick(),
            'winner' => $round->getWinner(),
            'reason' => $round->getEndReason(),
            'durationMs' => $round->getDurationMs(),
            'kills' => $round->getKills(),
            'firstKillTick' => $round->getFirstKillTick(),
            'bombPlanted' => $round->isBombPlanted(),
        ];
    }

    /** @return array<string, mixed> */
    private function grenade(DemoGrenade $grenade): array
    {
        return [
            'roundNumber' => $grenade->getRoundNumber(),
            'tick' => $grenade->getTick(),
            'timeMs' => $grenade->getTimeMs(),
            'thrower' => [
                'steamId' => $grenade->getThrowerSteamId(),
                'name' => $grenade->getThrowerName(),
            ],
            'type' => $grenade->getGrenadeType(),
            'start' => $grenade->getStartPosition(),
            'end' => $grenade->getEndPosition(),
            'endMapPixel' => $grenade->getEndMapPixel(),
            'trajectory' => $grenade->getTrajectory(),
        ];
    }

    /** @return array<string, mixed> */
    private function kill(DemoSuspiciousKill $kill): array
    {
        return [
            'roundNumber' => $kill->getRoundNumber(),
            'tick' => $kill->getTick(),
            'attacker' => [
                'steamId' => $kill->getAttackerSteamId(),
                'name' => $kill->getAttackerName(),
                'position' => $kill->getAttackerPosition(),
            ],
            'victim' => [
                'steamId' => $kill->getVictimSteamId(),
                'name' => $kill->getVictimName(),
                'position' => $kill->getVictimPosition(),
            ],
            'weapon' => $kill->getWeapon(),
            'headshot' => $kill->isHeadshot(),
            'reviewSignal' => [
                'aimbotScore' => $kill->getAimbotScore(),
                'snapRatio' => $kill->getSnapRatio(),
                'reactionMs' => $kill->getReactionMs(),
                'flaggedReasons' => $kill->getFlagReasons(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function heatmap(DemoHeatmap $heatmap): array
    {
        return [
            'playerSteamId' => $heatmap->getPlayerSteamId(),
            'heatmapType' => $heatmap->getHeatmapType(),
            'roundFrom' => $heatmap->getRoundFrom(),
            'roundTo' => $heatmap->getRoundTo(),
            'filePath' => $heatmap->getFilePath(),
            'fileSizeBytes' => $heatmap->getFileSizeBytes(),
            'generatedAt' => $heatmap->getGeneratedAt()->format(\DateTimeInterface::ATOM),
            'metadata' => $heatmap->getMetadata(),
        ];
    }

    /** @param array<string, mixed> $data @param array<string, mixed> $entity */
    private function positionValue(array $data, array $entity, string $prefix, string $axis): ?float
    {
        $position = is_array($entity['position'] ?? null) ? $entity['position'] : [];
        $key = $prefix.'_'.$axis;

        if (isset($data[$key])) {
            return (float) $data[$key];
        }

        return isset($position[$axis]) ? (float) $position[$axis] : null;
    }
}
