<?php

declare(strict_types=1);

namespace App\Domain\Viewer;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'demo_suspicious_kill')]
#[ORM\Index(name: 'idx_demo_suspicious_kill_demo_round', columns: ['demo_id', 'round_number'])]
#[ORM\Index(name: 'idx_demo_suspicious_kill_demo_tick', columns: ['demo_id', 'tick'])]
class DemoSuspiciousKill
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

    #[ORM\Column(name: 'attacker_steam_id', length: 32)]
    private string $attackerSteamId;

    #[ORM\Column(name: 'victim_steam_id', length: 32)]
    private string $victimSteamId;

    #[ORM\Column(name: 'attacker_name', length: 255, nullable: true)]
    private ?string $attackerName;

    #[ORM\Column(name: 'victim_name', length: 255, nullable: true)]
    private ?string $victimName;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $weapon;

    #[ORM\Column(name: 'attacker_x', nullable: true)]
    private ?float $attackerX;

    #[ORM\Column(name: 'attacker_y', nullable: true)]
    private ?float $attackerY;

    #[ORM\Column(name: 'attacker_z', nullable: true)]
    private ?float $attackerZ;

    #[ORM\Column(name: 'victim_x', nullable: true)]
    private ?float $victimX;

    #[ORM\Column(name: 'victim_y', nullable: true)]
    private ?float $victimY;

    #[ORM\Column(name: 'victim_z', nullable: true)]
    private ?float $victimZ;

    #[ORM\Column(name: 'headshot')]
    private bool $headshot;

    #[ORM\Column(name: 'aimbot_score')]
    private float $aimbotScore;

    #[ORM\Column(name: 'snap_ratio')]
    private float $snapRatio;

    #[ORM\Column(name: 'reaction_ms', nullable: true)]
    private ?int $reactionMs;

    /** @var list<string> */
    #[ORM\Column(name: 'flag_reasons', type: Types::JSON)]
    private array $flagReasons;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @param list<string> $flagReasons */
    public function __construct(
        Demo $demo,
        int $roundNumber,
        int $tick,
        string $attackerSteamId,
        string $victimSteamId,
        float $aimbotScore,
        array $flagReasons,
        ?string $weapon = null,
        bool $headshot = false,
        ?string $attackerName = null,
        ?string $victimName = null,
        float $snapRatio = 0.0,
        ?int $reactionMs = null,
        ?float $attackerX = null,
        ?float $attackerY = null,
        ?float $attackerZ = null,
        ?float $victimX = null,
        ?float $victimY = null,
        ?float $victimZ = null,
        ?Uuid $id = null,
        ?\DateTimeImmutable $createdAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->demo = $demo;
        $this->roundNumber = $roundNumber;
        $this->tick = $tick;
        $this->attackerSteamId = $attackerSteamId;
        $this->victimSteamId = $victimSteamId;
        $this->attackerName = $attackerName;
        $this->victimName = $victimName;
        $this->weapon = $weapon;
        $this->attackerX = $attackerX;
        $this->attackerY = $attackerY;
        $this->attackerZ = $attackerZ;
        $this->victimX = $victimX;
        $this->victimY = $victimY;
        $this->victimZ = $victimZ;
        $this->headshot = $headshot;
        $this->aimbotScore = $aimbotScore;
        $this->snapRatio = $snapRatio;
        $this->reactionMs = $reactionMs;
        $this->flagReasons = $flagReasons;
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

    public function getAttackerSteamId(): string
    {
        return $this->attackerSteamId;
    }

    public function getVictimSteamId(): string
    {
        return $this->victimSteamId;
    }

    public function getAttackerName(): ?string
    {
        return $this->attackerName;
    }

    public function getVictimName(): ?string
    {
        return $this->victimName;
    }

    public function getWeapon(): ?string
    {
        return $this->weapon;
    }

    public function isHeadshot(): bool
    {
        return $this->headshot;
    }

    public function getAimbotScore(): float
    {
        return $this->aimbotScore;
    }

    public function getSnapRatio(): float
    {
        return $this->snapRatio;
    }

    public function getReactionMs(): ?int
    {
        return $this->reactionMs;
    }

    /** @return array{x: float|null, y: float|null, z: float|null} */
    public function getAttackerPosition(): array
    {
        return ['x' => $this->attackerX, 'y' => $this->attackerY, 'z' => $this->attackerZ];
    }

    /** @return array{x: float|null, y: float|null, z: float|null} */
    public function getVictimPosition(): array
    {
        return ['x' => $this->victimX, 'y' => $this->victimY, 'z' => $this->victimZ];
    }

    /** @return list<string> */
    public function getFlagReasons(): array
    {
        return $this->flagReasons;
    }
}
