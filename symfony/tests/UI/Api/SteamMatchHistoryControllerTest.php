<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Application\Steam\ConnectSteamMatchHistoryService;
use App\Application\Steam\DisconnectSteamMatchHistoryService;
use App\Application\Steam\SteamMatchHistoryStatusProvider;
use App\Domain\Steam\SteamMatchHistoryConnection;
use App\Entity\User;
use App\Repository\UserRepository;
use App\UI\Api\ApiErrorResponder;
use App\UI\Api\SteamMatchHistoryController;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Uid\Uuid;

#[AllowMockObjectsWithoutExpectations]
final class SteamMatchHistoryControllerTest extends TestCase
{
    public function testStatusRequiresAuthentication(): void
    {
        $response = $this->controller()->status(new Request());

        self::assertSame(401, $response->getStatusCode());
    }

    public function testConnectRejectsUserSuppliedSteamId(): void
    {
        $user = new User('76561198000000000', 'Test');
        $response = $this->controller($user)->connect($this->jsonRequest([
            'steam_id' => '76561198000000001',
            'steamidkey' => 'secret-code',
            'seed' => 'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
        ], $user->getSteamId()));

        self::assertSame(400, $response->getStatusCode());
        self::assertStringNotContainsString('secret-code', (string) $response->getContent());
    }

    public function testConnectReturnsSafeStatus(): void
    {
        $user = new User('76561198000000000', 'Test');
        $connection = new SteamMatchHistoryConnection(
            $user->getId(),
            $user->getSteamId(),
            'ciphertext-secret',
            'fingerprint',
            'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
            Uuid::v7(),
            new \DateTimeImmutable('2026-05-18T12:00:00+00:00')
        );

        $connect = $this->createMock(ConnectSteamMatchHistoryService::class);
        $connect->method('connect')->willReturn($connection);

        $response = $this->controller($user, connect: $connect)->connect($this->jsonRequest([
            'steamidkey' => 'secret-code',
            'seed' => 'steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-EdFZn-X7w2U-CqbxT-B26nM-TSveM',
        ], $user->getSteamId()));

        self::assertSame(201, $response->getStatusCode());
        $body = (string) $response->getContent();
        self::assertStringContainsString('known_sharecode', $body);
        self::assertStringNotContainsString('secret-code', $body);
        self::assertStringNotContainsString('ciphertext-secret', $body);
        self::assertStringNotContainsString('steamidkey', $body);
    }

    public function testDisconnectReturnsSafeDisconnectedStatus(): void
    {
        $user = new User('76561198000000000', 'Test');
        $connection = new SteamMatchHistoryConnection(
            $user->getId(),
            $user->getSteamId(),
            'ciphertext-secret',
            'fingerprint',
            'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE'
        );
        $connection->disconnect();
        $disconnect = $this->createMock(DisconnectSteamMatchHistoryService::class);
        $disconnect->method('disconnect')->willReturn($connection);

        $response = $this->controller($user, disconnect: $disconnect)->disconnect($this->jsonRequest([], $user->getSteamId()));

        self::assertSame(200, $response->getStatusCode());
        $body = (string) $response->getContent();
        self::assertStringContainsString('disconnected', $body);
        self::assertStringNotContainsString('ciphertext-secret', $body);
    }

    private function controller(
        ?User $user = null,
        ?ConnectSteamMatchHistoryService $connect = null,
        ?DisconnectSteamMatchHistoryService $disconnect = null,
    ): SteamMatchHistoryController {
        $users = $this->createMock(UserRepository::class);
        $users->method('findBySteamId')->willReturn($user);

        return new SteamMatchHistoryController(
            $users,
            $connect ?? $this->createMock(ConnectSteamMatchHistoryService::class),
            $disconnect ?? $this->createMock(DisconnectSteamMatchHistoryService::class),
            new SteamMatchHistoryStatusProvider(new class($user) extends \App\Infrastructure\Persistence\SteamMatchHistoryConnectionRepository {
                public function __construct(private ?User $user) {}
                public function findForUserSteamId(Uuid $userId, string $steamId): ?SteamMatchHistoryConnection { return null; }
            }),
            new ApiErrorResponder(),
            'change-me-in-local-env'
        );
    }

    /** @param array<string, mixed> $body */
    private function jsonRequest(array $body, string $steamId): Request
    {
        return new Request(
            server: ['HTTP_AUTHORIZATION' => 'Bearer '.$this->jwtForSteamId($steamId)],
            content: json_encode($body, JSON_THROW_ON_ERROR)
        );
    }

    private function jwtForSteamId(string $steamId): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode([
            'sub' => $steamId,
            'steam_id' => $steamId,
            'exp' => time() + 3600,
        ], JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', "{$header}.{$payload}", 'change-me-in-local-env', true);

        return "{$header}.{$payload}.".$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
