<?php

declare(strict_types=1);

namespace App\Domain\Analysis;

use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\AnalysisResultRepository::class)]
#[ORM\Table(name: 'analysis_result')]
#[ORM\UniqueConstraint(name: 'uniq_analysis_result_demo_player', columns: ['demo_id', 'player_id'])]
#[ORM\Index(name: 'idx_analysis_result_analyzed_at', columns: ['analyzed_at'])]
#[ORM\Index(name: 'idx_analysis_result_player_analyzed_at', columns: ['player_id', 'analyzed_at'])]
class AnalysisResult
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Demo::class, inversedBy: 'analysisResults')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Demo $demo;

    #[ORM\ManyToOne(targetEntity: Player::class, inversedBy: 'analysisResults')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column(name: 'round_count')]
    private int $roundCount;

    #[ORM\Column(name: 'aimbot_score')]
    private float $aimbotScore;

    #[ORM\Column(name: 'wallhack_score')]
    private float $wallhackScore;

    #[ORM\Column(name: 'triggerbot_score')]
    private float $triggerbotScore;

    #[ORM\Column(name: 'recoil_score')]
    private float $recoilScore;

    #[ORM\Column(name: 'bhop_score')]
    private float $bhopScore;

    #[ORM\Column(name: 'session_consistency_score')]
    private float $sessionConsistencyScore;

    #[ORM\Column(name: 'overall_suspicion')]
    private float $overallSuspicion;

    #[ORM\Column(name: 'suspicion_label', length: 32, enumType: SuspicionLabel::class)]
    private SuspicionLabel $suspicionLabel;

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'feature_data', type: Types::JSON)]
    private array $featureData;

    /** @var array<string, mixed> */
    #[ORM\Column(name: 'support_data', type: Types::JSON)]
    private array $supportData;

    #[ORM\Column(name: 'analyzed_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $analyzedAt;

    #[ORM\Column(name: 'model_version', length: 255, nullable: true)]
    private ?string $modelVersion = null;

    /** @param array<string, mixed> $featureData @param array<string, mixed> $supportData */
    public function __construct(
        Demo $demo,
        Player $player,
        int $roundCount,
        float $aimbotScore,
        float $wallhackScore,
        float $triggerbotScore,
        float $recoilScore,
        float $bhopScore,
        float $sessionConsistencyScore,
        float $overallSuspicion,
        SuspicionLabel $suspicionLabel,
        array $featureData = [],
        array $supportData = [],
        ?Uuid $id = null,
        ?\DateTimeImmutable $analyzedAt = null,
        ?string $modelVersion = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->demo = $demo;
        $this->player = $player;
        $this->roundCount = $roundCount;
        $this->modelVersion = $modelVersion;
        $this->replaceScores($roundCount, $aimbotScore, $wallhackScore, $triggerbotScore, $recoilScore, $bhopScore, $sessionConsistencyScore, $overallSuspicion, $suspicionLabel, $featureData, $supportData, $analyzedAt);
    }

    /** @param array<string, mixed> $featureData @param array<string, mixed> $supportData */
    public function replaceScores(
        int $roundCount,
        float $aimbotScore,
        float $wallhackScore,
        float $triggerbotScore,
        float $recoilScore,
        float $bhopScore,
        float $sessionConsistencyScore,
        float $overallSuspicion,
        SuspicionLabel $suspicionLabel,
        array $featureData = [],
        array $supportData = [],
        ?\DateTimeImmutable $analyzedAt = null,
    ): void {
        $this->roundCount = $roundCount;
        $this->aimbotScore = $aimbotScore;
        $this->wallhackScore = $wallhackScore;
        $this->triggerbotScore = $triggerbotScore;
        $this->recoilScore = $recoilScore;
        $this->bhopScore = $bhopScore;
        $this->sessionConsistencyScore = $sessionConsistencyScore;
        $this->overallSuspicion = $overallSuspicion;
        $this->suspicionLabel = $suspicionLabel;
        $this->featureData = $featureData;
        $this->supportData = $supportData;
        $this->analyzedAt = $analyzedAt ?? new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDemo(): Demo
    {
        return $this->demo;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getRoundCount(): int
    {
        return $this->roundCount;
    }

    public function getAimbotScore(): float
    {
        return $this->aimbotScore;
    }

    public function getWallhackScore(): float
    {
        return $this->wallhackScore;
    }

    public function getTriggerbotScore(): float
    {
        return $this->triggerbotScore;
    }

    public function getRecoilScore(): float
    {
        return $this->recoilScore;
    }

    public function getBhopScore(): float
    {
        return $this->bhopScore;
    }

    public function getSessionConsistencyScore(): float
    {
        return $this->sessionConsistencyScore;
    }

    public function getOverallSuspicion(): float
    {
        return $this->overallSuspicion;
    }

    public function getSuspicionLabel(): SuspicionLabel
    {
        return $this->suspicionLabel;
    }

    /** @return array<string, mixed> */
    public function getFeatureData(): array
    {
        return $this->featureData;
    }

    /** @return array<string, mixed> */
    public function getSupportData(): array
    {
        return $this->supportData;
    }

    public function getAnalyzedAt(): \DateTimeImmutable
    {
        return $this->analyzedAt;
    }

    public function getModelVersion(): ?string
    {
        return $this->modelVersion;
    }

    public function setModelVersion(?string $modelVersion): void
    {
        $this->modelVersion = $modelVersion;
    }
}
