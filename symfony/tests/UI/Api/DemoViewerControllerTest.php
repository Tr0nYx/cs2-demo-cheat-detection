<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Demo\Demo;
use App\Domain\Viewer\DemoGrenade;
use App\Domain\Viewer\DemoRound;
use App\Domain\Viewer\DemoSuspiciousKill;
use App\Infrastructure\Cache\DemoTickCacheRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class DemoViewerControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement(
            'TRUNCATE demo_suspicious_kill, demo_grenade, demo_round, demo_heatmap, analysis_result, player, demo RESTART IDENTITY CASCADE',
        );
        $this->redis()->del($this->queueName());
        self::ensureKernelShutdown();
    }

    public function testRoundsReturnsPersistedRoundMetadata(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = $this->analyzedDemo();

        $entityManager->persist($demo);
        $entityManager->persist(new DemoRound($demo, 1, 120, 1930, 'CT', 'elimination'));
        $entityManager->persist(new DemoRound($demo, 2, 2100, 3900, 'T', 'bomb_exploded'));
        $entityManager->flush();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/rounds');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(2, $payload['rounds']);
        self::assertSame(1, $payload['rounds'][0]['round_number']);
        self::assertSame(120, $payload['rounds'][0]['start_tick']);
        self::assertSame('CT', $payload['rounds'][0]['winner']);
    }

    public function testEventsCanBeFilteredByRoundAndPlayer(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = $this->analyzedDemo();

        $entityManager->persist($demo);
        $entityManager->persist(new DemoGrenade(
            $demo,
            1,
            300,
            '76561198000000001',
            'smoke',
            10.0,
            20.0,
            30.0,
            100.0,
            200.0,
            20.0,
            [['x' => 10.0, 'y' => 20.0, 'z' => 30.0, 'tick' => 300]],
            'Thrower',
        ));
        $entityManager->persist(new DemoGrenade($demo, 2, 600, '76561198000000002', 'flash', 1.0, 2.0, 3.0));
        $entityManager->persist(new DemoSuspiciousKill(
            $demo,
            1,
            450,
            '76561198000000001',
            '76561198000000003',
            0.82,
            ['high_reaction_review'],
            'ak47',
            true,
            'Attacker',
            'Victim',
        ));
        $entityManager->flush();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/events?type=all&round=1&player=76561198000000001');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(1, $payload['grenades']);
        self::assertCount(1, $payload['kills']);
        self::assertSame([], $payload['damage']);
        self::assertSame('smoke', $payload['grenades'][0]['type']);
        self::assertSame(0.82, $payload['kills'][0]['review_signal']['suspicion_score']);
        self::assertArrayNotHasKey('proof', $payload['kills'][0]);
    }

    public function testEventsRejectsInvalidFilters(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = $this->analyzedDemo();

        $entityManager->persist($demo);
        $entityManager->flush();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/events?type=proof');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_event_type', $payload['error']['code']);
    }

    public function testRoundsRequiresAnalyzedDemo(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/pending.dem', originalFilename: 'pending.dem');

        $entityManager->persist($demo);
        $entityManager->flush();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/rounds');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('demo_not_analyzed', $payload['error']['code']);
    }

    public function testTicksReturnsCachedPayloadWithDefaultStepAndPlayerFilter(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemoWithRound();
        $cache = self::getContainer()->get(DemoTickCacheRepository::class);
        $cache->store($demo->getIdString(), 100, 200, 4, [
            'demo_id' => $demo->getIdString(),
            'ticks' => [
                [
                    'tick' => 100,
                    'players' => [
                        ['steam_id' => '76561198000000001', 'x' => 1.0, 'y' => 2.0],
                        ['steam_id' => '76561198000000002', 'x' => 3.0, 'y' => 4.0],
                    ],
                ],
            ],
        ]);

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/ticks?round=1&players[]=76561198000000001');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('ready', $payload['status']);
        self::assertSame(4, $payload['step']);
        self::assertSame(100, $payload['from_tick']);
        self::assertSame(200, $payload['to_tick']);
        self::assertCount(1, $payload['ticks'][0]['players']);
        self::assertSame('76561198000000001', $payload['ticks'][0]['players'][0]['steam_id']);
    }

    public function testTicksMissQueuesExportJob(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemoWithRound();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/ticks?from_tick=100&to_tick=160&step=8');

        self::assertResponseStatusCodeSame(202);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('generating', $payload['status']);
        self::assertSame(8, $payload['step']);

        $jobs = $this->redis()->lRange($this->queueName(), 0, -1);
        self::assertCount(1, $jobs);
        $job = json_decode($jobs[0], true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('export_ticks', $job['type']);
        self::assertSame($demo->getIdString(), $job['demo_id']);
        self::assertSame(100, $job['from_tick']);
        self::assertSame(160, $job['to_tick']);
        self::assertSame(8, $job['step']);
    }

    public function testTicksRejectsInvalidParams(): void
    {
        $client = self::createClient();
        $demo = $this->persistAnalyzedDemoWithRound();

        $client->request('GET', '/api/demos/'.$demo->getIdString().'/ticks?from_tick=200&to_tick=100');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_tick_range', $payload['error']['code']);
    }

    private function analyzedDemo(): Demo
    {
        $demo = new Demo('/storage/demos/viewer.dem', originalFilename: 'viewer.dem');
        $demo->markDone(new \DateTimeImmutable('2026-05-17T12:00:00+00:00'));

        return $demo;
    }

    private function persistAnalyzedDemoWithRound(): Demo
    {
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = $this->analyzedDemo();
        $entityManager->persist($demo);
        $entityManager->persist(new DemoRound($demo, 1, 100, 200));
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
