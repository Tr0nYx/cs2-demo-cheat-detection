<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Player\Player;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\SteamInventorySnapshotRepository;
use App\Infrastructure\Persistence\SteamProfileSnapshotRepository;

final readonly class SteamProfileRefreshPlanner
{
    public function __construct(
        private PlayerRepository $players,
        private SteamProfileSnapshotRepository $profiles,
        private SteamInventorySnapshotRepository $inventories,
    ) {
    }

    /** @return list<SteamProfileRefreshCandidate> */
    public function candidates(int $limit = 100, ?string $tier = null, ?\DateTimeImmutable $now = null): array
    {
        $now ??= new \DateTimeImmutable();
        $candidates = [];

        foreach ($this->players->findAll() as $player) {
            if (!$player instanceof Player || str_starts_with($player->getSteamId(), 'HLTV_')) {
                continue;
            }

            $candidate = $this->candidateFor($player->getSteamId(), $now);
            if ($tier !== null && $candidate->tier !== $tier) {
                continue;
            }

            $candidates[] = $candidate;
        }

        usort($candidates, static fn (SteamProfileRefreshCandidate $a, SteamProfileRefreshCandidate $b): int => self::priority($a->tier) <=> self::priority($b->tier));

        return array_slice($candidates, 0, $limit);
    }

    public function candidateFor(string $steamId, ?\DateTimeImmutable $now = null): SteamProfileRefreshCandidate
    {
        $now ??= new \DateTimeImmutable();
        $profile = $this->profiles->latestForSteamId($steamId);
        $inventory = $this->inventories->latestForSteamId($steamId);
        $latest = $profile?->getFetchedAt();
        if ($inventory !== null && ($latest === null || $inventory->getFetchedAt() > $latest)) {
            $latest = $inventory->getFetchedAt();
        }

        if ($latest === null) {
            return new SteamProfileRefreshCandidate($steamId, 'new', 'no_snapshot');
        }

        if ($profile?->getErrorCode() !== null || $inventory?->getErrorCode() !== null) {
            $age = $now->getTimestamp() - $latest->getTimestamp();
            return $age > 86400 ? new SteamProfileRefreshCandidate($steamId, 'backoff', 'retry_after_error') : new SteamProfileRefreshCandidate($steamId, 'inactive', 'recent_error_backoff');
        }

        $ageDays = (int) floor(($now->getTimestamp() - $latest->getTimestamp()) / 86400);
        if ($ageDays >= 30) {
            return new SteamProfileRefreshCandidate($steamId, 'stale', 'snapshot_older_than_30d');
        }
        if ($ageDays >= 7) {
            return new SteamProfileRefreshCandidate($steamId, 'active', 'snapshot_older_than_7d');
        }

        return new SteamProfileRefreshCandidate($steamId, 'inactive', 'snapshot_fresh');
    }

    private static function priority(string $tier): int
    {
        return match ($tier) {
            'new' => 0,
            'active' => 1,
            'stale' => 2,
            'backoff' => 3,
            default => 4,
        };
    }
}
