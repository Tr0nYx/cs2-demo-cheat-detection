<?php

declare(strict_types=1);

namespace App\Application\Query;

readonly class GetAnalyticsTrendQuery
{
    public const ALLOWED_METRICS = ['consistency', 'arc', 'weapons'];

    public function __construct(
        public string $userId,
        public string $metric,
        public int $window = 30,
    ) {
        if ($userId === '') {
            throw new \InvalidArgumentException('User ID is required.');
        }

        if (!in_array($metric, self::ALLOWED_METRICS, true)) {
            throw new \InvalidArgumentException('Invalid trend metric.');
        }

        if ($window < 1 || $window > 999) {
            throw new \InvalidArgumentException('Trend window must be between 1 and 999 days.');
        }
    }
}
