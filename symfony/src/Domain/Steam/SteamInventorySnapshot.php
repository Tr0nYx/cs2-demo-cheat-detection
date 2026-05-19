<?php

declare(strict_types=1);

namespace App\Domain\Steam;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: \App\Infrastructure\Persistence\SteamInventorySnapshotRepository::class)]
#[ORM\Table(name: 'steam_inventory_snapshot')]
#[ORM\Index(name: 'idx_steam_inventory_snapshot_steam_fetched', columns: ['steam_id', 'fetched_at'])]
#[ORM\Index(name: 'idx_steam_inventory_snapshot_visibility', columns: ['steam_id', 'visibility_state'])]
class SteamInventorySnapshot
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** @param array<string, mixed> $rawPublicPayload */
    public function __construct(
        #[ORM\Column(name: 'steam_id', length: 64)]
        private string $steamId,
        #[ORM\Column(name: 'fetched_at', type: Types::DATETIME_IMMUTABLE)]
        private \DateTimeImmutable $fetchedAt,
        #[ORM\Column(length: 64)]
        private string $source,
        #[ORM\Column(name: 'visibility_state', length: 32)]
        private string $visibilityState,
        #[ORM\Column(name: 'app_id')]
        private int $appId = 730,
        #[ORM\Column(name: 'context_id', length: 32)]
        private string $contextId = '2',
        #[ORM\Column(name: 'item_count')]
        private int $itemCount = 0,
        #[ORM\Column(name: 'tradable_count')]
        private int $tradableCount = 0,
        #[ORM\Column(name: 'marketable_count')]
        private int $marketableCount = 0,
        #[ORM\Column(name: 'estimated_value', nullable: true)]
        private ?float $estimatedValue = null,
        #[ORM\Column(name: 'estimated_currency', length: 8, nullable: true)]
        private ?string $estimatedCurrency = null,
        #[ORM\Column(name: 'priced_item_count')]
        private int $pricedItemCount = 0,
        #[ORM\Column(name: 'unpriced_item_count')]
        private int $unpricedItemCount = 0,
        #[ORM\Column(name: 'raw_public_payload', type: Types::JSON)]
        private array $rawPublicPayload = [],
        #[ORM\Column(name: 'error_code', length: 64, nullable: true)]
        private ?string $errorCode = null,
        #[ORM\Column(name: 'error_message', type: Types::TEXT, nullable: true)]
        private ?string $errorMessage = null,
        ?Uuid $id = null,
    ) {
        $this->id = $id ?? Uuid::v7();
    }

    public static function unavailable(string $steamId, string $source, string $visibilityState, string $errorCode, ?string $errorMessage = null): self
    {
        return new self($steamId, new \DateTimeImmutable(), $source, $visibilityState, errorCode: $errorCode, errorMessage: $errorMessage);
    }

    public function getId(): Uuid { return $this->id; }
    public function getSteamId(): string { return $this->steamId; }
    public function getFetchedAt(): \DateTimeImmutable { return $this->fetchedAt; }
    public function getSource(): string { return $this->source; }
    public function getVisibilityState(): string { return $this->visibilityState; }
    public function getAppId(): int { return $this->appId; }
    public function getContextId(): string { return $this->contextId; }
    public function getItemCount(): int { return $this->itemCount; }
    public function getTradableCount(): int { return $this->tradableCount; }
    public function getMarketableCount(): int { return $this->marketableCount; }
    public function getEstimatedValue(): ?float { return $this->estimatedValue; }
    public function getEstimatedCurrency(): ?string { return $this->estimatedCurrency; }
    public function getPricedItemCount(): int { return $this->pricedItemCount; }
    public function getUnpricedItemCount(): int { return $this->unpricedItemCount; }
    /** @return array<string, mixed> */
    public function getRawPublicPayload(): array { return $this->rawPublicPayload; }
    public function getErrorCode(): ?string { return $this->errorCode; }
    public function getErrorMessage(): ?string { return $this->errorMessage; }
}
