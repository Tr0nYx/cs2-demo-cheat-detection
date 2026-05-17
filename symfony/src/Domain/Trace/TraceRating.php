<?php

declare(strict_types=1);

namespace App\Domain\Trace;

use App\Domain\Analysis\AnalysisResult;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * TRACE Rating Entity: Stores TRACE scores with all component values and metadata.
 *
 * TRACE (Tactical Round Action & Contribution Evaluation) provides a transparent
 * player impact rating independent of suspicion verdicts. This entity captures:
 *
 * - trace_base: Weighted component average before trust adjustment
 * - trace_adjusted: Base score adjusted by trust multiplier (from suspicion)
 * - trace_normalized: Adjusted rating normalized by calibration global average
 * - trust_multiplier: Dampening factor [0.73, 1.00] from suspicion score
 * - Component scores: All five TRACE components (eKILL, AIM, KAST, UTIL, CLUTCH),
 *   normalized to range [0.3, 2.0]
 * - Raw values: For debugging and auditing (e.g., aim_cpq, clutch_attempts)
 *
 * Each TraceRating links to exactly one AnalysisResult via foreign key.
 * Calibration version allows historical reproducibility across calibration updates.
 */
#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\TraceRatingRepository::class)]
#[ORM\Table(name: 'trace_rating')]
#[ORM\Index(name: 'idx_trace_rating_player_calculated_at', columns: ['player_id', 'calculated_at'])]
#[ORM\Index(name: 'idx_trace_rating_calibration_version', columns: ['calibration_version'])]
#[ORM\UniqueConstraint(name: 'idx_trace_rating_analysis_result_id', columns: ['analysis_result_id'])]
class TraceRating
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\OneToOne(targetEntity: AnalysisResult::class)]
    #[ORM\JoinColumn(name: 'analysis_result_id', referencedColumnName: 'id', nullable: false, unique: true, onDelete: 'CASCADE')]
    private AnalysisResult $analysisResult;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $playerId;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $demoId;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'default-v1'])]
    private string $calibrationVersion;

    #[ORM\Column(type: Types::FLOAT)]
    private float $traceBase;

    #[ORM\Column(type: Types::FLOAT)]
    private float $traceAdjusted;

    #[ORM\Column(type: Types::FLOAT)]
    private float $traceNormalized;

    #[ORM\Column(type: Types::FLOAT)]
    private float $trustMultiplier;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $tracePercentile = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $roundCount;

    // Component scores (normalized [0.3, 2.0])
    #[ORM\Column(type: Types::FLOAT)]
    private float $ekill;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aim;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kast;

    #[ORM\Column(type: Types::FLOAT)]
    private float $util;

    #[ORM\Column(type: Types::FLOAT)]
    private float $clutch;

    // Raw component values (for debugging)
    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillRaw;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimCpq;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimCsq;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimTtd;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimScs;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kastPercentage;

    #[ORM\Column(type: Types::INTEGER)]
    private int $clutchAttempts;

    #[ORM\Column(type: Types::INTEGER)]
    private int $clutchWins;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $calculatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        AnalysisResult $analysisResult,
        string $playerId,
        string $demoId,
        string $calibrationVersion,
        float $traceBase,
        float $traceAdjusted,
        float $traceNormalized,
        float $trustMultiplier,
        int $roundCount,
        float $ekill,
        float $aim,
        float $kast,
        float $util,
        float $clutch,
        float $ekillRaw,
        float $aimCpq,
        float $aimCsq,
        float $aimTtd,
        float $aimScs,
        float $kastPercentage,
        int $clutchAttempts,
        int $clutchWins,
        \DateTimeImmutable $calculatedAt,
        ?float $tracePercentile = null,
        ?\DateTimeImmutable $createdAt = null,
        ?\DateTimeImmutable $updatedAt = null,
    ) {
        $this->analysisResult = $analysisResult;
        $this->playerId = $playerId;
        $this->demoId = $demoId;
        $this->calibrationVersion = $calibrationVersion;
        $this->traceBase = $traceBase;
        $this->traceAdjusted = $traceAdjusted;
        $this->traceNormalized = $traceNormalized;
        $this->trustMultiplier = $trustMultiplier;
        $this->roundCount = $roundCount;
        $this->ekill = $ekill;
        $this->aim = $aim;
        $this->kast = $kast;
        $this->util = $util;
        $this->clutch = $clutch;
        $this->ekillRaw = $ekillRaw;
        $this->aimCpq = $aimCpq;
        $this->aimCsq = $aimCsq;
        $this->aimTtd = $aimTtd;
        $this->aimScs = $aimScs;
        $this->kastPercentage = $kastPercentage;
        $this->clutchAttempts = $clutchAttempts;
        $this->clutchWins = $clutchWins;
        $this->calculatedAt = $calculatedAt;
        $this->tracePercentile = $tracePercentile;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
        $this->updatedAt = $updatedAt ?? new \DateTimeImmutable();
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getAnalysisResult(): AnalysisResult
    {
        return $this->analysisResult;
    }

    public function getPlayerId(): string
    {
        return $this->playerId;
    }

    public function getDemoId(): string
    {
        return $this->demoId;
    }

    public function getCalibrationVersion(): string
    {
        return $this->calibrationVersion;
    }

    public function getTraceBase(): float
    {
        return $this->traceBase;
    }

    public function getTraceAdjusted(): float
    {
        return $this->traceAdjusted;
    }

    public function getTraceNormalized(): float
    {
        return $this->traceNormalized;
    }

    public function getTrustMultiplier(): float
    {
        return $this->trustMultiplier;
    }

    public function getTracePercentile(): ?float
    {
        return $this->tracePercentile;
    }

    public function getRoundCount(): int
    {
        return $this->roundCount;
    }

    public function getEkill(): float
    {
        return $this->ekill;
    }

    public function getAim(): float
    {
        return $this->aim;
    }

    public function getKast(): float
    {
        return $this->kast;
    }

    public function getUtil(): float
    {
        return $this->util;
    }

    public function getClutch(): float
    {
        return $this->clutch;
    }

    public function getEkillRaw(): float
    {
        return $this->ekillRaw;
    }

    public function getAimCpq(): float
    {
        return $this->aimCpq;
    }

    public function getAimCsq(): float
    {
        return $this->aimCsq;
    }

    public function getAimTtd(): float
    {
        return $this->aimTtd;
    }

    public function getAimScs(): float
    {
        return $this->aimScs;
    }

    public function getKastPercentage(): float
    {
        return $this->kastPercentage;
    }

    public function getClutchAttempts(): int
    {
        return $this->clutchAttempts;
    }

    public function getClutchWins(): int
    {
        return $this->clutchWins;
    }

    public function getCalculatedAt(): \DateTimeImmutable
    {
        return $this->calculatedAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
