<?php

declare(strict_types=1);

namespace App\Domain\Player;

use App\Domain\Analysis\AnalysisResult;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\PlayerRepository::class)]
#[ORM\Table(name: 'player')]
#[ORM\UniqueConstraint(name: 'uniq_player_steam_id', columns: ['steam_id'])]
class Player
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'steam_id', length: 64)]
    private string $steamId;

    #[ORM\Column(name: 'display_name', length: 255, nullable: true)]
    private ?string $displayName;

    /** @var Collection<int, AnalysisResult> */
    #[ORM\OneToMany(mappedBy: 'player', targetEntity: AnalysisResult::class)]
    private Collection $analysisResults;

    /** @var Collection<int, \App\Domain\Team\Team> Teams this player is on */
    #[ORM\ManyToMany(targetEntity: \App\Domain\Team\Team::class, mappedBy: 'players')]
    private Collection $teams;

    public function __construct(string $steamId, ?string $displayName = null, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->steamId = $steamId;
        $this->displayName = $displayName;
        $this->analysisResults = new ArrayCollection();
        $this->teams = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSteamId(): string
    {
        return $this->steamId;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function rename(?string $displayName): void
    {
        $this->displayName = $displayName;
    }

    /**
     * Get all teams this player is on.
     *
     * @return Collection<int, \App\Domain\Team\Team>
     */
    public function getTeams(): Collection
    {
        return $this->teams;
    }

    /**
     * Add this player to a team.
     *
     * @param \App\Domain\Team\Team $team
     * @return void
     */
    public function addTeam(\App\Domain\Team\Team $team): void
    {
        if (!$this->teams->contains($team)) {
            $this->teams->add($team);
            $team->addPlayer($this);
        }
    }

    /**
     * Remove this player from a team.
     *
     * @param \App\Domain\Team\Team $team
     * @return void
     */
    public function removeTeam(\App\Domain\Team\Team $team): void
    {
        if ($this->teams->removeElement($team)) {
            $team->removePlayer($this);
        }
    }
}
