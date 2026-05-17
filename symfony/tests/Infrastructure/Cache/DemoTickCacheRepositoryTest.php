<?php

declare(strict_types=1);

namespace App\Tests\Infrastructure\Cache;

use App\Infrastructure\Cache\DemoTickCacheRepository;
use PHPUnit\Framework\TestCase;

final class DemoTickCacheRepositoryTest extends TestCase
{
    public function testStoresFetchesAndInvalidatesCompressedPayloads(): void
    {
        $redis = new InMemoryRedis();
        $repository = new class($redis) extends DemoTickCacheRepository {
            public function __construct(private readonly InMemoryRedis $fakeRedis)
            {
                parent::__construct('redis://localhost:6379');
            }

            protected function redis(): object
            {
                return $this->fakeRedis;
            }
        };

        $payload = [
            'demo_id' => 'demo-1',
            'ticks' => [
                ['tick' => 100, 'players' => [['steam_id' => '76561198000000001', 'x' => 1.5, 'y' => -2.0]]],
            ],
        ];

        $repository->store('demo-1', 100, 200, 4, $payload);

        self::assertSame($payload, $repository->fetch('demo-1', 100, 200, 4));

        $repository->invalidate('demo-1');

        self::assertNull($repository->fetch('demo-1', 100, 200, 4));
    }
}

final class InMemoryRedis
{
    /** @var array<string, string> */
    private array $values = [];

    public function setex(string $key, int $ttl, string $value): bool
    {
        $this->values[$key] = $value;

        return $ttl > 0;
    }

    public function get(string $key): string|false
    {
        return $this->values[$key] ?? false;
    }

    /** @return list<string> */
    public function keys(string $pattern): array
    {
        $regex = '/^'.str_replace('\*', '.*', preg_quote($pattern, '/')).'$/';

        return array_values(array_filter(
            array_keys($this->values),
            static fn (string $key): bool => preg_match($regex, $key) === 1,
        ));
    }

    /** @param string|list<string> $keys */
    public function del(string|array $keys): int
    {
        $deleted = 0;
        foreach ((array) $keys as $key) {
            if (array_key_exists($key, $this->values)) {
                unset($this->values[$key]);
                ++$deleted;
            }
        }

        return $deleted;
    }

    public function close(): void
    {
    }
}
