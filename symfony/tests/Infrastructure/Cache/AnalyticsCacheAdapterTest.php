<?php

declare(strict_types=1);

namespace App\Tests\Infrastructure\Cache;

use App\Infrastructure\Cache\AnalyticsCacheAdapter;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class AnalyticsCacheAdapterTest extends KernelTestCase
{
    private AnalyticsCacheAdapter $cache;
    private CacheItemPoolInterface $pool;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->cache = self::getContainer()->get(AnalyticsCacheAdapter::class);
        $this->pool = self::getContainer()->get(CacheItemPoolInterface::class);
        $this->pool->clear();
    }

    public function testSetAndGetCacheValue(): void
    {
        $this->cache->set('player-a', 'consistency', ['ok' => true], 30);

        self::assertSame(['ok' => true], $this->cache->get('player-a', 'consistency', 30));
    }

    public function testInvalidateClearsTrendKeys(): void
    {
        $this->cache->set('player-a', 'consistency', ['ok' => true], 30);
        $this->cache->set('player-a', 'arc', ['ok' => true], 999);
        $this->cache->set('player-a', 'weapons', ['ok' => true], 999);

        $this->cache->invalidate('player-a');

        self::assertNull($this->cache->get('player-a', 'consistency', 30));
        self::assertNull($this->cache->get('player-a', 'arc', 999));
        self::assertNull($this->cache->get('player-a', 'weapons', 999));
    }
}
