<?php

declare(strict_types=1);

namespace App\Domain\Viewer;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'demo_grenade')]
#[ORM\Index(name: 'idx_demo_grenade_demo_round', columns: ['demo_id', 'round_number'])]
#[ORM\Index(name: 'idx_demo_grenade_demo_tick', columns: ['demo_id', 'tick'])]
class DemoGrenade
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Demo::class)]
    #[ORM\JoinColumn(name: 'demo_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Demo $demo;

    #[ORM\Column(name: 'round_number')]
    private int $roundNumber;

    #[ORM\Column]
    private int $tick;

    #[ORM\Column(name: 'time_ms')]
    private int $timeMs;

    #[ORM\Column(name: 'thrower_steam_id', length: 32)]
    private string $throwerSteamId;

    #[ORM\Column(name: 'thrower_name', length: 255, nullable: true)]
    private ?string $throwerName;

    #[ORM\Column(name: 'grenade_type', length: 32)]
    private string $grenadeType;

    #[ORM\Column(name: 'start_x')]
    private float $startX;

    #[ORM\Column(name: 'start_y')]
    private float $startY;

    #[ORM\Column(name: 'start_z')]
    private float $startZ;

    #[ORM\Column(name: 'end_x', nullable: true)]
    private ?float $endX;

    #[ORM\Column(name: 'end_y', nullable: true)]
    private ?float $endY;

    #[ORM\Column(name: 'end_z', nullable: true)]
    private ?float $endZ;

    #[ORM\Column(name: 'end_map_px', nullable: true)]
    private ?int $endMapPx;

    #[ORM\Column(name: 'end_map_py', nullable: true)]
    private ?int $endMapPy;

    /** @var list<array{x: float, y: float, z?: float, tick?: int}> */
    #[ORM\Column(type: Types::JSON)]
    private array $trajectory;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @param list<array{x: float, y: float, z?: float, tick?: int}> $trajectory */
    public function __construct(
        Demo $demo,
        int $roundNumber,
        int $tick,
        string $throwerSteamId,
        string $grenadeType,
        float $startX,
        float $startY,
        float $startZ,
        ?float $endX = null,
        ?float $endY = null,
        ?float $endZ = null,
        array $trajectory = [],
        ?string $throwerName = null,
        int $timeMs = 0,
        ?int $endMapPx = null,
        ?int $endMapPy = null,
        ?Uuid $id = null,
        ?\DateTimeImmutable $createdAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->demo = $demo;
        $this->roundNumber = $roundNumber;
        $this->tick = $tick;
        $this->timeMs = $timeMs;
        $this->throwerSteamId = $throwerSteamId;
        $this->throwerName = $throwerName;
        $this->grenadeType = $grenadeType;
        $this->startX = $startX;
        $this->startY = $startY;
        $this->startZ = $startZ;
        $this->endX = $endX;
        $this->endY = $endY;
        $this->endZ = $endZ;
        $this->endMapPx = $endMapPx;
        $this->endMapPy = $endMapPy;
        $this->trajectory = $trajectory;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getRoundNumber(): int
    {
        return $this->roundNumber;
    }

    public function getTick(): int
    {
        return $this->tick;
    }

    public function getTimeMs(): int
    {
        return $this->timeMs;
    }

    public function getThrowerSteamId(): string
    {
        return $this->throwerSteamId;
    }

    public function getThrowerName(): ?string
    {
        return $this->throwerName;
    }

    public function getGrenadeType(): string
    {
        return $this->grenadeType;
    }

    /** @return array{x: float, y: float, z: float} */
    public function getStartPosition(): array
    {
        return ['x' => $this->startX, 'y' => $this->startY, 'z' => $this->startZ];
    }

    /** @return array{x: float|null, y: float|null, z: float|null} */
    public function getEndPosition(): array
    {
        return ['x' => $this->endX, 'y' => $this->endY, 'z' => $this->endZ];
    }

    /** @return list<array{x: float, y: float, z?: float, tick?: int}> */
    public function getTrajectory(): array
    {
        return $this->trajectory;
    }

    /** @return array{x: int|null, y: int|null} */
    public function getEndMapPixel(): array
    {
        return ['x' => $this->endMapPx, 'y' => $this->endMapPy];
    }
}
