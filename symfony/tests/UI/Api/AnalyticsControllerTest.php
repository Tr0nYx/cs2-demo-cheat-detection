<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class AnalyticsControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE trace_rating, analysis_result, player, demo RESTART IDENTITY CASCADE');
        self::getContainer()->get(CacheItemPoolInterface::class)->clear();
        self::ensureKernelShutdown();
    }

    public function testPostCompareWithValidInput(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');

        $this->postCompare($client, $demoId, $this->thresholds(), 'player-a');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(0.51, $payload['baselineSuspicion']);
        self::assertSame(0.65, $payload['tunedSuspicion']);
        self::assertCount(6, $payload['impactBreakdown']);
    }

    public function testInvalidDemoIdReturns400(): void
    {
        $client = self::createClient();

        $this->postCompare($client, 'not-a-uuid', $this->thresholds(), 'player-a');

        self::assertResponseStatusCodeSame(400);
    }

    public function testMissingThresholdKeysReturn400(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');
        $thresholds = $this->thresholds();
        unset($thresholds['aimbot']);

        $this->postCompare($client, $demoId, $thresholds, 'player-a');

        self::assertResponseStatusCodeSame(400);
    }

    public function testOutOfRangeThresholdReturns400(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');

        $this->postCompare($client, $demoId, [...$this->thresholds(), 'aimbot' => 101], 'player-a');

        self::assertResponseStatusCodeSame(400);
    }

    public function testUnauthorizedUserReturns403(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');

        $this->postCompare($client, $demoId, $this->thresholds(), 'player-b');

        self::assertResponseStatusCodeSame(403);
    }

    public function testIncompleteAnalysisReturns422(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a', markDone: false);

        $this->postCompare($client, $demoId, $this->thresholds(), 'player-a');

        self::assertResponseStatusCodeSame(422);
    }

    public function testUnauthorizedNoJwt(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');

        $client->request(
            'POST',
            '/api/analytics/compare',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['demo_id' => $demoId, 'adjusted_thresholds' => $this->thresholds()], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(401);
    }

    public function testRateLimitReturns429(): void
    {
        $client = self::createClient();
        $demoId = $this->createAnalysis('player-a');

        for ($i = 0; $i < 10; $i++) {
            $this->postCompare($client, $demoId, $this->thresholds(), 'player-a');
            self::assertResponseIsSuccessful();
        }

        $this->postCompare($client, $demoId, $this->thresholds(), 'player-a');

        self::assertResponseStatusCodeSame(429);
    }

    public function testGetTrendInsufficientDataReturnsMessage(): void
    {
        $client = self::createClient();

        $client->request(
            'GET',
            '/api/analytics/trends/arc',
            server: ['HTTP_AUTHORIZATION' => 'Bearer '.$this->jwtForSteamId('player-a')]
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Only 0 demos, need 5+.', $payload['message']);
    }

    public function testGetTrendRequiresJwt(): void
    {
        $client = self::createClient();

        $client->request('GET', '/api/analytics/trends/consistency');

        self::assertResponseStatusCodeSame(401);
    }

    /** @param array<string, int> $thresholds */
    private function postCompare(\Symfony\Bundle\FrameworkBundle\KernelBrowser $client, string $demoId, array $thresholds, string $steamId): void
    {
        $client->request(
            'POST',
            '/api/analytics/compare',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer '.$this->jwtForSteamId($steamId),
            ],
            content: json_encode(['demo_id' => $demoId, 'adjusted_thresholds' => $thresholds], JSON_THROW_ON_ERROR)
        );
    }

    /** @return array<string, int> */
    private function thresholds(): array
    {
        return [
            'aimbot' => 50,
            'wallhack' => 50,
            'triggerbot' => 50,
            'recoil' => 50,
            'bhop' => 50,
            'session' => 50,
        ];
    }

    private function createAnalysis(string $steamId, bool $markDone = true): string
    {
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/compare.dem', originalFilename: 'compare.dem');
        if ($markDone) {
            $demo->markDone();
        }

        $player = new Player($steamId, $steamId);
        $analysis = new AnalysisResult(
            $demo,
            $player,
            24,
            0.9,
            0.1,
            0.8,
            0.7,
            0.2,
            0.6,
            0.51,
            SuspicionLabel::Suspicious,
        );

        $entityManager->persist($demo);
        $entityManager->persist($player);
        $entityManager->persist($analysis);
        $entityManager->flush();
        $entityManager->clear();

        return $demo->getIdString();
    }

    private function jwtForSteamId(string $steamId): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => 'cs2-demo-cheat-detection',
            'sub' => $steamId,
            'steam_id' => $steamId,
            'iat' => time(),
            'exp' => time() + 3600,
        ], JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', "{$header}.{$payload}", 'change-me-in-local-env', true);

        return "{$header}.{$payload}.".$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
