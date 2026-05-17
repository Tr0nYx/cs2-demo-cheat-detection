<?php

declare(strict_types=1);

namespace App\Application\Auth;

/**
 * Steam OpenID verification request DTO
 *
 * Holds OpenID assertion parameters from next-auth callback
 */
class SteamVerifyRequest
{
    /**
     * @var array<string, string>
     */
    private array $openidParams = [];

    public function __construct(array $data = [])
    {
        // Accept all OpenID parameters
        $this->openidParams = $data;
    }

    /**
     * Get all OpenID parameters
     *
     * @return array<string, string>
     */
    public function getOpenidParams(): array
    {
        return $this->openidParams;
    }

    /**
     * Get a specific OpenID parameter
     *
     * @param string $key Parameter key
     * @param mixed $default Default value if not found
     * @return mixed
     */
    public function getParam(string $key, mixed $default = null): mixed
    {
        return $this->openidParams[$key] ?? $default;
    }

    /**
     * Check if OpenID parameter exists
     *
     * @param string $key Parameter key
     * @return bool
     */
    public function hasParam(string $key): bool
    {
        return isset($this->openidParams[$key]);
    }
}
