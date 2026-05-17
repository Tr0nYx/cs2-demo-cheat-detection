<?php

declare(strict_types=1);

namespace App\Infrastructure\Cache;

use Psr\Cache\CacheItemPoolInterface;

final readonly class AnalyticsCacheAdapter
{
    private const DEFAULT_TTL = 3600;

    public function __construct(private CacheItemPoolInterface $cache)
    {
    }

    public function get(string $userId, string $metric, int $windowDays = 30): mixed
    {
        try {
            $item = $this->cache->getItem($this->key($userId, $metric, $windowDays));

            return $item->isHit() ? $item->get() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public function set(string $userId, string $metric, mixed $value, int $windowDays = 30, int $ttl = self::DEFAULT_TTL): void
    {
        try {
            $item = $this->cache->getItem($this->key($userId, $metric, $windowDays));
            $item->set($value);
            $item->expiresAfter($ttl);
            $this->cache->save($item);
        } catch (\Throwable) {
        }
    }

    public function invalidate(string $userId): void
    {
        foreach ([['consistency', 30], ['arc', 999], ['weapons', 999]] as [$metric, $window]) {
            try {
                $this->cache->deleteItem($this->key($userId, $metric, $window));
            } catch (\Throwable) {
            }
        }
    }

    private function key(string $userId, string $metric, int $windowDays): string
    {
        return sprintf('trend_%s_%s_window%d', $metric, sha1($userId), $windowDays);
    }
}
