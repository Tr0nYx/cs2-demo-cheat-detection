<?php
declare(strict_types=1);

namespace App\Application\Import;

final readonly class SharecodeValidator
{
    // CS2 sharecode format: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    private const SHARECODE_PATTERN = '/^CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i';
    private const MAX_LENGTH = 34;

    public static function validate(string $sharecode): bool
    {
        $normalized = self::normalize($sharecode);

        // Length check
        if (strlen($normalized) !== self::MAX_LENGTH) {
            return false;
        }

        // Format check
        return (bool) preg_match(self::SHARECODE_PATTERN, $normalized);
    }

    public static function normalize(string $sharecode): string
    {
        // CS2 sharecodes are case-sensitive — Valve's API rejects uppercased codes (HTTP 412).
        // Only trim whitespace; preserve original casing.
        return trim($sharecode);
    }
}
