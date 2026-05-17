<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private EntityManagerInterface $entityManager
    ) {
        parent::__construct($registry, User::class);
    }

    /**
     * Find user by Steam ID
     *
     * @param string $steamId Steam ID to search for
     * @return User|null User entity if found, null otherwise
     */
    public function findBySteamId(string $steamId): ?User
    {
        return $this->findOneBy(['steamId' => $steamId]);
    }

    /**
     * Create or update user from Steam data
     *
     * Creates a new user if one doesn't exist with the given Steam ID,
     * otherwise updates the existing user's profile information.
     *
     * @param string $steamId Steam ID from OpenID
     * @param string $username Steam personaname
     * @param string|null $avatarUrl URL to Steam avatar (HTTPS)
     * @param string|null $email User email (optional, reserved for Phase 15+)
     * @return User The created or updated user entity
     */
    public function createOrUpdate(
        string $steamId,
        string $username,
        ?string $avatarUrl = null,
        ?string $email = null
    ): User {
        $user = $this->findBySteamId($steamId);

        if (!$user) {
            // Create new user
            $user = new User($steamId, $username, $avatarUrl, $email);
            $this->entityManager->persist($user);
        } else {
            // Update existing user
            $user->updateFromSteam($username, $avatarUrl, $email);
        }

        $this->entityManager->flush();

        return $user;
    }

    /**
     * Get paginated list of all users
     *
     * @param int $limit Maximum number of users to return
     * @param int $offset Number of users to skip
     * @return array<User>
     */
    public function findAll(int $limit = 100, int $offset = 0): array
    {
        return $this->createQueryBuilder('u')
            ->orderBy('u.createdAt', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Count total users
     *
     * @param array<string, mixed> $criteria Optional criteria (for compatibility with parent)
     * @return int Total number of users
     */
    public function count(array $criteria = []): int
    {
        if ($criteria) {
            return parent::count($criteria);
        }

        return (int) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->getQuery()
            ->getSingleScalarResult();
    }
}
