<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserRefreshToken;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserRefreshToken>
 */
class UserRefreshTokenRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private EntityManagerInterface $entityManager
    ) {
        parent::__construct($registry, UserRefreshToken::class);
    }

    /**
     * Find all tokens for a specific user
     *
     * @param User $user User entity
     * @return array<UserRefreshToken>
     */
    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }

    /**
     * Find valid (non-expired) tokens for a user
     *
     * @param User $user User entity
     * @return array<UserRefreshToken> Non-expired tokens
     */
    public function findValidTokens(User $user): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.expiresAt > :now')
            ->setParameter('user', $user)
            ->setParameter('now', new DateTimeImmutable())
            ->getQuery()
            ->getResult();
    }

    /**
     * Create and store a new refresh token
     *
     * @param User $user User entity
     * @param string $tokenHash SHA256 hash of the refresh token (never store plaintext)
     * @param DateTimeImmutable $expiresAt Token expiry timestamp
     * @return UserRefreshToken The created token entity
     */
    public function createToken(
        User $user,
        string $tokenHash,
        DateTimeImmutable $expiresAt
    ): UserRefreshToken {
        $token = new UserRefreshToken($user, $tokenHash, $expiresAt);
        $this->entityManager->persist($token);
        $this->entityManager->flush();

        return $token;
    }

    /**
     * Delete all expired tokens
     *
     * @return int Number of tokens deleted
     */
    public function deleteExpiredTokens(): int
    {
        return $this->createQueryBuilder('t')
            ->delete()
            ->where('t.expiresAt <= :now')
            ->setParameter('now', new DateTimeImmutable())
            ->getQuery()
            ->execute();
    }

    /**
     * Find token by its hash
     *
     * @param string $tokenHash SHA256 hash of the refresh token
     * @return UserRefreshToken|null Token entity if found and valid, null otherwise
     */
    public function findByTokenHash(string $tokenHash): ?UserRefreshToken
    {
        return $this->findOneBy(['tokenHash' => $tokenHash]);
    }
}
