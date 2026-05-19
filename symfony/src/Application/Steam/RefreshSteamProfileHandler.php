<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Domain\Steam\SteamInventorySnapshot;
use App\Domain\Steam\SteamProfileSnapshot;
use App\Infrastructure\Persistence\SteamInventorySnapshotRepository;
use App\Infrastructure\Persistence\SteamProfileSnapshotRepository;
use App\Infrastructure\Steam\SteamInventoryClient;
use App\Infrastructure\Steam\SteamProfileClient;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class RefreshSteamProfileHandler
{
    public function __construct(
        private SteamProfileClient $profiles,
        private SteamInventoryClient $inventories,
        private SteamInventoryValuator $valuator,
        private SteamProfileSnapshotRepository $profileSnapshots,
        private SteamInventorySnapshotRepository $inventorySnapshots,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(RefreshSteamProfileMessage $message): void
    {
        $profile = $this->profiles->fetchSummary($message->steamId);
        $profileSnapshot = new SteamProfileSnapshot(
            steamId: $message->steamId,
            fetchedAt: new \DateTimeImmutable(),
            source: 'steam_get_player_summaries',
            visibilityState: $profile->visibilityState,
            personaName: $profile->personaName,
            avatarUrl: $profile->avatarUrl,
            profileUrl: $profile->profileUrl,
            profileState: $profile->profileState,
            communityVisibilityState: $profile->communityVisibilityState,
            timeCreated: $profile->timeCreated,
            lastLogoff: $profile->lastLogoff,
            rawPublicPayload: $profile->raw,
            errorCode: $profile->errorCode,
            errorMessage: $profile->errorMessage,
        );
        $this->profileSnapshots->save($profileSnapshot);

        $inventory = $this->inventories->fetchInventory($message->steamId);
        $valuation = $this->valuator->value($inventory->items);
        $tradable = count(array_filter($inventory->items, static fn ($item): bool => $item->tradable));
        $marketable = count(array_filter($inventory->items, static fn ($item): bool => $item->marketable));

        $inventorySnapshot = new SteamInventorySnapshot(
            steamId: $message->steamId,
            fetchedAt: new \DateTimeImmutable(),
            source: 'steam_community_inventory',
            visibilityState: $inventory->visibilityState,
            itemCount: count($inventory->items),
            tradableCount: $tradable,
            marketableCount: $marketable,
            estimatedValue: $valuation->estimatedValue,
            estimatedCurrency: $valuation->currency,
            pricedItemCount: $valuation->pricedItemCount,
            unpricedItemCount: $valuation->unpricedItemCount,
            rawPublicPayload: $inventory->raw,
            errorCode: $inventory->errorCode,
            errorMessage: $inventory->errorMessage,
        );
        $this->inventorySnapshots->save($inventorySnapshot);

        $this->logger->info('steam_profile_refresh_completed', [
            'steam_id' => $message->steamId,
            'tier' => $message->tier,
            'reason' => $message->reason,
            'profile_state' => $profile->visibilityState,
            'inventory_state' => $inventory->visibilityState,
            'inventory_items' => count($inventory->items),
        ]);
    }
}
