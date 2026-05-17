<?php

declare(strict_types=1);

namespace App\Infrastructure\Queue;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final readonly class RedisViewerJobPublisher
{
    public function __construct(
        #[Autowire(env: 'REDIS_URL')]
        private string $redisUrl,
        #[Autowire(param: 'python_viewer_queue')]
        private string $queueName,
    ) {
    }

    /** @param array<string, mixed> $payload */
    public function publish(array $payload): void
    {
        $redis = $this->connect();
        $redis->lPush($this->queueName, json_encode($payload, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
        $redis->close();
    }

    private function connect(): \Redis
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
}
