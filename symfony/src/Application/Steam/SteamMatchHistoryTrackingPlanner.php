<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;

final readonly class SteamMatchHistoryTrackingPlanner
{
    public function __construct(private SteamMatchHistoryConnectionRepository $connections)
    {
    }

    /** @return list<SteamMatchHistoryConnection> */
    public function dueConnections(int $limit = 100, bool $force = false, ?\DateTimeImmutable $now = null): array
    {
        return $this->connections->findDue($now ?? new \DateTimeImmutable(), max(1, $limit), $force);
    }
}
