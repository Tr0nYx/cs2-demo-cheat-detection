<?php

declare(strict_types=1);

namespace App\UI\Api;

final class ApiProblem extends \RuntimeException
{
    /** @param array<string, mixed> $details */
    private function __construct(
        public readonly int $statusCode,
        public readonly string $errorCode,
        string $message,
        public readonly array $details = [],
    ) {
        parent::__construct($message);
    }

    /** @param array<string, mixed> $details */
    public static function badRequest(string $code, string $message, array $details = []): self
    {
        return new self(400, $code, $message, $details);
    }

    /** @param array<string, mixed> $details */
    public static function notFound(string $code, string $message, array $details = []): self
    {
        return new self(404, $code, $message, $details);
    }

    /** @param array<string, mixed> $details */
    public static function serverError(string $code, string $message, array $details = []): self
    {
        return new self(500, $code, $message, $details);
    }
}
