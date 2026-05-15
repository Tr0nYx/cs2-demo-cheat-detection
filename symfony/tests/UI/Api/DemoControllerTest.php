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
