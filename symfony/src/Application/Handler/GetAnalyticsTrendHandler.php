<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Query\GetAnalyticsTrendQuery;
use App\Domain\Analytics\ArcTrendDto;
use App\Domain\Analytics\ConsistencyTrendDto;
use App\Domain\Analytics\OutlierDto;
use App\Domain\Analytics\VarianceBandDto;
use App\Domain\Analytics\WeaponStrengthDto;
use App\Domain\Trace\TraceRating;
use App\Infrastructure\Cache\AnalyticsCacheAdapter;
use App\Infrastructure\Persistence\TraceRatingRepository;

final readonly class GetAnalyticsTrendHandler
{
    private const MIN_DEMOS = 5;

    public function __construct(
        private TraceRatingRepository $traceRatings,
        private AnalyticsCacheAdapter $cache,
    ) {
    }

    public function __invoke(GetAnalyticsTrendQuery $query): ConsistencyTrendDto|ArcTrendDto|WeaponStrengthDto
    {
        $window = $query->metric === 'consistency' ? $query->window : 999;
        $cached = $this->cache->get($query->userId, $query->metric, $window);
        if ($cached instanceof ConsistencyTrendDto || $cached instanceof ArcTrendDto || $cached instanceof WeaponStrengthDto) {
            return $cached;
        }

        $trend = match ($query->metric) {
            'consistency' => $this->computeConsistency($query->userId, $query->window),
            'arc' => $this->computeArc($query->userId),
            'weapons' => $this->computeWeapons($query->userId),
        };

        $this->cache->set($query->userId, $query->metric, $trend, $window);

        return $trend;
    }

    private function computeConsistency(string $userId, int $windowDays): ConsistencyTrendDto
    {
        $ratings = $this->traceRatings->findByPlayerSince($userId, new \DateTimeImmutable(sprintf('-%d days', $windowDays)));
        if (count($ratings) < self::MIN_DEMOS) {
            return new ConsistencyTrendDto([], [], sprintf('Only %d demos, need 5+.', count($ratings)));
        }

        $byDay = [];
        foreach ($ratings as $rating) {
            $byDay[$rating->getCalculatedAt()->format('Y-m-d')][] = $rating->getTraceAdjusted();
        }

        ksort($byDay);
        $bands = [];
        $stddevByDay = [];
        foreach ($byDay as $day => $scores) {
            $mean = array_sum($scores) / count($scores);
            $stddev = $this->stddev($scores);
            $stddevByDay[$day] = $stddev;
            $bands[] = new VarianceBandDto(
                timestamp: new \DateTimeImmutable($day),
                meanScore: $mean,
                upperBound: min(1.0, $mean + $stddev),
                lowerBound: max(0.0, $mean - $stddev),
                demoCount: count($scores),
            );
        }

        $flaggedDates = [];
        $days = array_keys($stddevByDay);
        foreach ($days as $index => $day) {
            if ($index < 7) {
                continue;
            }

            $previous = $stddevByDay[$days[$index - 7]];
            if ($previous > 0.0 && abs($stddevByDay[$day] - $previous) / $previous > 0.20) {
                $flaggedDates[] = $day;
            }
        }

        return new ConsistencyTrendDto($bands, $flaggedDates);
    }

    private function computeArc(string $userId): ArcTrendDto
    {
        $ratings = $this->traceRatings->findAllByPlayerAscending($userId);
        $count = count($ratings);
        if ($count < self::MIN_DEMOS) {
            return new ArcTrendDto(0.0, 0.0, 0.0, [], sprintf('Only %d demos, need 5+.', $count));
        }

        $points = [];
        foreach ($ratings as $index => $rating) {
            $points[] = ['x' => $index + 1, 'y' => $rating->getTraceAdjusted(), 'rating' => $rating];
        }

        $sumX = array_sum(array_column($points, 'x'));
        $sumY = array_sum(array_column($points, 'y'));
        $sumXY = array_sum(array_map(static fn (array $point) => $point['x'] * $point['y'], $points));
        $sumX2 = array_sum(array_map(static fn (array $point) => $point['x'] ** 2, $points));
        $denominator = ($count * $sumX2) - ($sumX ** 2);
        $slope = $denominator === 0.0 ? 0.0 : (($count * $sumXY) - ($sumX * $sumY)) / $denominator;
        $intercept = ($sumY - ($slope * $sumX)) / $count;
        $meanY = $sumY / $count;

        $residuals = [];
        $ssRes = 0.0;
        $ssTot = 0.0;
        foreach ($points as $point) {
            $predicted = ($slope * $point['x']) + $intercept;
            $residual = $point['y'] - $predicted;
            $residuals[] = $residual;
            $ssRes += $residual ** 2;
            $ssTot += ($point['y'] - $meanY) ** 2;
        }

        $residualStddev = $this->stddev($residuals);
        $outliers = [];
        foreach ($points as $index => $point) {
            if ($residualStddev === 0.0) {
                continue;
            }

            $predicted = ($slope * $point['x']) + $intercept;
            $deviation = ($point['y'] - $predicted) / $residualStddev;
            if (abs($deviation) > 2.0) {
                /** @var TraceRating $rating */
                $rating = $point['rating'];
                $outliers[] = new OutlierDto($index + 1, $rating->getDemoId(), $point['y'], $predicted, $deviation);
            }
        }

        return new ArcTrendDto($slope, $intercept, $ssTot === 0.0 ? 1.0 : max(0.0, min(1.0, 1 - ($ssRes / $ssTot))), $outliers);
    }

    private function computeWeapons(string $userId): WeaponStrengthDto
    {
        $ratings = $this->traceRatings->findAllByPlayerAscending($userId);
        if (count($ratings) < self::MIN_DEMOS) {
            return new WeaponStrengthDto([], sprintf('Only %d demos, need 5+.', count($ratings)));
        }

        $scoresByWeapon = [];
        foreach ($ratings as $rating) {
            $weaponClass = $this->weaponClass($rating);
            $scoresByWeapon[$weaponClass][] = $rating->getTraceAdjusted();
        }

        $strengths = [];
        foreach (['Rifle', 'Pistol', 'Sniper', 'SMG'] as $class) {
            if (isset($scoresByWeapon[$class])) {
                $strengths[$class] = array_sum($scoresByWeapon[$class]) / count($scoresByWeapon[$class]);
            }
        }

        return new WeaponStrengthDto($strengths);
    }

    /** @param list<float> $values */
    private function stddev(array $values): float
    {
        if (count($values) <= 1) {
            return 0.0;
        }

        $mean = array_sum($values) / count($values);
        $variance = array_sum(array_map(static fn (float $value) => ($value - $mean) ** 2, $values)) / count($values);

        return sqrt($variance);
    }

    private function weaponClass(TraceRating $rating): string
    {
        $featureData = $rating->getAnalysisResult()->getFeatureData();
        $class = $featureData['weapon_class'] ?? $featureData['weaponClass'] ?? null;
        if (is_string($class) && in_array($class, ['Rifle', 'Pistol', 'Sniper', 'SMG'], true)) {
            return $class;
        }

        $weapon = strtolower((string) ($featureData['weapon'] ?? $featureData['active_weapon_name'] ?? 'rifle'));

        return match ($weapon) {
            'awp', 'ssg08', 'scar20', 'g3sg1' => 'Sniper',
            'glock', 'usp_silencer', 'hkp2000', 'deagle', 'p250', 'tec9', 'fiveseven', 'elite', 'cz75a', 'revolver' => 'Pistol',
            'mac10', 'mp9', 'mp7', 'mp5sd', 'ump45', 'p90', 'bizon' => 'SMG',
            default => 'Rifle',
        };
    }
}
