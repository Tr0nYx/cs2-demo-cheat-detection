<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\Dto\PlayerStatsDTO;
use App\Application\Query\GetPlayerStatsQuery;
use App\Domain\Player\PlayerNotFoundException;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\PlayerStatsRepository;

final readonly class GetPlayerStatsHandler
{
    public function __construct(
        private PlayerRepository $players,
        private PlayerStatsRepository $stats,
    ) {
    }

    public function __invoke(GetPlayerStatsQuery $query): PlayerStatsDTO
    {
        $player = $this->players->findOneBy(['steamId' => $query->steamId]);
        if ($player === null) {
            throw PlayerNotFoundException::byId($query->steamId);
        }

        $since = $this->windowStart($query->window);
        $demoCount = $this->stats->countDemos($query->steamId, $since);

        return new PlayerStatsDTO(
            maps: $this->stats->getMapAffinity($query->steamId, $since),
            weapons: $this->stats->getWeaponStats($query->steamId, $since),
            metadata: [
                'dataWindow' => $query->window,
                'computedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                'demoCount' => $demoCount,
                'insufficientData' => $demoCount < 2,
            ],
        );
    }

    private function windowStart(string $window): ?\DateTimeImmutable
    {
        return match ($window) {
            '10d' => new \DateTimeImmutable('-10 days'),
            '30d' => new \DateTimeImmutable('-30 days'),
            default => null,
        };
    }
}
