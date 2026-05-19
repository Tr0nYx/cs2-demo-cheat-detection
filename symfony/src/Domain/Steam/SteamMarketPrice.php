<?php

declare(strict_types=1);

namespace App\Domain\Steam;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\SteamMarketPriceRepository::class)]
#[ORM\Table(name: 'steam_market_price')]
#[ORM\Index(name: 'idx_steam_market_price_lookup', columns: ['app_id', 'market_hash_name', 'currency', 'source'])]
class SteamMarketPrice
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    public function __construct(
        #[ORM\Column(name: 'app_id')]
        private int $appId,
        #[ORM\Column(name: 'market_hash_name', length: 512)]
        private string $marketHashName,
        #[ORM\Column(length: 8)]
        private string $currency,
        #[ORM\Column(length: 64)]
        private string $source,
        #[ORM\Column(nullable: true)]
        private ?float $price,
        #[ORM\Column(nullable: true)]
        private ?int $volume,
        #[ORM\Column(name: 'fetched_at', type: Types::DATETIME_IMMUTABLE)]
        private \DateTimeImmutable $fetchedAt,
        #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
        private \DateTimeImmutable $expiresAt,
        #[ORM\Column(name: 'error_code', length: 64, nullable: true)]
        private ?string $errorCode = null,
        #[ORM\Column(name: 'error_message', type: Types::TEXT, nullable: true)]
        private ?string $errorMessage = null,
        ?Uuid $id = null,
    ) {
        $this->id = $id ?? Uuid::v7();
    }

    public function getId(): Uuid { return $this->id; }
    public function getAppId(): int { return $this->appId; }
    public function getMarketHashName(): string { return $this->marketHashName; }
    public function getCurrency(): string { return $this->currency; }
    public function getSource(): string { return $this->source; }
    public function getPrice(): ?float { return $this->price; }
    public function getVolume(): ?int { return $this->volume; }
    public function getFetchedAt(): \DateTimeImmutable { return $this->fetchedAt; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function getErrorCode(): ?string { return $this->errorCode; }
    public function getErrorMessage(): ?string { return $this->errorMessage; }
    public function isFresh(?\DateTimeImmutable $now = null): bool
    {
        return $this->expiresAt > ($now ?? new \DateTimeImmutable());
    }
}
