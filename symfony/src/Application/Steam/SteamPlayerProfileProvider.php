<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Infrastructure\Persistence\SteamProfileSnapshotRepository;

final readonly class SteamPlayerProfileProvider
{
    public function __construct(
        private SteamProfileSnapshotRepository $profiles,
    ) {
    }

    public function forSteamId(string $steamId): ?SteamPlayerProfileDto
    {
        $snapshot = $this->profiles->latestForSteamId($steamId);
        if ($snapshot === null) {
            return null;
        }

        return new SteamPlayerProfileDto(
            steamId: $snapshot->getSteamId(),
            personaName: $snapshot->getPersonaName(),
            avatarUrl: $snapshot->getAvatarUrl(),
            profileUrl: $snapshot->getProfileUrl(),
            visibilityState: $snapshot->getVisibilityState(),
            lastRefreshedAt: $snapshot->getFetchedAt(),
        );
    }
}
