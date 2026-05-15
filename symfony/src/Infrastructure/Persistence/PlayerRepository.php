<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Domain\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Player> */
final class PlayerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Player::class);
    }

    public function save(Player $player, bool $flush = true): void
    {
        $this->getEntityManager()->persist($player);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findOrCreateBySteamId(string $steamId, ?string $displayName = null): Player
    {
        $player = $this->findOneBy(['steamId' => $steamId]);

        if ($player instanceof Player) {
            if ($displayName !== null && $displayName !== $player->getDisplayName()) {
                $player->rename($displayName);
            }

            return $player;
        }

        $player = new Player($steamId, $displayName);
        $this->getEntityManager()->persist($player);

        return $player;
    }
}
