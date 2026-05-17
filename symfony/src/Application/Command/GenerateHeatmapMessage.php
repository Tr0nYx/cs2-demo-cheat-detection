<?php

declare(strict_types=1);

namespace App\Application\Command;

final readonly class GenerateHeatmapMessage
{
    public function __construct(
        public string $demoId,
        public string $heatmapType,
        public ?string $playerSteamId = null,
        public ?int $roundFrom = null,
        public ?int $roundTo = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function toPayload(): array
    {
        return [
            'type' => 'generate_heatmap',
            'demo_id' => $this->demoId,
            'heatmap_type' => $this->heatmapType,
            'player_steam_id' => $this->playerSteamId,
            'round_from' => $this->roundFrom,
            'round_to' => $this->roundTo,
        ];
    }
}
