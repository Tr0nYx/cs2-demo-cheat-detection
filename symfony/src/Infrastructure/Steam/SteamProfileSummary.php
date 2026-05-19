<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

final readonly class SteamProfileSummary
{
    /** @param array<string, mixed> $raw */
    public function __construct(
        public string $steamId,
        public string $visibilityState,
        public ?string $personaName = null,
        public ?string $avatarUrl = null,
        public ?string $profileUrl = null,
        public ?int $profileState = null,
        public ?int $communityVisibilityState = null,
        public ?\DateTimeImmutable $timeCreated = null,
        public ?\DateTimeImmutable $lastLogoff = null,
        public array $raw = [],
        public ?string $errorCode = null,
        public ?string $errorMessage = null,
    ) {
    }
}
