<?php
declare(strict_types=1);

namespace App\Domain\Import;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\SharecodeImportRepository::class)]
#[ORM\Table(name: 'sharecode_imports')]
#[ORM\UniqueConstraint(name: 'uniq_sharecode', fields: ['sharecode'])]
#[ORM\Index(name: 'idx_sharecode_imports_user_id', columns: ['user_id'])]
#[ORM\Index(name: 'idx_sharecode_imports_status', columns: ['status'])]
#[ORM\Index(name: 'idx_sharecode_imports_platform', columns: ['platform'])]
class SharecodeImport
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 24, unique: true)]
    private string $sharecode;

    #[ORM\Column(type: 'string', length: 32)]
    private string $platform; // 'steam' | 'faceit' | 'esea'

    #[ORM\Column(type: 'uuid')]
    private Uuid $userId;

    #[ORM\Column(type: 'string', length: 24)]
    private string $status; // 'pending' | 'downloading' | 'parsing' | 'complete' | 'failed'

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $importedAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column(type: 'uuid', nullable: true)]
    private ?Uuid $demoId = null;

    #[ORM\Column(type: 'integer')]
    private int $attemptCount = 0;

    public function __construct(
        string $sharecode,
        string $platform,
        Uuid $userId,
        ?Uuid $id = null,
        ?\DateTimeImmutable $importedAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->sharecode = strtoupper(trim($sharecode));
        $this->platform = strtolower($platform);
        $this->userId = $userId;
        $this->status = 'pending';
        $this->importedAt = $importedAt ?? new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSharecode(): string
    {
        return $this->sharecode;
    }

    public function getPlatform(): string
    {
        return $this->platform;
    }

    public function getUserId(): Uuid
    {
        return $this->userId;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getImportedAt(): \DateTimeImmutable
    {
        return $this->importedAt;
    }

    public function getCompletedAt(): ?\DateTimeImmutable
    {
        return $this->completedAt;
    }

    public function getErrorMessage(): ?string
    {
        return $this->errorMessage;
    }

    public function getDemoId(): ?Uuid
    {
        return $this->demoId;
    }

    public function getAttemptCount(): int
    {
        return $this->attemptCount;
    }

    public function markDownloading(): void
    {
        $this->status = 'downloading';
    }

    public function markParsing(): void
    {
        $this->status = 'parsing';
    }

    public function markComplete(Uuid $demoId): void
    {
        $this->status = 'complete';
        $this->demoId = $demoId;
        $this->completedAt = new \DateTimeImmutable();
        $this->errorMessage = null;
    }

    public function markFailed(string $errorMessage): void
    {
        $this->status = 'failed';
        $this->completedAt = new \DateTimeImmutable();
        $this->errorMessage = $errorMessage;
    }

    public function incrementAttempt(): void
    {
        $this->attemptCount++;
    }
}
