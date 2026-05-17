<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

use App\Domain\Analysis\AnalysisResult;

readonly class FeatureVectorsDto
{
    public function __construct(
        public float $aimbotScore,
        public float $wallhackScore,
        public float $triggerbotScore,
        public float $recoilScore,
        public float $bhopScore,
        public float $sessionScore,
    ) {
        foreach (get_object_vars($this) as $name => $score) {
            if ($score < 0.0 || $score > 1.0) {
                throw new \InvalidArgumentException(sprintf('%s must be between 0 and 1', $name));
            }
        }
    }

    public static function fromAnalysisResult(AnalysisResult $result): self
    {
        return new self(
            aimbotScore: $result->getAimbotScore(),
            wallhackScore: $result->getWallhackScore(),
            triggerbotScore: $result->getTriggerbotScore(),
            recoilScore: $result->getRecoilScore(),
            bhopScore: $result->getBhopScore(),
            sessionScore: $result->getSessionConsistencyScore(),
        );
    }

    /** @return array<string, float> */
    public function toArray(): array
    {
        return [
            'aimbotScore' => $this->aimbotScore,
            'wallhackScore' => $this->wallhackScore,
            'triggerbotScore' => $this->triggerbotScore,
            'recoilScore' => $this->recoilScore,
            'bhopScore' => $this->bhopScore,
            'sessionScore' => $this->sessionScore,
        ];
    }
}
