<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Infrastructure\Persistence\SteamInventorySnapshotRepository;
use App\Infrastructure\Persistence\SteamProfileSnapshotRepository;

final readonly class SteamExternalSignalResearchService
{
    public function __construct(
        private SteamProfileSnapshotRepository $profiles,
        private SteamInventorySnapshotRepository $inventories,
    ) {
    }

    public function shadowForSteamId(string $steamId, ?\DateTimeImmutable $now = null): SteamExternalSignalShadowDto
    {
        $now ??= new \DateTimeImmutable();
        $profile = $this->profiles->latestForSteamId($steamId);
        $inventory = $this->inventories->latestForSteamId($steamId);
        $flags = [];

        if ($profile === null) {
            $flags[] = 'profile_missing';
        } elseif ($profile->getErrorCode() !== null) {
            $flags[] = 'profile_error';
        } elseif ($profile->getTimeCreated() === null) {
            $flags[] = 'account_age_missing';
        }

        if ($inventory === null) {
            $flags[] = 'inventory_missing';
        } elseif ($inventory->getErrorCode() !== null) {
            $flags[] = 'inventory_error';
        } elseif ($inventory->getEstimatedValue() === null) {
            $flags[] = 'inventory_value_missing';
        }

        return new SteamExternalSignalShadowDto(
            steamId: $steamId,
            inventoryEstimatedValue: $inventory?->getEstimatedValue(),
            inventoryEstimatedCurrency: $inventory?->getEstimatedCurrency(),
            accountAgeDays: $profile?->getTimeCreated() !== null ? self::ageDays($profile->getTimeCreated(), $now) : null,
            profileVisibilityState: $profile?->getVisibilityState(),
            inventoryVisibilityState: $inventory?->getVisibilityState(),
            profileSnapshotAgeDays: $profile !== null ? self::ageDays($profile->getFetchedAt(), $now) : null,
            inventorySnapshotAgeDays: $inventory !== null ? self::ageDays($inventory->getFetchedAt(), $now) : null,
            coverageFlags: $flags,
        );
    }

    /** @param list<string> $steamIds @return list<SteamExternalSignalShadowDto> */
    public function shadowForSteamIds(array $steamIds, ?\DateTimeImmutable $now = null): array
    {
        $now ??= new \DateTimeImmutable();

        return array_map(fn (string $steamId): SteamExternalSignalShadowDto => $this->shadowForSteamId($steamId, $now), array_values(array_unique($steamIds)));
    }

    private static function ageDays(\DateTimeImmutable $then, \DateTimeImmutable $now): int
    {
        return max(0, (int) floor(($now->getTimestamp() - $then->getTimestamp()) / 86400));
    }
}
