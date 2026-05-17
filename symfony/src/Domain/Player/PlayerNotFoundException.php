<?php

declare(strict_types=1);

namespace App\Domain\Player;

/**
 * PlayerNotFoundException - Thrown when a requested player is not found.
 *
 * This is a domain-level exception indicating a resource (player) does not exist.
 * The HTTP layer should handle this as a 404 Not Found response.
 */
final class PlayerNotFoundException extends \Exception
{
    public static function byId(string $playerId): self
    {
        return new self("Player not found: {$playerId}");
    }

    public static function forComparison(string $playerId, string $compareWithId): self
    {
        $missing = "Player {$playerId}";
        if (empty($playerId)) {
            $missing = "Player {$compareWithId}";
        }
        return new self("One or both players not found for comparison: {$missing}");
    }
}
