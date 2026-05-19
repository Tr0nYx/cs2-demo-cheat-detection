<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class SteamExternalSignalShadowDto
{
    /** @param list<string> $coverageFlags */
    public function __construct(
        public string $steamId,
        public ?float $inventoryEstimatedValue,
        public ?string $inventoryEstimatedCurrency,
        public ?int $accountAgeDays,
        public ?string $profileVisibilityState,
        public ?string $inventoryVisibilityState,
        public ?int $profileSnapshotAgeDays,
        public ?int $inventorySnapshotAgeDays,
        public array $coverageFlags,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'steam_id' => $this->steamId,
            'inventory_estimated_value' => $this->inventoryEstimatedValue,
            'inventory_estimated_currency' => $this->inventoryEstimatedCurrency,
            'account_age_days' => $this->accountAgeDays,
            'profile_visibility_state' => $this->profileVisibilityState,
            'inventory_visibility_state' => $this->inventoryVisibilityState,
            'profile_snapshot_age_days' => $this->profileSnapshotAgeDays,
            'inventory_snapshot_age_days' => $this->inventorySnapshotAgeDays,
            'coverage_flags' => $this->coverageFlags,
        ];
    }
}
