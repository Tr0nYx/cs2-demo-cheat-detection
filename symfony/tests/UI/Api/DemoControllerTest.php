<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class DemoControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE analysis_result, player, demo RESTART IDENTITY CASCADE');
        $this->redis()->del($this->queueName());
        self::ensureKernelShutdown();
    }

    public function testUploadDemoReturnsAcceptedDemoResponse(): void
    {
        $client = self::createClient();
        $path = tempnam(sys_get_temp_dir(), 'demo_');
        file_put_contents($path, 'CS2 demo bytes');
        $uploaded = new UploadedFile($path, 'match.dem', 'application/octet-stream', null, true);

        $client->request('POST', '/api/demos', ['steam_match_id' => 'match-123'], ['demo' => $uploaded]);

        self::assertResponseStatusCodeSame(202);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('queued', $payload['status']);
        self::assertArrayHasKey('demo_id', $payload);
        self::assertSame('/api/demos/'.$payload['demo_id'], $payload['status_url']);
        self::assertSame('match.dem', $payload['metadata']['original_filename']);
        self::assertStringEndsWith($payload['demo_id'].'.dem', $payload['metadata']['file_path']);

        $queuedJob = $this->redis()->lRange($this->queueName(), 0, -1);
        self::assertCount(1, $queuedJob);
        $jobPayload = json_decode($queuedJob[0], true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($payload['demo_id'], $jobPayload['demo_id']);
        self::assertSame($payload['metadata']['file_path'], $jobPayload['file_path']);
    }

    public function testUploadRejectsNonDemoExtension(): void
    {
        $client = self::createClient();
        $path = tempnam(sys_get_temp_dir(), 'demo_');
        file_put_contents($path, 'not a demo');
        $uploaded = new UploadedFile($path, 'match.txt', 'text/plain', null, true);

        $client->request('POST', '/api/demos', [], ['demo' => $uploaded]);

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_extension', $payload['error']['code']);
    }

    public function testShowUnknownDemoReturnsStableError(): void
    {
        $client = self::createClient();

        $client->request('GET', '/api/demos/11111111-1111-7111-8111-111111111111');

        self::assertResponseStatusCodeSame(404);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('demo_not_found', $payload['error']['code']);
    }

    public function testShowDemoIncludesResultsWhenPresent(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/result.dem', originalFilename: 'result.dem');
        $player = new Player('76561198000000001', 'Result Player');
        $result = new AnalysisResult(
            $demo,
            $player,
            24,
            0.1,
            0.2,
            0.3,
            0.4,
            0.5,
            0.6,
            0.51,
            SuspicionLabel::Suspicious,
        );
        $demo->markDone(new \DateTimeImmutable('2026-05-15T12:00:00+00:00'));

        $entityManager->persist($demo);
        $entityManager->persist($player);
        $entityManager->persist($result);
        $entityManager->flush();
        $entityManager->clear();

        $client->request('GET', '/api/demos/'.$demo->getIdString());

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('done', $payload['status']);
        self::assertCount(1, $payload['results']);
        self::assertSame('suspicious', $payload['results'][0]['label']);
        self::assertSame('76561198000000001', $payload['results'][0]['player']['steam_id']);
    }

    public function testListDemosReturnsEmptyWhenNoDemos(): void
    {
        $client = self::createClient();

        $client->request('GET', '/api/demos');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame([], $payload['demos']);
        self::assertSame(0, $payload['pagination']['total']);
        self::assertSame(1, $payload['pagination']['page']);
        self::assertSame(20, $payload['pagination']['limit']);
        self::assertFalse($payload['pagination']['hasMore']);
    }

    public function testListDemosWithPagination(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);

        // Create 5 demos
        for ($i = 0; $i < 5; $i++) {
            $demo = new Demo("/storage/demos/demo{$i}.dem", originalFilename: "demo{$i}.dem");
            $entityManager->persist($demo);
        }
        $entityManager->flush();
        $entityManager->clear();

        // Test page 1 with limit 3
        $client->request('GET', '/api/demos?page=1&limit=3');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(3, $payload['demos']);
        self::assertSame(5, $payload['pagination']['total']);
        self::assertSame(1, $payload['pagination']['page']);
        self::assertSame(3, $payload['pagination']['limit']);
        self::assertTrue($payload['pagination']['hasMore']);

        // Test page 2
        $client->request('GET', '/api/demos?page=2&limit=3');
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(2, $payload['demos']);
        self::assertSame(2, $payload['pagination']['page']);
        self::assertFalse($payload['pagination']['hasMore']);
    }

    public function testListDemosOrdersByDateDescending(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);

        // Create 3 demos with different dates
        $demo1 = new Demo('/storage/demos/demo1.dem', originalFilename: 'demo1.dem');
        $demo2 = new Demo('/storage/demos/demo2.dem', originalFilename: 'demo2.dem');
        $demo3 = new Demo('/storage/demos/demo3.dem', originalFilename: 'demo3.dem');

        // Set uploaded times (using reflection since there's no setter)
        $reflection = new \ReflectionClass(Demo::class);
        $property = $reflection->getProperty('uploadedAt');
        $property->setAccessible(true);

        $property->setValue($demo1, new \DateTimeImmutable('2026-05-15T10:00:00+00:00'));
        $property->setValue($demo2, new \DateTimeImmutable('2026-05-16T10:00:00+00:00'));
        $property->setValue($demo3, new \DateTimeImmutable('2026-05-14T10:00:00+00:00'));

        $entityManager->persist($demo1);
        $entityManager->persist($demo2);
        $entityManager->persist($demo3);
        $entityManager->flush();
        $entityManager->clear();

        // Test descending order (default)
        $client->request('GET', '/api/demos?sort=date&order=desc');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(3, $payload['demos']);
        // Should be in order: demo2, demo1, demo3 (newest first)
        self::assertStringContainsString('demo2', $payload['demos'][0]['metadata']['original_filename']);
        self::assertStringContainsString('demo1', $payload['demos'][1]['metadata']['original_filename']);
        self::assertStringContainsString('demo3', $payload['demos'][2]['metadata']['original_filename']);
    }

    public function testListDemosOrdersBySuspicionScore(): void
    {
        $client = self::createClient();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);

        // Create 2 demos with different suspicion scores
        $demo1 = new Demo('/storage/demos/demo1.dem', originalFilename: 'demo1.dem');
        $demo2 = new Demo('/storage/demos/demo2.dem', originalFilename: 'demo2.dem');

        $player1 = new Player('76561198000000001', 'Player 1');
        $player2 = new Player('76561198000000002', 'Player 2');

        // Demo1 with 0.3 suspicion
        $result1 = new AnalysisResult(
            $demo1,
            $player1,
            10,
            0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
            0.3,  // overall suspicion
            SuspicionLabel::Clean,
        );

        // Demo2 with 0.7 suspicion
        $result2 = new AnalysisResult(
            $demo2,
            $player2,
            10,
            0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
            0.7,  // overall suspicion
            SuspicionLabel::LikelyCheating,
        );

        $entityManager->persist($demo1);
        $entityManager->persist($demo2);
        $entityManager->persist($player1);
        $entityManager->persist($player2);
        $entityManager->persist($result1);
        $entityManager->persist($result2);
        $entityManager->flush();
        $entityManager->clear();

        // Test sorting by suspicion (highest first)
        $client->request('GET', '/api/demos?sort=suspicion&order=desc');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(2, $payload['demos']);
        // Should be in order: demo2 (0.7), demo1 (0.3)
        self::assertStringContainsString('demo2', $payload['demos'][0]['metadata']['original_filename']);
        self::assertStringContainsString('demo1', $payload['demos'][1]['metadata']['original_filename']);
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
        return getenv('PYTHON_WORKER_QUEUE') ?: 'cs2.analysis';
    }
}
