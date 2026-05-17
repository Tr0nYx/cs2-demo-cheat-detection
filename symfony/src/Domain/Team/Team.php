<?php

declare(strict_types=1);

namespace App\Domain\Team;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Team - Doctrine entity representing a team.
 *
 * Stores team metadata imported from sharecode demo data.
 * Foundation for Wave 4 team leaderboards with player associations.
 *
 * Properties:
 * - id: UUID primary key
 * - name: Team identifier (from sharecode)
 * - displayName: Human-readable team name (nullable)
 * - createdAt: Timestamp when team was first seen
 * - updatedAt: Timestamp when team metadata was last updated
 *
 * Note: Wave 1 creates entity stub. Wave 4 adds many-to-many player-team association
 * when sharecode import provides team rosters.
 */
#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\TeamRepository::class)]
#[ORM\Table(name: 'team')]
#[ORM\Index(name: 'idx_team_name', columns: ['name'])]
class Team
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 255, nullable: false)]
    private string $name;

    #[ORM\Column(name: 'display_name', type: 'string', length: 255, nullable: true)]
    private ?string $displayName = null;

    #[ORM\Column(name: 'created_at', type: 'datetime_immutable', nullable: false)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetime_immutable', nullable: false)]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, \App\Domain\Player\Player> Players on this team */
    #[ORM\ManyToMany(targetEntity: \App\Domain\Player\Player::class, inversedBy: 'teams')]
    #[ORM\JoinTable(name: 'player_team')]
    private Collection $players;

    public function __construct(
        string $name,
        ?string $displayName = null,
        ?Uuid $id = null,
        ?\DateTimeImmutable $createdAt = null,
        ?\DateTimeImmutable $updatedAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->name = $name;
        $this->displayName = $displayName;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
        $this->updatedAt = $updatedAt ?? new \DateTimeImmutable();
        $this->players = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function rename(string $displayName): void
    {
        $this->displayName = $displayName;
        $this->updatedAt = new \DateTimeImmutable();
    }

    /**
     * Get all players on this team.
     *
     * @return Collection<int, \App\Domain\Player\Player>
     */
    public function getPlayers(): Collection
    {
        return $this->players;
    }

    /**
     * Add a player to this team.
     *
     * @param \App\Domain\Player\Player $player
     * @return void
     */
    public function addPlayer(\App\Domain\Player\Player $player): void
    {
        if (!$this->players->contains($player)) {
            $this->players->add($player);
            $player->addTeam($this);
        }
    }

    /**
     * Remove a player from this team.
     *
     * @param \App\Domain\Player\Player $player
     * @return void
     */
    public function removePlayer(\App\Domain\Player\Player $player): void
    {
        if ($this->players->removeElement($player)) {
            $player->removeTeam($this);
        }
    }
}
