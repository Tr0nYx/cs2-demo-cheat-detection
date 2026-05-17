<?php

declare(strict_types=1);

namespace App\Infrastructure\Cache;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

class DemoHeatmapCacheRepository
{
    private const TTL_SECONDS = 604800;

    public function __construct(
        #[Autowire(env: 'REDIS_URL')]
        private readonly string $redisUrl,
        #[Autowire(param: 'heatmap_storage_path')]
        private readonly string $storageRoot,
    ) {
    }

    public function fetchBytes(string $demoId, ?string $player, string $type, ?int $roundFrom, ?int $roundTo): ?string
    {
        $redis = $this->redis();
        $value = $redis->get($this->key($demoId, $player, $type, $roundFrom, $roundTo));
        $redis->close();

        if (!is_string($value) || $value === '') {
            return null;
        }

        $bytes = base64_decode($value, true);

        return is_string($bytes) && str_starts_with($bytes, "\x89PNG\r\n\x1a\n") ? $bytes : null;
    }

    public function storeBytes(string $demoId, ?string $player, string $type, ?int $roundFrom, ?int $roundTo, string $bytes): void
    {
        if (!str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) {
            throw new \InvalidArgumentException('Heatmap cache only accepts PNG bytes.');
        }

        $redis = $this->redis();
        $redis->setex($this->key($demoId, $player, $type, $roundFrom, $roundTo), self::TTL_SECONDS, base64_encode($bytes));
        $redis->close();
    }

    public function filePathFor(string $demoId, ?string $player, string $type, ?int $roundFrom, ?int $roundTo): string
    {
        $playerPart = $this->safePart($player ?? 'all');
        $roundPart = $roundFrom === null && $roundTo === null ? 'all' : sprintf('%s-%s', $roundFrom ?? 'start', $roundTo ?? 'end');

        return rtrim($this->storageRoot, '/\\').DIRECTORY_SEPARATOR.$this->safePart($demoId).DIRECTORY_SEPARATOR.sprintf(
            '%s_%s_%s.png',
            $this->safePart($type),
            $playerPart,
            $this->safePart($roundPart),
        );
    }

    public function fetchFile(string $demoId, ?string $player, string $type, ?int $roundFrom, ?int $roundTo): ?string
    {
        $path = $this->filePathFor($demoId, $player, $type, $roundFrom, $roundTo);

        if (!is_file($path) || !is_readable($path)) {
            return null;
        }

        $bytes = file_get_contents($path);

        return is_string($bytes) && str_starts_with($bytes, "\x89PNG\r\n\x1a\n") ? $bytes : null;
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

    private function key(string $demoId, ?string $player, string $type, ?int $roundFrom, ?int $roundTo): string
    {
        return sprintf(
            'heatmap:%s:%s:%s:%s',
            $demoId,
            $player ?? 'all',
            $type,
            $roundFrom === null && $roundTo === null ? 'all' : sprintf('%s-%s', $roundFrom ?? 'start', $roundTo ?? 'end'),
        );
    }

    private function safePart(string $value): string
    {
        return preg_replace('/[^A-Za-z0-9_.-]+/', '_', $value) ?? 'unknown';
    }
}
