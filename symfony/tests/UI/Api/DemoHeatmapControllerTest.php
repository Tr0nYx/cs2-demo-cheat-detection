<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Demo\Demo;
use App\Infrastructure\Cache\DemoHeatmapCacheRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class DemoHeatmapControllerTest extends WebTestCase
{
    private const PNG_BYTES = "\x89PNG\r\n\x1a\nheatmap";

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        putenv('HEATMAP_STORAGE_PATH=/tmp/cs2-heatmaps-test');
        $_ENV['HEATMAP_STORAGE_PATH'] = '/tmp/cs2-heatmaps-test';
        $_SERVER['HEATMAP_STORAGE_PATH'] = '/tmp/cs2-heatmaps-test';
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement(
            'TRUNCATE demo_suspicious_kill, demo_grenade, demo_round, demo_heatmap, analysis_result, player, demo RESTART IDENTITY CASCADE',
        );
        $this->redis()->del($this->queueName());
        self::ensureKernelShutdown();
    }

    public function testHeatmapReturnsCachedRedisPngWithCacheHeaders(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemo();
        $cache = self::getContainer()->get(DemoHeatmapCacheRepository::class);
        $cache->storeBytes($demo->getIdString(), null, 'kills', null, null, self::PNG_BYTES);

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/heatmap?type=kills');

        self::assertResponseIsSuccessful();
        self::assertSame('image/png', $client->getResponse()->headers->get('content-type'));
        self::assertStringContainsString('max-age=604800', (string) $client->getResponse()->headers->get('cache-control'));
        self::assertSame(self::PNG_BYTES, $client->getResponse()->getContent());
    }

    public function testHeatmapReturnsCachedFilePng(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemo();
        $cache = self::getContainer()->get(DemoHeatmapCacheRepository::class);
        $path = $cache->filePathFor($demo->getIdString(), '76561198000000001', 'grenades', 1, 3);

        if (!is_dir(dirname($path))) {
            self::assertTrue(mkdir(dirname($path), 0775, true));
        }
        self::assertNotFalse(file_put_contents($path, self::PNG_BYTES));
        self::assertFileExists($path);

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/heatmap?type=grenades&player=76561198000000001&round_from=1&round_to=3');

        self::assertResponseIsSuccessful();
        self::assertSame('image/png', $client->getResponse()->headers->get('content-type'));
        self::assertSame(self::PNG_BYTES, $client->getResponse()->getContent());
    }

    public function testHeatmapMissQueuesGenerationJob(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemo();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/heatmap?type=damage&round_from=2&round_to=4');

        self::assertResponseStatusCodeSame(202);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('generating', $payload['status']);
        self::assertSame('5', $client->getResponse()->headers->get('retry-after'));

        $jobs = $this->redis()->lRange($this->queueName(), 0, -1);
        self::assertCount(1, $jobs);
        $job = json_decode($jobs[0], true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('generate_heatmap', $job['type']);
        self::assertSame($demo->getIdString(), $job['demo_id']);
        self::assertSame('damage', $job['heatmap_type']);
        self::assertSame(2, $job['round_from']);
        self::assertSame(4, $job['round_to']);
    }

    public function testHeatmapRejectsInvalidTypeAndRounds(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemo();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/heatmap?type=proof');
        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_heatmap_type', $payload['error']['code']);

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/heatmap?type=kills&round_from=5&round_to=2');
        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_round_range', $payload['error']['code']);
    }

    private function persistAnalyzedDemo(): Demo
    {
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/heatmap.dem', originalFilename: 'heatmap.dem');
        $demo->markDone(new \DateTimeImmutable('2026-05-17T12:00:00+00:00'));
        $entityManager->persist($demo);
        $entityManager->flush();

        return $demo;
    }

    private function redis(): \Redis
    {
        $url = getenv('REDIS_URL') ?: 'redis://redis:6379';
        $parts = parse_url($url);
        $redis = new \Redis();
        $redis->connect($parts['host'] ?? 'redis', (int) ($parts['port'] ?? 6379));

        return $redis;
    }

    private function queueName(): string
    {
        return getenv('PYTHON_VIEWER_QUEUE') ?: 'cs2.viewer';
    }
}
