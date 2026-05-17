<?php

declare(strict_types=1);

namespace App\Infrastructure\Cache;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

class DemoTickCacheRepository
{
    private const TTL_SECONDS = 172800;

    public function __construct(
        #[Autowire(env: 'REDIS_URL')]
        private readonly string $redisUrl,
    ) {
    }

    /** @param array<string, mixed> $payload */
    public function store(string $demoId, int $fromTick, int $toTick, int $step, array $payload): void
    {
        $redis = $this->redis();
        $redis->setex($this->key($demoId, $fromTick, $toTick, $step), self::TTL_SECONDS, $this->encode($payload));
        $redis->close();
    }

    /** @return array<string, mixed>|null */
    public function fetch(string $demoId, int $fromTick, int $toTick, int $step): ?array
    {
        $redis = $this->redis();
        $value = $redis->get($this->key($demoId, $fromTick, $toTick, $step));
        $redis->close();

        if (!is_string($value) || $value === '') {
            return null;
        }

        return $this->decode($value);
    }

    public function invalidate(string $demoId): void
    {
        $redis = $this->redis();
        $keys = $redis->keys(sprintf('demo_ticks:%s:*', $demoId));

        if (is_array($keys) && $keys !== []) {
            $redis->del($keys);
        }

        $redis->close();
    }

    protected function redis(): object
    {
        $parts = parse_url($this->redisUrl);
        if ($parts === false || !isset($parts['host'])) {
            throw new \RuntimeException('Redis URL is invalid.');
        }

        $redis = new \Redis();
        $redis->connect($parts['host'], (int) ($parts['port'] ?? 6379), 2.0);

        if (isset($parts['pass'])) {
            $redis->auth($parts['pass']);
        }

        if (isset($parts['path'])) {
            $database = trim($parts['path'], '/');
            if ($database !== '' && ctype_digit($database)) {
                $redis->select((int) $database);
            }
        }

        return $redis;
    }

    private function key(string $demoId, int $fromTick, int $toTick, int $step): string
    {
        return sprintf('demo_ticks:%s:%d:%d:%d', $demoId, $fromTick, $toTick, $step);
    }

    /** @param array<string, mixed> $payload */
    private function encode(array $payload): string
    {
        $json = json_encode($payload, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
        $compressed = gzcompress($json);

        if ($compressed === false) {
            throw new \RuntimeException('Could not compress tick cache payload.');
        }

        return base64_encode($compressed);
    }

    /** @return array<string, mixed>|null */
    private function decode(string $payload): ?array
    {
        $compressed = base64_decode($payload, true);
        if ($compressed === false) {
            return null;
        }

        $json = gzuncompress($compressed);
        if (!is_string($json)) {
            return null;
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }
}
