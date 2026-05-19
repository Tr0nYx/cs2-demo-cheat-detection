<?php

declare(strict_types=1);

namespace App\Domain\Steam;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\SteamProfileSnapshotRepository::class)]
#[ORM\Table(name: 'steam_profile_snapshot')]
#[ORM\Index(name: 'idx_steam_profile_snapshot_steam_fetched', columns: ['steam_id', 'fetched_at'])]
#[ORM\Index(name: 'idx_steam_profile_snapshot_visibility', columns: ['steam_id', 'visibility_state'])]
class SteamProfileSnapshot
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** @param array<string, mixed> $rawPublicPayload */
    public function __construct(
        #[ORM\Column(name: 'steam_id', length: 64)]
        private string $steamId,
        #[ORM\Column(name: 'fetched_at', type: Types::DATETIME_IMMUTABLE)]
        private \DateTimeImmutable $fetchedAt,
        #[ORM\Column(length: 64)]
        private string $source,
        #[ORM\Column(name: 'visibility_state', length: 32)]
        private string $visibilityState,
        #[ORM\Column(name: 'persona_name', length: 255, nullable: true)]
        private ?string $personaName = null,
        #[ORM\Column(name: 'avatar_url', type: Types::TEXT, nullable: true)]
        private ?string $avatarUrl = null,
        #[ORM\Column(name: 'profile_url', type: Types::TEXT, nullable: true)]
        private ?string $profileUrl = null,
        #[ORM\Column(name: 'profile_state', nullable: true)]
        private ?int $profileState = null,
        #[ORM\Column(name: 'community_visibility_state', nullable: true)]
        private ?int $communityVisibilityState = null,
        #[ORM\Column(name: 'time_created', type: Types::DATETIME_IMMUTABLE, nullable: true)]
        private ?\DateTimeImmutable $timeCreated = null,
        #[ORM\Column(name: 'last_logoff', type: Types::DATETIME_IMMUTABLE, nullable: true)]
        private ?\DateTimeImmutable $lastLogoff = null,
        #[ORM\Column(name: 'raw_public_payload', type: Types::JSON)]
        private array $rawPublicPayload = [],
        #[ORM\Column(name: 'error_code', length: 64, nullable: true)]
        private ?string $errorCode = null,
        #[ORM\Column(name: 'error_message', type: Types::TEXT, nullable: true)]
        private ?string $errorMessage = null,
        ?Uuid $id = null,
    ) {
        $this->id = $id ?? Uuid::v7();
    }

    public static function unavailable(string $steamId, string $source, string $visibilityState, string $errorCode, ?string $errorMessage = null): self
    {
        return new self($steamId, new \DateTimeImmutable(), $source, $visibilityState, errorCode: $errorCode, errorMessage: $errorMessage);
    }

    public function getId(): Uuid { return $this->id; }
    public function getSteamId(): string { return $this->steamId; }
    public function getFetchedAt(): \DateTimeImmutable { return $this->fetchedAt; }
    public function getSource(): string { return $this->source; }
    public function getVisibilityState(): string { return $this->visibilityState; }
    public function getPersonaName(): ?string { return $this->personaName; }
    public function getAvatarUrl(): ?string { return $this->avatarUrl; }
    public function getProfileUrl(): ?string { return $this->profileUrl; }
    public function getProfileState(): ?int { return $this->profileState; }
    public function getCommunityVisibilityState(): ?int { return $this->communityVisibilityState; }
    public function getTimeCreated(): ?\DateTimeImmutable { return $this->timeCreated; }
    public function getLastLogoff(): ?\DateTimeImmutable { return $this->lastLogoff; }
    /** @return array<string, mixed> */
    public function getRawPublicPayload(): array { return $this->rawPublicPayload; }
    public function getErrorCode(): ?string { return $this->errorCode; }
    public function getErrorMessage(): ?string { return $this->errorMessage; }
}
