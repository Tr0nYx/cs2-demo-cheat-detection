<?php

declare(strict_types=1);

namespace App\Domain\Steam;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository::class)]
#[ORM\Table(name: 'steam_match_history_connection')]
#[ORM\Index(name: 'idx_match_history_user', columns: ['user_id'])]
#[ORM\Index(name: 'idx_match_history_steam', columns: ['steam_id'])]
#[ORM\Index(name: 'idx_match_history_status', columns: ['status'])]
#[ORM\Index(name: 'idx_match_history_next_check', columns: ['next_check_at'])]
class SteamMatchHistoryConnection
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_CAUGHT_UP = 'caught_up';
    public const STATUS_INVALID_SEED = 'invalid_seed';
    public const STATUS_AUTH_FAILED = 'auth_failed';
    public const STATUS_RATE_LIMITED = 'rate_limited';
    public const STATUS_STEAM_UNAVAILABLE = 'steam_unavailable';
    public const STATUS_DISCONNECTED = 'disconnected';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'uuid')]
    private Uuid $userId;

    #[ORM\Column(type: 'string', length: 32)]
    private string $steamId;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $encryptedSteamIdKey;

    #[ORM\Column(type: 'string', length: 96, nullable: true)]
    private ?string $credentialFingerprint;

    #[ORM\Column(type: 'string', length: 34)]
    private string $seedSharecode;

    #[ORM\Column(type: 'string', length: 34)]
    private string $knownSharecode;

    #[ORM\Column(type: 'string', length: 32)]
    private string $status;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $connectedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $disconnectedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastCheckAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $nextCheckAt = null;

    #[ORM\Column(type: 'string', length: 64, nullable: true)]
    private ?string $lastErrorCode = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $lastErrorMessage = null;

    #[ORM\Column(type: 'integer')]
    private int $consecutiveFailures = 0;

    #[ORM\Column(type: 'integer')]
    private int $discoveredCount = 0;

    #[ORM\Column(type: 'integer')]
    private int $queuedCount = 0;

    #[ORM\Column(type: 'integer')]
    private int $importedCount = 0;

    public function __construct(
        Uuid $userId,
        string $steamId,
        string $encryptedSteamIdKey,
        string $credentialFingerprint,
        string $seedSharecode,
        ?Uuid $id = null,
        ?\DateTimeImmutable $now = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->userId = $userId;
        $this->steamId = $steamId;
        $this->connectedAt = $now ?? new \DateTimeImmutable();
        $this->connect($encryptedSteamIdKey, $credentialFingerprint, $seedSharecode, $this->connectedAt);
    }

    public function connect(string $encryptedSteamIdKey, string $credentialFingerprint, string $seedSharecode, ?\DateTimeImmutable $now = null): void
    {
        $now ??= new \DateTimeImmutable();
        $this->encryptedSteamIdKey = $encryptedSteamIdKey;
        $this->credentialFingerprint = $credentialFingerprint;
        $this->seedSharecode = $seedSharecode;
        $this->knownSharecode = $seedSharecode;
        $this->status = self::STATUS_ACTIVE;
        $this->connectedAt = $this->disconnectedAt === null ? $this->connectedAt : $now;
        $this->disconnectedAt = null;
        $this->lastCheckAt = null;
        $this->nextCheckAt = $now;
        $this->lastErrorCode = null;
        $this->lastErrorMessage = null;
        $this->consecutiveFailures = 0;
    }

    public function advanceCursor(string $nextSharecode, bool $queued, ?\DateTimeImmutable $now = null): void
    {
        $this->knownSharecode = $nextSharecode;
        $this->status = self::STATUS_ACTIVE;
        $this->lastCheckAt = $now ?? new \DateTimeImmutable();
        $this->nextCheckAt = $this->lastCheckAt;
        $this->lastErrorCode = null;
        $this->lastErrorMessage = null;
        $this->consecutiveFailures = 0;
        $this->discoveredCount++;
        if ($queued) {
            $this->queuedCount++;
        }
    }

    public function markCaughtUp(\DateTimeImmutable $nextCheckAt, ?\DateTimeImmutable $now = null): void
    {
        $this->status = self::STATUS_CAUGHT_UP;
        $this->lastCheckAt = $now ?? new \DateTimeImmutable();
        $this->nextCheckAt = $nextCheckAt;
        $this->lastErrorCode = null;
        $this->lastErrorMessage = null;
        $this->consecutiveFailures = 0;
    }

    public function scheduleNextActiveCheck(\DateTimeImmutable $nextCheckAt, ?\DateTimeImmutable $now = null): void
    {
        $this->status = self::STATUS_ACTIVE;
        $this->lastCheckAt = $now ?? new \DateTimeImmutable();
        $this->nextCheckAt = $nextCheckAt;
        $this->lastErrorCode = null;
        $this->lastErrorMessage = null;
        $this->consecutiveFailures = 0;
    }

    public function markFailed(string $status, string $errorCode, ?string $errorMessage, ?\DateTimeImmutable $nextCheckAt, ?\DateTimeImmutable $now = null): void
    {
        if (!in_array($status, [self::STATUS_INVALID_SEED, self::STATUS_AUTH_FAILED, self::STATUS_RATE_LIMITED, self::STATUS_STEAM_UNAVAILABLE], true)) {
            throw new \InvalidArgumentException(sprintf('Unsupported match-history failure status "%s".', $status));
        }

        $this->status = $status;
        $this->lastCheckAt = $now ?? new \DateTimeImmutable();
        $this->nextCheckAt = $nextCheckAt;
        $this->lastErrorCode = $errorCode;
        $this->lastErrorMessage = $errorMessage;
        $this->consecutiveFailures++;
    }

    public function disconnect(?\DateTimeImmutable $now = null): void
    {
        $this->status = self::STATUS_DISCONNECTED;
        $this->encryptedSteamIdKey = null;
        $this->credentialFingerprint = null;
        $this->nextCheckAt = null;
        $this->disconnectedAt = $now ?? new \DateTimeImmutable();
    }

    public function incrementImportedCount(): void { $this->importedCount++; }

    public function getId(): Uuid { return $this->id; }
    public function getUserId(): Uuid { return $this->userId; }
    public function getSteamId(): string { return $this->steamId; }
    public function getEncryptedSteamIdKey(): ?string { return $this->encryptedSteamIdKey; }
    public function getCredentialFingerprint(): ?string { return $this->credentialFingerprint; }
    public function getSeedSharecode(): string { return $this->seedSharecode; }
    public function getKnownSharecode(): string { return $this->knownSharecode; }
    public function getStatus(): string { return $this->status; }
    public function getConnectedAt(): \DateTimeImmutable { return $this->connectedAt; }
    public function getDisconnectedAt(): ?\DateTimeImmutable { return $this->disconnectedAt; }
    public function getLastCheckAt(): ?\DateTimeImmutable { return $this->lastCheckAt; }
    public function getNextCheckAt(): ?\DateTimeImmutable { return $this->nextCheckAt; }
    public function getLastErrorCode(): ?string { return $this->lastErrorCode; }
    public function getLastErrorMessage(): ?string { return $this->lastErrorMessage; }
    public function getConsecutiveFailures(): int { return $this->consecutiveFailures; }
    public function getDiscoveredCount(): int { return $this->discoveredCount; }
    public function getQueuedCount(): int { return $this->queuedCount; }
    public function getImportedCount(): int { return $this->importedCount; }
}
