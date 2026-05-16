<?php

declare(strict_types=1);

namespace App\Domain\Trace;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * TRACE Calibration Entity: Stores statistics for a calibration version.
 *
 * Calibration data represents the baseline statistics used to normalize TRACE scores.
 * Each version captures:
 *
 * - version: Unique identifier (e.g., "default-v1", "live-v1", "live-v2")
 * - sample_size: Number of trace_rating records used to compute these statistics
 * - global_average: Mean of all trace_adjusted values (used as normalization divisor)
 * - Component statistics: For each component (eKILL, AIM, KAST, UTIL, CLUTCH):
 *   - mean: Population mean
 *   - stdev: Standard deviation
 *   - p50, p75, p95: Percentile values
 *
 * The calibration system supports reproducibility: by storing version alongside TRACE
 * results, historical analyses can be re-normalized using the exact calibration active
 * at the time of analysis.
 *
 * The locked flag allows future phases to mark certain calibrations as final (e.g., for
 * leaderboard lock-in or tournament purposes).
 */
#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\TraceCalibrationRepository::class)]
#[ORM\Table(name: 'trace_calibration')]
#[ORM\UniqueConstraint(name: 'idx_trace_calibration_version', columns: ['version'])]
#[ORM\Index(name: 'idx_trace_calibration_created_at', columns: ['created_at'])]
class TraceCalibration
{
    #[ORM\Id]
    #[ORM\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $version;

    #[ORM\Column(type: Types::INTEGER)]
    private int $sampleSize;

    #[ORM\Column(type: Types::FLOAT)]
    private float $globalAverage;

    // eKILL statistics
    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillMean;

    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillStdev;

    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillP50;

    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillP75;

    #[ORM\Column(type: Types::FLOAT)]
    private float $ekillP95;

    // AIM statistics
    #[ORM\Column(type: Types::FLOAT)]
    private float $aimMean;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimStdev;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimP50;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimP75;

    #[ORM\Column(type: Types::FLOAT)]
    private float $aimP95;

    // KAST statistics
    #[ORM\Column(type: Types::FLOAT)]
    private float $kastMean;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kastStdev;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kastP50;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kastP75;

    #[ORM\Column(type: Types::FLOAT)]
    private float $kastP95;

    // UTIL statistics
    #[ORM\Column(type: Types::FLOAT)]
    private float $utilMean;

    #[ORM\Column(type: Types::FLOAT)]
    private float $utilStdev;

    #[ORM\Column(type: Types::FLOAT)]
    private float $utilP50;

    #[ORM\Column(type: Types::FLOAT)]
    private float $utilP75;

    #[ORM\Column(type: Types::FLOAT)]
    private float $utilP95;

    // CLUTCH statistics
    #[ORM\Column(type: Types::FLOAT)]
    private float $clutchMean;

    #[ORM\Column(type: Types::FLOAT)]
    private float $clutchStdev;

    #[ORM\Column(type: Types::FLOAT)]
    private float $clutchP50;

    #[ORM\Column(type: Types::FLOAT)]
    private float $clutchP75;

    #[ORM\Column(type: Types::FLOAT)]
    private float $clutchP95;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $locked = false;

    public function __construct(
        string $version,
        int $sampleSize,
        float $globalAverage,
        float $ekillMean,
        float $ekillStdev,
        float $ekillP50,
        float $ekillP75,
        float $ekillP95,
        float $aimMean,
        float $aimStdev,
        float $aimP50,
        float $aimP75,
        float $aimP95,
        float $kastMean,
        float $kastStdev,
        float $kastP50,
        float $kastP75,
        float $kastP95,
        float $utilMean,
        float $utilStdev,
        float $utilP50,
        float $utilP75,
        float $utilP95,
        float $clutchMean,
        float $clutchStdev,
        float $clutchP50,
        float $clutchP75,
        float $clutchP95,
        ?\DateTimeImmutable $createdAt = null,
        bool $locked = false,
    ) {
        $this->version = $version;
        $this->sampleSize = $sampleSize;
        $this->globalAverage = $globalAverage;
        $this->ekillMean = $ekillMean;
        $this->ekillStdev = $ekillStdev;
        $this->ekillP50 = $ekillP50;
        $this->ekillP75 = $ekillP75;
        $this->ekillP95 = $ekillP95;
        $this->aimMean = $aimMean;
        $this->aimStdev = $aimStdev;
        $this->aimP50 = $aimP50;
        $this->aimP75 = $aimP75;
        $this->aimP95 = $aimP95;
        $this->kastMean = $kastMean;
        $this->kastStdev = $kastStdev;
        $this->kastP50 = $kastP50;
        $this->kastP75 = $kastP75;
        $this->kastP95 = $kastP95;
        $this->utilMean = $utilMean;
        $this->utilStdev = $utilStdev;
        $this->utilP50 = $utilP50;
        $this->utilP75 = $utilP75;
        $this->utilP95 = $utilP95;
        $this->clutchMean = $clutchMean;
        $this->clutchStdev = $clutchStdev;
        $this->clutchP50 = $clutchP50;
        $this->clutchP75 = $clutchP75;
        $this->clutchP95 = $clutchP95;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
        $this->locked = $locked;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getVersion(): string
    {
        return $this->version;
    }

    public function getSampleSize(): int
    {
        return $this->sampleSize;
    }

    public function getGlobalAverage(): float
    {
        return $this->globalAverage;
    }

    public function getEkillMean(): float
    {
        return $this->ekillMean;
    }

    public function getEkillStdev(): float
    {
        return $this->ekillStdev;
    }

    public function getEkillP50(): float
    {
        return $this->ekillP50;
    }

    public function getEkillP75(): float
    {
        return $this->ekillP75;
    }

    public function getEkillP95(): float
    {
        return $this->ekillP95;
    }

    public function getAimMean(): float
    {
        return $this->aimMean;
    }

    public function getAimStdev(): float
    {
        return $this->aimStdev;
    }

    public function getAimP50(): float
    {
        return $this->aimP50;
    }

    public function getAimP75(): float
    {
        return $this->aimP75;
    }

    public function getAimP95(): float
    {
        return $this->aimP95;
    }

    public function getKastMean(): float
    {
        return $this->kastMean;
    }

    public function getKastStdev(): float
    {
        return $this->kastStdev;
    }

    public function getKastP50(): float
    {
        return $this->kastP50;
    }

    public function getKastP75(): float
    {
        return $this->kastP75;
    }

    public function getKastP95(): float
    {
        return $this->kastP95;
    }

    public function getUtilMean(): float
    {
        return $this->utilMean;
    }

    public function getUtilStdev(): float
    {
        return $this->utilStdev;
    }

    public function getUtilP50(): float
    {
        return $this->utilP50;
    }

    public function getUtilP75(): float
    {
        return $this->utilP75;
    }

    public function getUtilP95(): float
    {
        return $this->utilP95;
    }

    public function getClutchMean(): float
    {
        return $this->clutchMean;
    }

    public function getClutchStdev(): float
    {
        return $this->clutchStdev;
    }

    public function getClutchP50(): float
    {
        return $this->clutchP50;
    }

    public function getClutchP75(): float
    {
        return $this->clutchP75;
    }

    public function getClutchP95(): float
    {
        return $this->clutchP95;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isLocked(): bool
    {
        return $this->locked;
    }
}
