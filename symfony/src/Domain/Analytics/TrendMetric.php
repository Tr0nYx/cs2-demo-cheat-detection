<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

enum TrendMetric: string
{
    case Consistency = 'consistency';
    case Arc = 'arc';
    case Weapons = 'weapons';
}
