<?php

declare(strict_types=1);

namespace App\Tests\Application\Steam;

use App\Application\Import\ImportSharecodeService;
use App\Application\Steam\SteamMatchHistorySecretCipher;
use App\Application\Steam\TrackSteamMatchHistoryHandler;
use App\Application\Steam\TrackSteamMatchHistoryMessage;
use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository;
use App\Infrastructure\Steam\SteamMatchHistoryClient;
use App\Infrastructure\Steam\SteamMatchHistoryResult;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use Psr\Log\NullLogger;
use Symfony\Component\Uid\Uuid;

#[AllowMockObjectsWithoutExpectations]
final class TrackSteamMatchHistoryHandlerTest extends TestCase
{
    public function testQueuesDiscoveredSharecodeAndStopsWhenCaughtUp(): void
    {
        $cipher = new SteamMatchHistorySecretCipher('test-secret');
        $connection = new SteamMatchHistoryConnection(
            Uuid::v7(),
            '76561198000000000',
            $cipher->encrypt('steam-key'),
            $cipher->fingerprint('steam-key'),
            'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE'
        );
        $repository = $this->createMock(SteamMatchHistoryConnectionRepository::class);
        $repository->method('findById')->willReturn($connection);

        $client = $this->createMock(SteamMatchHistoryClient::class);
        $client->expects($this->exactly(2))
            ->method('getNextCode')
            ->willReturnOnConsecutiveCalls(
                SteamMatchHistoryResult::nextCode('CSGO-FFFFF-GGGGG-HHHHH-IIIII-JJJJJ'),
                SteamMatchHistoryResult::caughtUp()
            );

        $imports = $this->createMock(ImportSharecodeService::class);
        $imports->expects($this->once())
            ->method('importDiscoveredSharecode')
            ->willReturn(['queued' => true, 'duplicate' => false, 'import_id' => 'import-id', 'demo_id' => null]);

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->atLeastOnce())->method('flush');

        $handler = new TrackSteamMatchHistoryHandler($repository, $cipher, $client, $imports, $entityManager, new NullLogger());
        $handler(new TrackSteamMatchHistoryMessage($connection->getId()->toRfc4122(), perRunLimit: 10));

        self::assertSame('caught_up', $connection->getStatus());
        self::assertSame(1, $connection->getDiscoveredCount());
        self::assertSame(1, $connection->getQueuedCount());
    }

    public function testAuthFailureStopsNormalRetries(): void
    {
        $cipher = new SteamMatchHistorySecretCipher('test-secret');
        $connection = new SteamMatchHistoryConnection(
            Uuid::v7(),
            '76561198000000000',
            $cipher->encrypt('steam-key'),
            $cipher->fingerprint('steam-key'),
            'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE'
        );
        $repository = $this->createMock(SteamMatchHistoryConnectionRepository::class);
        $repository->method('findById')->willReturn($connection);
        $client = $this->createMock(SteamMatchHistoryClient::class);
        $client->method('getNextCode')->willReturn(SteamMatchHistoryResult::authFailed());

        $handler = new TrackSteamMatchHistoryHandler(
            $repository,
            $cipher,
            $client,
            $this->createMock(ImportSharecodeService::class),
            $this->createMock(EntityManagerInterface::class),
            new NullLogger()
        );
        $handler(new TrackSteamMatchHistoryMessage($connection->getId()->toRfc4122()));

        self::assertSame('auth_failed', $connection->getStatus());
        self::assertNull($connection->getNextCheckAt());
    }

    public function testRateLimitBackoffFallsBackToFifteenMinutes(): void
    {
        $cipher = new SteamMatchHistorySecretCipher('test-secret');
        $connection = new SteamMatchHistoryConnection(
            Uuid::v7(),
            '76561198000000000',
            $cipher->encrypt('steam-key'),
            $cipher->fingerprint('steam-key'),
            'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE'
        );
        $repository = $this->createMock(SteamMatchHistoryConnectionRepository::class);
        $repository->method('findById')->willReturn($connection);
        $client = $this->createMock(SteamMatchHistoryClient::class);
        $client->method('getNextCode')->willReturn(SteamMatchHistoryResult::rateLimited());

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects($this->atLeastOnce())->method('flush');

        $handler = new TrackSteamMatchHistoryHandler(
            $repository,
            $cipher,
            $client,
            $this->createMock(ImportSharecodeService::class),
            $entityManager,
            new NullLogger()
        );
        $handler(new TrackSteamMatchHistoryMessage($connection->getId()->toRfc4122()));

        self::assertSame('rate_limited', $connection->getStatus());
        self::assertNotNull($connection->getNextCheckAt());
        self::assertNotNull($connection->getLastCheckAt());

        $difference = $connection->getNextCheckAt()->getTimestamp() - $connection->getLastCheckAt()->getTimestamp();
        self::assertGreaterThanOrEqual(14 * 60, $difference);
        self::assertLessThanOrEqual(16 * 60, $difference);
    }
}
