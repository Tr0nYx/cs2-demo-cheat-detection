<?php

declare(strict_types=1);

namespace App\Domain\Viewer;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'demo_heatmap')]
#[ORM\UniqueConstraint(name: 'uniq_demo_heatmap_lookup', columns: ['demo_id', 'player_steam_id', 'heatmap_type', 'round_from', 'round_to'])]
#[ORM\Index(name: 'idx_demo_heatmap_demo_type', columns: ['demo_id', 'heatmap_type'])]
class DemoHeatmap
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Demo::class)]
    #[ORM\JoinColumn(name: 'demo_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Demo $demo;

    #[ORM\Column(name: 'player_steam_id', length: 32, nullable: true)]
    private ?string $playerSteamId;

    #[ORM\Column(name: 'heatmap_type', length: 32)]
    private string $heatmapType;

    #[ORM\Column(name: 'round_from', nullable: true)]
    private ?int $roundFrom;

    #[ORM\Column(name: 'round_to', nullable: true)]
    private ?int $roundTo;

    #[ORM\Column(name: 'file_path', length: 1024)]
    private string $filePath;

    #[ORM\Column(name: 'file_size_bytes')]
    private int $fileSizeBytes;

    /** @var array<string, mixed> */
    #[ORM\Column(type: Types::JSON)]
    private array $metadata;

    #[ORM\Column(name: 'generated_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $generatedAt;

    /** @param array<string, mixed> $metadata */
    public function __construct(
        Demo $demo,
        string $heatmapType,
        string $filePath,
        int $fileSizeBytes,
        ?string $playerSteamId = null,
        ?int $roundFrom = null,
        ?int $roundTo = null,
        array $metadata = [],
        ?Uuid $id = null,
        ?\DateTimeImmutable $generatedAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->demo = $demo;
        $this->playerSteamId = $playerSteamId;
        $this->heatmapType = $heatmapType;
        $this->roundFrom = $roundFrom;
        $this->roundTo = $roundTo;
        $this->filePath = $filePath;
        $this->fileSizeBytes = $fileSizeBytes;
        $this->metadata = $metadata;
        $this->generatedAt = $generatedAt ?? new \DateTimeImmutable();
    }

    public function getPlayerSteamId(): ?string
    {
        return $this->playerSteamId;
    }

    public function getHeatmapType(): string
    {
        return $this->heatmapType;
    }

    public function getRoundFrom(): ?int
    {
        return $this->roundFrom;
    }

    public function getRoundTo(): ?int
    {
        return $this->roundTo;
    }

    public function getFilePath(): string
    {
        return $this->filePath;
    }

    public function getFileSizeBytes(): int
    {
        return $this->fileSizeBytes;
    }

    /** @return array<string, mixed> */
    public function getMetadata(): array
    {
        return $this->metadata;
    }

    public function getGeneratedAt(): \DateTimeImmutable
    {
        return $this->generatedAt;
    }
}
