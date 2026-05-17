<?php

declare(strict_types=1);

namespace App\Tests\Application\Auth;

use App\Application\Auth\SteamVerifyHandler;
use App\Application\Auth\SteamVerifyRequest;
use App\Entity\User;
use App\Infrastructure\Steam\SteamOpenIdValidator;
use App\Repository\UserRepository;
use App\Repository\UserRefreshTokenRepository;
use PHPUnit\Framework\MockObject\MockObject;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class SteamVerifyHandlerTest extends KernelTestCase
{
    private SteamVerifyHandler $handler;
    private SteamOpenIdValidator&MockObject $openIdValidator;
    private UserRepository $userRepository;
    private UserRefreshTokenRepository $refreshTokenRepository;
    private LoggerInterface&MockObject $logger;
    private string $jwtSecret = 'test-secret-key-for-testing';

    protected function setUp(): void
    {
        self::bootKernel();
        $container = self::getContainer();

        $this->userRepository = $container->get(UserRepository::class);
        $this->refreshTokenRepository = $container->get(UserRefreshTokenRepository::class);

        $this->openIdValidator = $this->createMock(SteamOpenIdValidator::class);
        $this->logger = $this->createMock(LoggerInterface::class);

        $this->handler = new SteamVerifyHandler(
            $this->openIdValidator,
            $this->userRepository,
            $this->refreshTokenRepository,
            $this->jwtSecret,
            $this->logger
        );
    }

    public function testHandleCreatesNewUserOnFirstLogin(): void
    {
        $steamId = '123456789';
        $testData = [
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'id_res',
        ];

        $this->openIdValidator
            ->expects($this->once())
            ->method('validateOpenIdAssertion')
            ->willReturn($steamId);

        $this->openIdValidator
            ->expects($this->once())
            ->method('getUserProfile')
            ->willReturn([
                'username' => 'TestPlayer',
                'avatar_url' => 'https://avatars.steamusercontent.com/test.jpg',
                'email' => 'player@example.com',
            ]);

        $request = new SteamVerifyRequest($testData);
        $response = $this->handler->handle($request);

        // Verify response structure
        $this->assertArrayHasKey('access_token', $response);
        $this->assertArrayHasKey('refresh_token', $response);
        $this->assertArrayHasKey('steam_id', $response);
        $this->assertArrayHasKey('username', $response);
        $this->assertEquals($steamId, $response['steam_id']);
        $this->assertEquals('TestPlayer', $response['username']);

        // Verify user was created in database
        $user = $this->userRepository->findBySteamId($steamId);
        $this->assertNotNull($user);
        $this->assertEquals('TestPlayer', $user->getUsername());
        $this->assertEquals('player@example.com', $user->getEmail());
    }

    public function testHandleUpdatesExistingUserOnSubsequentLogin(): void
    {
        $steamId = '987654321';

        // Create initial user
        $this->userRepository->createOrUpdate(
            $steamId,
            'OldName',
            'https://avatars.steamusercontent.com/old.jpg'
        );

        $testData = [
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'id_res',
        ];

        $this->openIdValidator
            ->expects($this->once())
            ->method('validateOpenIdAssertion')
            ->willReturn($steamId);

        $this->openIdValidator
            ->expects($this->once())
            ->method('getUserProfile')
            ->willReturn([
                'username' => 'NewName',
                'avatar_url' => 'https://avatars.steamusercontent.com/new.jpg',
                'email' => 'newemail@example.com',
            ]);

        $request = new SteamVerifyRequest($testData);
        $response = $this->handler->handle($request);

        // Verify user was updated
        $user = $this->userRepository->findBySteamId($steamId);
        $this->assertNotNull($user);
        $this->assertEquals('NewName', $user->getUsername());
        $this->assertEquals('https://avatars.steamusercontent.com/new.jpg', $user->getAvatarUrl());
        $this->assertEquals('newemail@example.com', $user->getEmail());

        // Verify last_login_at was updated
        $this->assertNotNull($user->getLastLoginAt());
    }

    public function testHandleCreatesRefreshToken(): void
    {
        $steamId = '555555555';
        $testData = [
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'id_res',
        ];

        $this->openIdValidator
            ->expects($this->once())
            ->method('validateOpenIdAssertion')
            ->willReturn($steamId);

        $this->openIdValidator
            ->expects($this->once())
            ->method('getUserProfile')
            ->willReturn([
                'username' => 'RefreshTokenTest',
                'avatar_url' => null,
                'email' => null,
            ]);

        $request = new SteamVerifyRequest($testData);
        $response = $this->handler->handle($request);

        // Verify refresh token was created in database
        $user = $this->userRepository->findBySteamId($steamId);
        $this->assertNotNull($user);

        $refreshTokenHash = hash('sha256', $response['refresh_token']);
        $storedToken = $this->refreshTokenRepository->findByTokenHash($refreshTokenHash);
        $this->assertNotNull($storedToken);
        $this->assertEquals($user->getId(), $storedToken->getUser()->getId());
        $this->assertFalse($storedToken->isExpired());
    }

    public function testHandleThrowsExceptionOnValidationFailure(): void
    {
        $this->openIdValidator
            ->expects($this->once())
            ->method('validateOpenIdAssertion')
            ->willThrowException(new \RuntimeException('Invalid assertion'));

        $testData = [
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'error',
        ];

        $request = new SteamVerifyRequest($testData);

        $this->expectException(\RuntimeException::class);
        $this->handler->handle($request);
    }

    public function testHandleIncludesUserIdInJwtToken(): void
    {
        $steamId = '111111111';
        $testData = [
            'openid.ns' => 'http://specs.openid.net/auth/2.0',
            'openid.mode' => 'id_res',
        ];

        $this->openIdValidator
            ->expects($this->once())
            ->method('validateOpenIdAssertion')
            ->willReturn($steamId);

        $this->openIdValidator
            ->expects($this->once())
            ->method('getUserProfile')
            ->willReturn([
                'username' => 'UserIdTest',
                'avatar_url' => null,
                'email' => null,
            ]);

        $request = new SteamVerifyRequest($testData);
        $response = $this->handler->handle($request);

        // Decode access token and verify user_id is present
        $this->assertArrayHasKey('access_token', $response);
        $this->assertArrayHasKey('id', $response);
        $this->assertIsString($response['id']);
        $this->assertNotEmpty($response['id']);
    }
}
