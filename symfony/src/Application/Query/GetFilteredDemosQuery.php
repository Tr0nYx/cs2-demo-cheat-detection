<?php

declare(strict_types=1);

namespace App\Application\Query;

readonly class GetFilteredDemosQuery
{
    public const ALLOWED_RATING_BANDS = ['0-5', '5-10', '10+'];
    public const ALLOWED_OUTCOMES = ['win', 'loss', 'draw'];
    public const ALLOWED_DAYS_BACK = [7, 30, 90, 999];

    public function __construct(
        public string $userId,
        public ?string $map = null,
        public ?string $ratingBand = null,
        public ?string $outcome = null,
        public ?int $daysBack = null,
        public int $limit = 20,
        public int $offset = 0,
    ) {
        if ($userId === '') {
            throw new \InvalidArgumentException('User ID is required');
        }

        if ($ratingBand !== null && !in_array($ratingBand, self::ALLOWED_RATING_BANDS, true)) {
            throw new \InvalidArgumentException('Invalid rating band');
        }

        if ($outcome !== null && !in_array($outcome, self::ALLOWED_OUTCOMES, true)) {
            throw new \InvalidArgumentException('Invalid outcome');
        }

        if ($daysBack !== null && !in_array($daysBack, self::ALLOWED_DAYS_BACK, true)) {
            throw new \InvalidArgumentException('Invalid timeframe');
        }

        if ($limit < 1 || $limit > 100) {
            throw new \InvalidArgumentException('Limit must be between 1 and 100');
        }

        if ($offset < 0) {
            throw new \InvalidArgumentException('Offset must be >= 0');
        }
    }

    public function effectiveDaysBack(): ?int
    {
        if ($this->daysBack === null || $this->daysBack === 999) {
            return null;
        }

        return $this->daysBack;
    }
}
