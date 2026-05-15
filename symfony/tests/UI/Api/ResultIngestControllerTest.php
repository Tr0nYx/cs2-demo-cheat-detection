<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Demo\Demo;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ResultIngestControllerTest extends WebTestCase
{
    public function testInternalResultIngestRequiresToken(): void
    {
        $client = self::createClient();

        $client->request('POST', '/api/internal/results', content: '{}');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('invalid_ingest_token', $payload['error']['code']);
    }

    public function testInternalResultIngestPersistsResult(): void
    {
        $client = self::createClient();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE analysis_result, player, demo RESTART IDENTITY CASCADE');
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/internal-ingest.dem');
        $demo->markQueued();
        $entityManager->persist($demo);
        $entityManager->flush();

        $client->request(
            'POST',
            '/api/internal/results',
            server: ['HTTP_X_RESULT_INGEST_TOKEN' => getenv('RESULT_INGEST_TOKEN') ?: 'change-me-in-local-env'],
            content: json_encode([
                'demo_id' => $demo->getIdString(),
                'results' => [[
                    'steam_id' => '76561198000000003',
                    'round_count' => 16,
                    'aimbot_score' => 0.1,
                    'wallhack_score' => 0.2,
                    'triggerbot_score' => 0.3,
                    'recoil_score' => 0.4,
                    'bhop_score' => 0.5,
                    'session_consistency_score' => 0.6,
                    'overall_suspicion' => 0.77,
                    'suspicion_label' => 'likely_cheating',
                    'feature_data' => ['aimbot' => ['snap_ratio' => 3.1]],
                    'support_data' => ['note' => 'research signal'],
                ]],
            ], JSON_THROW_ON_ERROR),
        );

        self::assertResponseStatusCodeSame(202);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1, $payload['results_written']);

        $client->request('GET', '/api/demos/'.$demo->getIdString());
        self::assertResponseIsSuccessful();
        $demoPayload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('done', $demoPayload['status']);
        self::assertSame('likely_cheating', $demoPayload['results'][0]['label']);
    }
}
