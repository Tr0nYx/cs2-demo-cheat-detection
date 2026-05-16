<?php
declare(strict_types=1);

namespace App\Infrastructure\Import;

use Psr\Cache\CacheItemPoolInterface;

final readonly class RateLimiter
{
    private const MAX_REQUESTS = 10;
    private const WINDOW_SECONDS = 3600; // 1 hour
    private const KEY_PREFIX = 'import_limit:';

    public function __construct(
        private CacheItemPoolInterface $cache,
    ) {
    }

    public function isAllowed(string $userId): bool
    {
        $key = self::KEY_PREFIX . $userId;
        $item = $this->cache->getItem($key);

        if (!$item->isHit()) {
            // First request in window
            $item->set(1);
            $item->expiresAfter(self::WINDOW_SECONDS);
            $this->cache->save($item);
            return true;
        }

        $count = (int) $item->get();

        if ($count < self::MAX_REQUESTS) {
            // Increment counter
            $item->set($count + 1);
            $this->cache->save($item);
            return true;
        }

        // Limit exceeded
        return false;
    }

    public function remaining(string $userId): int
    {
        $key = self::KEY_PREFIX . $userId;
        $item = $this->cache->getItem($key);

        if (!$item->isHit()) {
            return self::MAX_REQUESTS;
        }

        $count = (int) $item->get();
        return max(0, self::MAX_REQUESTS - $count);
    }

    public function remainingTime(string $userId): int
    {
        $key = self::KEY_PREFIX . $userId;
        $item = $this->cache->getItem($key);

        if (!$item->isHit()) {
            return 0;
        }

        // Symfony cache doesn't expose TTL directly; return estimated based on WINDOW_SECONDS
        // In production, use Redis client directly for precise TTL
        return self::WINDOW_SECONDS;
    }
}
