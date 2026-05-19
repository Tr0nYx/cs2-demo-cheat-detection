<?php

declare(strict_types=1);

namespace App\Tests\Application\Steam;

use App\Application\Steam\SteamMatchHistoryTrackingPlanner;
use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class SteamMatchHistoryTrackingPlannerTest extends TestCase
{
    public function testReturnsDueConnectionsFromRepository(): void
    {
        $now = new \DateTimeImmutable('2026-05-18T12:00:00+00:00');
        $connection = new SteamMatchHistoryConnection(Uuid::v7(), '76561198000000000', 'cipher', 'fingerprint', 'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE');
        $repository = $this->createMock(SteamMatchHistoryConnectionRepository::class);
        $repository->expects($this->once())
            ->method('findDue')
            ->with($now, 10, false)
            ->willReturn([$connection]);

        self::assertSame([$connection], (new SteamMatchHistoryTrackingPlanner($repository))->dueConnections(10, false, $now));
    }
}
