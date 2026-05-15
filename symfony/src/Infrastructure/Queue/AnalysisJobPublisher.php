<?php

declare(strict_types=1);

namespace App\Infrastructure\Queue;

use App\Domain\Demo\Demo;

interface AnalysisJobPublisher
{
    public function publish(Demo $demo): void;
}
