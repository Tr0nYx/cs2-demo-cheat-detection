<?php

declare(strict_types=1);

namespace App\Infrastructure\Steam;

final readonly class SteamMatchHistoryResult
{
    private function __construct(
        public string $status,
        public ?string $nextCode = null,
        public ?string $errorCode = null,
        public ?string $errorMessage = null,
        public ?int $retryAfterSeconds = null,
    ) {
    }

    public static function nextCode(string $sharecode): self
    {
        return new self('next_code', $sharecode);
    }

    public static function caughtUp(): self
    {
        return new self('caught_up');
    }

    public static function authFailed(): self
    {
        return new self('auth_failed', errorCode: 'auth_failed');
    }

    public static function invalidSeed(): self
    {
        return new self('invalid_seed', errorCode: 'invalid_seed');
    }

    public static function rateLimited(?int $retryAfterSeconds = null): self
    {
        return new self('rate_limited', errorCode: 'rate_limited', retryAfterSeconds: $retryAfterSeconds);
    }

    public static function steamUnavailable(string $code = 'steam_unavailable', ?string $message = null, ?int $retryAfterSeconds = null): self
    {
        return new self('steam_unavailable', errorCode: $code, errorMessage: $message, retryAfterSeconds: $retryAfterSeconds);
    }

    public static function malformedResponse(?string $message = null): self
    {
        return new self('malformed_response', errorCode: 'malformed_response', errorMessage: $message);
    }

    public function isNextCode(): bool
    {
        return $this->status === 'next_code' && $this->nextCode !== null;
    }
}
