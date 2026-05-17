<?php

declare(strict_types=1);

namespace App\Tests\Repository;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class UserRepositoryTest extends KernelTestCase
{
    private UserRepository $userRepository;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->userRepository = self::getContainer()->get(UserRepository::class);
    }

    public function testFindBySteamIdReturnsUserWhenExists(): void
    {
        // Create a user
        $user = new User('123456789', 'TestPlayer', 'https://avatars.example.com/avatar.jpg');
        $this->userRepository->getEntityManager()->persist($user);
        $this->userRepository->getEntityManager()->flush();

        // Find the user by steam_id
        $found = $this->userRepository->findBySteamId('123456789');

        $this->assertNotNull($found);
        $this->assertEquals('123456789', $found->getSteamId());
        $this->assertEquals('TestPlayer', $found->getUsername());
    }

    public function testFindBySteamIdReturnsNullWhenNotExists(): void
    {
        // Find a non-existent user
        $found = $this->userRepository->findBySteamId('999999999');

        $this->assertNull($found);
    }

    public function testCreateOrUpdateCreatesNewUser(): void
    {
        // Create a user via repository
        $user = $this->userRepository->createOrUpdate(
            '987654321',
            'NewPlayer',
            'https://avatars.example.com/new.jpg',
            'player@example.com'
        );

        $this->assertNotNull($user->getId());
        $this->assertEquals('987654321', $user->getSteamId());
        $this->assertEquals('NewPlayer', $user->getUsername());
        $this->assertEquals('https://avatars.example.com/new.jpg', $user->getAvatarUrl());
        $this->assertEquals('player@example.com', $user->getEmail());
    }

    public function testCreateOrUpdateUpdatesExistingUser(): void
    {
        // Create initial user
        $user = $this->userRepository->createOrUpdate(
            '555555555',
            'OldName',
            'https://avatars.example.com/old.jpg'
        );
        $initialId = $user->getId();
        $createdAt = $user->getCreatedAt();

        // Update the same user
        $updated = $this->userRepository->createOrUpdate(
            '555555555',
            'NewName',
            'https://avatars.example.com/new.jpg',
            'newemail@example.com'
        );

        $this->assertEquals($initialId, $updated->getId());
        $this->assertEquals('NewName', $updated->getUsername());
        $this->assertEquals('https://avatars.example.com/new.jpg', $updated->getAvatarUrl());
        $this->assertEquals('newemail@example.com', $updated->getEmail());
        $this->assertEquals($createdAt, $updated->getCreatedAt());
        $this->assertGreaterThanOrEqual($createdAt, $updated->getUpdatedAt());
    }

    public function testCreateOrUpdateDoesNotCreateDuplicateUsers(): void
    {
        // Create a user
        $this->userRepository->createOrUpdate(
            '111111111',
            'Player1',
            'https://avatars.example.com/p1.jpg'
        );

        // Count users with steam_id 111111111
        $qb = $this->userRepository->createQueryBuilder('u');
        $count = $qb->select('COUNT(u.id)')
            ->where('u.steamId = :steamId')
            ->setParameter('steamId', '111111111')
            ->getQuery()
            ->getSingleScalarResult();

        $this->assertEquals(1, $count);

        // Update the user again
        $this->userRepository->createOrUpdate(
            '111111111',
            'Player1Updated',
            'https://avatars.example.com/p1_updated.jpg'
        );

        // Verify still only one user
        $count = $this->userRepository->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('u.steamId = :steamId')
            ->setParameter('steamId', '111111111')
            ->getQuery()
            ->getSingleScalarResult();

        $this->assertEquals(1, $count);
    }

    public function testCountReturnsCorrectNumber(): void
    {
        // Create 3 users
        $this->userRepository->createOrUpdate('222222222', 'Player2', null);
        $this->userRepository->createOrUpdate('333333333', 'Player3', null);
        $this->userRepository->createOrUpdate('444444444', 'Player4', null);

        $count = $this->userRepository->count();

        $this->assertGreaterThanOrEqual(3, $count);
    }
}
