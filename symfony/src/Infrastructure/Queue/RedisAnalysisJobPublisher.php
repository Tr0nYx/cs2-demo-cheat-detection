<?php

declare(strict_types=1);

namespace App\Infrastructure\Queue;

use App\Domain\Demo\Demo;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final readonly class RedisAnalysisJobPublisher implements AnalysisJobPublisher
{
    public function __construct(
        #[Autowire(env: 'REDIS_URL')]
        private string $redisUrl,
        #[Autowire(param: 'python_worker_queue')]
        private string $queueName,
    ) {
    }

    public function publish(Demo $demo): void
    {
        $payload = json_encode([
            'demo_id' => $demo->getIdString(),
            'file_path' => $demo->getFilePath(),
            'queued_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], JSON_THROW_ON_ERROR);

        $redis = $this->connect();
        $redis->lPush($this->queueName, $payload);
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
