<?php

declare(strict_types=1);

namespace App\Domain\Recoil;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'recoil_patterns')]
#[ORM\UniqueConstraint(name: 'uniq_recoil_patterns_weapon_version', columns: ['weapon_name', 'pattern_version', 'dataset_version'])]
#[ORM\Index(name: 'idx_recoil_patterns_weapon_active', columns: ['weapon_name', 'is_active'])]
#[ORM\Index(name: 'idx_recoil_patterns_created_at', columns: ['created_at'])]
class RecoilPattern
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** @param array<string, mixed> $quantilesJson @param array<string, mixed> $boundsJson */
    public function __construct(
        #[ORM\Column(name: 'weapon_name', length: 100)]
        private string $weaponName,
        #[ORM\Column(name: 'pattern_version', length: 100)]
        private string $patternVersion,
        #[ORM\Column(name: 'dataset_version', length: 100)]
        private string $datasetVersion,
        #[ORM\Column(name: 'quantiles_json', type: Types::JSON)]
        private array $quantilesJson,
        #[ORM\Column(name: 'bounds_json', type: Types::JSON)]
        private array $boundsJson,
        #[ORM\Column(name: 'percentile_90')]
        private float $percentile90,
        #[ORM\Column(name: 'is_active', options: ['default' => false])]
        private bool $isActive = false,
        #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
        private ?\DateTimeImmutable $createdAt = null,
        #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
        private ?\DateTimeImmutable $updatedAt = null,
        ?Uuid $id = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->createdAt ??= new \DateTimeImmutable();
        $this->updatedAt ??= new \DateTimeImmutable();
    }
}
