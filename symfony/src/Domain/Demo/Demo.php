<?php

declare(strict_types=1);

namespace App\Domain\Demo;

use App\Domain\Analysis\AnalysisResult;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\DemoRepository::class)]
#[ORM\Table(name: 'demo')]
#[ORM\Index(name: 'idx_demo_status', columns: ['status'])]
#[ORM\Index(name: 'idx_demo_uploaded_at', columns: ['uploaded_at'])]
#[ORM\Index(name: 'idx_demo_map', columns: ['map'])]
#[ORM\Index(name: 'idx_demo_outcome', columns: ['outcome'])]
class Demo
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'steam_match_id', length: 64, nullable: true)]
    private ?string $steamMatchId = null;

    #[ORM\Column(name: 'hltv_match_url', length: 1024, nullable: true)]
    private ?string $hltvMatchUrl = null;


    #[ORM\Column(name: 'original_filename', length: 255, nullable: true)]
    private ?string $originalFilename = null;

    #[ORM\Column(name: 'file_path', length: 1024)]
    private string $filePath;

    #[ORM\Column(name: 'storage_disk', length: 32)]
    private string $storageDisk;

    #[ORM\Column(length: 24, enumType: DemoStatus::class)]
    private DemoStatus $status;

    #[ORM\Column(name: 'uploaded_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $uploadedAt;

    #[ORM\Column(name: 'processed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $processedAt = null;

    #[ORM\Column(name: 'error_message', type: Types::TEXT, nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column(name: 'map', length: 64, nullable: true)]
    private ?string $map = null;

    #[ORM\Column(name: 'outcome', length: 16, nullable: true)]
    private ?string $outcome = null;

    /** @var Collection<int, AnalysisResult> */
    #[ORM\OneToMany(mappedBy: 'demo', targetEntity: AnalysisResult::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $analysisResults;

    public function __construct(
        string $filePath,
        string $storageDisk = 'local',
        ?string $originalFilename = null,
        ?string $steamMatchId = null,
        ?Uuid $id = null,
        ?\DateTimeImmutable $uploadedAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->filePath = $filePath;
        $this->storageDisk = $storageDisk;
        $this->originalFilename = $originalFilename;
        $this->steamMatchId = $steamMatchId;
        $this->status = DemoStatus::Uploaded;
        $this->uploadedAt = $uploadedAt ?? new \DateTimeImmutable();
        $this->analysisResults = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getIdString(): string
    {
        return $this->id->toRfc4122();
    }

    public function getSteamMatchId(): ?string
    {
        return $this->steamMatchId;
    }

    public function getHltvMatchUrl(): ?string
    {
        return $this->hltvMatchUrl;
    }

    public function setHltvMatchUrl(?string $url): void
    {
        $this->hltvMatchUrl = $url;
    }

    public function getOriginalFilename(): ?string
    {
        return $this->originalFilename;
    }

    public function getFilePath(): string
    {
        return $this->filePath;
    }

    public function getStorageDisk(): string
    {
        return $this->storageDisk;
    }

    public function getStatus(): DemoStatus
    {
        return $this->status;
    }

    public function getUploadedAt(): \DateTimeImmutable
    {
        return $this->uploadedAt;
    }

    public function getProcessedAt(): ?\DateTimeImmutable
    {
        return $this->processedAt;
    }

    public function getErrorMessage(): ?string
    {
        return $this->errorMessage;
    }

    public function getMap(): ?string
    {
        return $this->map;
    }

    public function setMap(?string $map): void
    {
        $this->map = $map;
    }

    public function getOutcome(): ?string
    {
        return $this->outcome;
    }

    public function setOutcome(?string $outcome): void
    {
        if ($outcome !== null && !in_array($outcome, ['win', 'loss', 'draw'], true)) {
            throw new \InvalidArgumentException('Outcome must be win, loss, draw, or null');
        }

        $this->outcome = $outcome;
    }

    /** @return Collection<int, AnalysisResult> */
    public function getAnalysisResults(): Collection
    {
        return $this->analysisResults;
    }

    public function markQueued(): void
    {
        $this->status = DemoStatus::Queued;
        $this->errorMessage = null;
    }

    public function markProcessing(): void
    {
        $this->status = DemoStatus::Processing;
        $this->errorMessage = null;
    }

    public function markDone(?\DateTimeImmutable $processedAt = null): void
    {
        $this->status = DemoStatus::Done;
        $this->processedAt = $processedAt ?? new \DateTimeImmutable();
        $this->errorMessage = null;
    }

    public function markError(string $message, ?\DateTimeImmutable $processedAt = null): void
    {
        $this->status = DemoStatus::Error;
        $this->processedAt = $processedAt ?? new \DateTimeImmutable();
        $this->errorMessage = $message;
    }
}
