<?php

declare(strict_types=1);

namespace App\Application\Service;

use App\Application\Dto\SensitivityComparisonDto;
use App\Application\Exception\AccessDeniedException;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Demo\DemoStatus;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use Symfony\Component\Uid\Uuid;

readonly class SensitivityComparisonService
{
    private const FEATURES = ['aimbot', 'wallhack', 'triggerbot', 'recoil', 'bhop', 'session'];

    private const WEIGHTS = [
        'aimbot' => 0.25,
        'wallhack' => 0.25,
        'triggerbot' => 0.15,
        'recoil' => 0.20,
        'bhop' => 0.10,
        'session' => 0.05,
    ];

    public function __construct(private AnalysisResultRepository $analysisResults)
    {
    }

    /** @param array<string, mixed> $adjustedThresholds */
    public function createComparison(string $demoId, string $userId, array $adjustedThresholds): SensitivityComparisonDto
    {
        if (!Uuid::isValid($demoId)) {
            throw new \InvalidArgumentException('Invalid demo ID.');
        }

        if ($userId === '') {
            throw new \InvalidArgumentException('User ID is required.');
        }

        $thresholds = $this->validatedThresholds($adjustedThresholds);
        $analysisResult = $this->analysisResults->findByDemoIdAndUserId($demoId, $userId);

        if (!$analysisResult instanceof AnalysisResult) {
            throw new AccessDeniedException('You cannot compare thresholds for this demo.');
        }

        if ($analysisResult->getDemo()->getStatus() !== DemoStatus::Done) {
            throw new \LogicException('Demo analysis is not complete.');
        }

        $baselineContributions = $this->contributions($analysisResult, $this->defaultThresholds());
        $tunedContributions = $this->contributions($analysisResult, $thresholds);
        $impactBreakdown = [];

        foreach (self::FEATURES as $feature) {
            $impactBreakdown[$feature] = round($tunedContributions[$feature] - $baselineContributions[$feature], 3);
        }

        return new SensitivityComparisonDto(
            baselineSuspicion: round($analysisResult->getOverallSuspicion(), 3),
            tunedSuspicion: round(min(1.0, max(0.0, array_sum($tunedContributions))), 3),
            impactBreakdown: $impactBreakdown,
        );
    }

    /** @param array<string, mixed> $thresholds @return array<string, int> */
    private function validatedThresholds(array $thresholds): array
    {
        $validated = [];

        foreach (self::FEATURES as $feature) {
            if (!array_key_exists($feature, $thresholds)) {
                throw new \InvalidArgumentException(sprintf('Missing threshold for %s.', $feature));
            }

            if (!is_int($thresholds[$feature]) && !(is_string($thresholds[$feature]) && ctype_digit($thresholds[$feature]))) {
                throw new \InvalidArgumentException(sprintf('Threshold for %s must be an integer.', $feature));
            }

            $value = (int) $thresholds[$feature];
            if ($value < 0 || $value > 100) {
                throw new \InvalidArgumentException(sprintf('Threshold for %s must be between 0 and 100.', $feature));
            }

            $validated[$feature] = $value;
        }

        return $validated;
    }

    /** @return array<string, int> */
    private function defaultThresholds(): array
    {
        return array_fill_keys(self::FEATURES, 50);
    }

    /** @param array<string, int> $thresholds @return array<string, float> */
    private function contributions(AnalysisResult $result, array $thresholds): array
    {
        $scores = [
            'aimbot' => $result->getAimbotScore(),
            'wallhack' => $result->getWallhackScore(),
            'triggerbot' => $result->getTriggerbotScore(),
            'recoil' => $result->getRecoilScore(),
            'bhop' => $result->getBhopScore(),
            'session' => $result->getSessionConsistencyScore(),
        ];

        $contributions = [];
        foreach (self::FEATURES as $feature) {
            $contributions[$feature] = $scores[$feature] > ($thresholds[$feature] / 100)
                ? self::WEIGHTS[$feature]
                : 0.0;
        }

        return $contributions;
    }
}
