<?php

declare(strict_types=1);

namespace App\Application\Query;

readonly class GetFilteredLeaderboardQuery
{
    public const PERCENTILE_THRESHOLD = 0.95;
    public const MIN_DEMO_QUALIFICATION = 5;
    public const ALLOWED_MAPS = ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Vertigo'];
    public const ALLOWED_RATING_BANDS = ['0-5', '5-10', '10+'];
    public const ALLOWED_DAYS_BACK = [7, 30, 90, 999];

    public function __construct(
        public ?string $map = null,
        public ?string $ratingBand = null,
        public ?int $daysBack = null,
        public int $limit = 100,
        public int $offset = 0,
    ) {
        if ($map !== null && !in_array($map, self::ALLOWED_MAPS, true)) {
            throw new \InvalidArgumentException('Invalid map');
        }

        if ($ratingBand !== null && !in_array($ratingBand, self::ALLOWED_RATING_BANDS, true)) {
            throw new \InvalidArgumentException('Invalid rating band');
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
