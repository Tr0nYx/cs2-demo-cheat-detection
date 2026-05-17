<?php

declare(strict_types=1);

namespace App\Domain\Viewer;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'demo_round')]
#[ORM\Index(name: 'idx_demo_round_demo_round', columns: ['demo_id', 'round_number'])]
class DemoRound
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Demo::class)]
    #[ORM\JoinColumn(name: 'demo_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Demo $demo;

    #[ORM\Column(name: 'round_number')]
    private int $roundNumber;

    #[ORM\Column(name: 'start_tick')]
    private int $startTick;

    #[ORM\Column(name: 'end_tick')]
    private int $endTick;

    #[ORM\Column(length: 8, nullable: true)]
    private ?string $winner;

    #[ORM\Column(name: 'end_reason', length: 64, nullable: true)]
    private ?string $endReason;

    #[ORM\Column(name: 'duration_ms')]
    private int $durationMs;

    #[ORM\Column]
    private int $kills;

    #[ORM\Column(name: 'first_kill_tick', nullable: true)]
    private ?int $firstKillTick;

    #[ORM\Column(name: 'bomb_planted')]
    private bool $bombPlanted;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Demo $demo,
        int $roundNumber,
        int $startTick,
        int $endTick,
        ?string $winner = null,
        ?string $endReason = null,
        int $durationMs = 0,
        int $kills = 0,
        ?int $firstKillTick = null,
        bool $bombPlanted = false,
        ?Uuid $id = null,
        ?\DateTimeImmutable $createdAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->demo = $demo;
        $this->roundNumber = $roundNumber;
        $this->startTick = $startTick;
        $this->endTick = $endTick;
        $this->winner = $winner;
        $this->endReason = $endReason;
        $this->durationMs = $durationMs;
        $this->kills = $kills;
        $this->firstKillTick = $firstKillTick;
        $this->bombPlanted = $bombPlanted;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDemo(): Demo
    {
        return $this->demo;
    }

    public function getRoundNumber(): int
    {
        return $this->roundNumber;
    }

    public function getStartTick(): int
    {
        return $this->startTick;
    }

    public function getEndTick(): int
    {
        return $this->endTick;
    }

    public function getWinner(): ?string
    {
        return $this->winner;
    }

    public function getEndReason(): ?string
    {
        return $this->endReason;
    }

    public function getDurationMs(): int
    {
        return $this->durationMs;
    }

    public function getKills(): int
    {
        return $this->kills;
    }

    public function getFirstKillTick(): ?int
    {
        return $this->firstKillTick;
    }

    public function isBombPlanted(): bool
    {
        return $this->bombPlanted;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
