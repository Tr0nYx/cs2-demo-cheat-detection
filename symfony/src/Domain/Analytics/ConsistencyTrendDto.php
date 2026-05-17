<?php

declare(strict_types=1);

namespace App\Domain\Analytics;

final readonly class ConsistencyTrendDto
{
    public const MIN_DEMOS = 5;

    /** @param list<VarianceBandDto> $bands @param list<string> $flaggedDates */
    public function __construct(
        public array $bands,
        public array $flaggedDates = [],
        public ?string $message = null,
    ) {
    }

    /** @return array{bands: list<array<string, mixed>>, flaggedDates: list<string>, minDemosRequirement: int, message: string|null} */
    public function toArray(): array
    {
        return [
            'bands' => array_map(static fn (VarianceBandDto $band) => $band->toArray(), $this->bands),
            'flaggedDates' => $this->flaggedDates,
            'minDemosRequirement' => self::MIN_DEMOS,
            'message' => $this->message,
        ];
    }
}
