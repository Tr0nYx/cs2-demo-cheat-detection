<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class SteamPlayerProfileDto
{
    public function __construct(
        public string $steamId,
        public ?string $personaName,
        public ?string $avatarUrl,
        public ?string $profileUrl,
        public string $visibilityState,
        public \DateTimeImmutable $lastRefreshedAt,
    ) {
    }

    /** @return array<string, string|null> */
    public function toArray(): array
    {
        return [
            'steam_id' => $this->steamId,
            'persona_name' => $this->personaName,
            'avatar_url' => $this->avatarUrl,
            'profile_url' => $this->profileUrl,
            'visibility_state' => $this->visibilityState,
            'last_refreshed_at' => $this->lastRefreshedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
