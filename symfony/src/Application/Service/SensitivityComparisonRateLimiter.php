<?php

declare(strict_types=1);

namespace App\Application\Service;

use Psr\Cache\CacheItemPoolInterface;

final readonly class SensitivityComparisonRateLimiter
{
    private const LIMIT = 10;
    private const WINDOW_SECONDS = 60;
    private const KEY_PREFIX = 'sensitivity_compare_';

    public function __construct(private CacheItemPoolInterface $cache)
    {
    }

    public function consume(string $userId): bool
    {
        $item = $this->cache->getItem(self::KEY_PREFIX.sha1($userId));

        if (!$item->isHit()) {
            $item->set(1);
            $item->expiresAfter(self::WINDOW_SECONDS);
            $this->cache->save($item);

            return true;
        }

        $count = (int) $item->get();
        if ($count >= self::LIMIT) {
            return false;
        }

        $item->set($count + 1);
        $this->cache->save($item);

        return true;
    }
}
