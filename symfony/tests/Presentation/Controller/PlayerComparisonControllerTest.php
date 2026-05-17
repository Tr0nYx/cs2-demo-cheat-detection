<?php

declare(strict_types=1);

namespace App\Tests\Presentation\Controller;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Integration tests for PlayerComparisonController.
 *
 * Tests HTTP endpoint GET /api/players/{playerId}/compare?with={otherPlayerId}
 * Verifies request/response handling, validation, caching, and JSON structure.
 */
final class PlayerComparisonControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        parent::setUp();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: GET /api/players/{playerId}/compare?with={otherId} returns 200.
     */
    public function testGetPlayerComparisonReturns200(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * Test 2: Returns correct JSON schema with all fields.
     */
    public function testReturnsCorrectJsonSchema(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        // Verify structure
        self::assertArrayHasKey('playerAId', $data);
        self::assertArrayHasKey('playerAName', $data);
        self::assertArrayHasKey('playerAComponents', $data);
        self::assertArrayHasKey('playerATrend', $data);
        self::assertArrayHasKey('playerAMaps', $data);
        self::assertArrayHasKey('playerAHistory', $data);

        self::assertArrayHasKey('playerBId', $data);
        self::assertArrayHasKey('playerBName', $data);
        self::assertArrayHasKey('playerBComponents', $data);
        self::assertArrayHasKey('playerBTrend', $data);
        self::assertArrayHasKey('playerBMaps', $data);
        self::assertArrayHasKey('playerBHistory', $data);
    }

    /**
     * Test 3: Requires 'with' parameter.
     */
    public function testRequiresWithParameter(): void
    {
        $playerAId = '76561198000000001';

        $this->createPlayer($playerAId, 'Player A');

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare");

        self::assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), associative: true);
        self::assertArrayHasKey('code', $data);
        self::assertStringContainsString('with', strtolower($data['detail'] ?? ''));
    }

    /**
     * Test 4: Cannot compare with self.
     */
    public function testCannotCompareWithSelf(): void
    {
        $playerAId = '76561198000000001';

        $this->createPlayer($playerAId, 'Player A');
        $this->createTraceRating($playerAId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerAId}");

        self::assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), associative: true);
        self::assertStringContainsString('themselves', strtolower($data['detail'] ?? ''));
    }

    /**
     * Test 5: Returns player names matching Player.displayName.
     */
    public function testReturnsPlayerNames(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Alice');
        $this->createPlayer($playerBId, 'Bob');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        self::assertSame('Alice', $data['playerAName']);
        self::assertSame('Bob', $data['playerBName']);
    }

    /**
     * Test 6: Cache-Control header set to public, max-age=300.
     */
    public function testCacheControlHeaderSet(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        self::assertResponseHeaderSame('Cache-Control', 'public, max-age=300');
    }

    /**
     * Test 7: Returns component breakdown structure.
     */
    public function testReturnsComponentBreakdownStructure(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        // Verify component breakdown has expected structure
        $components = $data['playerAComponents'];
        self::assertArrayHasKey('components', $components);
        self::assertArrayHasKey('traceDatetime', $components);
    }

    /**
     * Test 8: Returns trend card structure with history and trending flag.
     */
    public function testReturnsTrendCardStructure(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRating($playerAId);
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        // Verify trend card structure
        $trend = $data['playerATrend'];
        self::assertArrayHasKey('history', $trend);
        self::assertArrayHasKey('trending', $trend);
        self::assertIsBool($trend['trending']);
    }

    /**
     * Test 9: Returns map affinity card with top maps.
     */
    public function testReturnsMapAffinityCardStructure(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createTraceRatingOnMap($playerAId, 'de_mirage');
        $this->createTraceRating($playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        // Verify map affinity structure
        $maps = $data['playerAMaps'];
        self::assertArrayHasKey('topMaps', $maps);
        self::assertIsArray($maps['topMaps']);
    }

    /**
     * Test 10: Returns match history with shared demos.
     */
    public function testReturnsMatchHistoryCardStructure(): void
    {
        $playerAId = '76561198000000001';
        $playerBId = '76561198000000002';

        $this->createPlayer($playerAId, 'Player A');
        $this->createPlayer($playerBId, 'Player B');
        $this->createSharedDemo($playerAId, $playerBId);

        $client = self::createClient();
        $client->request('GET', "/api/players/{$playerAId}/compare?with={$playerBId}");

        $data = json_decode($client->getResponse()->getContent(), associative: true);

        // Verify match history structure
        $history = $data['playerAHistory'];
        self::assertArrayHasKey('sharedDemos', $history);
        self::assertIsArray($history['sharedDemos']);
    }

    /**
     * Helper: Create a player.
     */
    private function createPlayer(string $steamId, string $displayName): void
    {
        $player = new Player($steamId);
        $player->setDisplayName($displayName);
        $this->em->persist($player);
        $this->em->flush();
    }

    /**
     * Helper: Create a TRACE rating.
     */
    private function createTraceRating(string $playerId): void
    {
        $demo = new Demo();
        $this->em->persist($demo);

        $player = $this->em->getRepository(Player::class)->find($playerId);
        $analysisResult = new AnalysisResult(
            demo: $demo,
            player: $player,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisResult);

        $trace = new TraceRating(
            playerId: $playerId,
            analysisResult: $analysisResult,
            ekill: 1.0,
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 1.0,
            traceAdjusted: 1.0,
            trustMultiplier: 1.0,
            calibrationVersion: 'v1.0',
        );
        $this->em->persist($trace);
        $this->em->flush();
    }

    /**
     * Helper: Create TRACE rating on specific map.
     */
    private function createTraceRatingOnMap(string $playerId, string $map): void
    {
        $demo = new Demo();
        $demo->setMap($map);
        $this->em->persist($demo);

        $player = $this->em->getRepository(Player::class)->find($playerId);
        $analysisResult = new AnalysisResult(
            demo: $demo,
            player: $player,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisResult);

        $trace = new TraceRating(
            playerId: $playerId,
            analysisResult: $analysisResult,
            ekill: 1.0,
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 1.0,
            traceAdjusted: 1.0,
            trustMultiplier: 1.0,
            calibrationVersion: 'v1.0',
        );
        $this->em->persist($trace);
        $this->em->flush();
    }

    /**
     * Helper: Create a demo with both players.
     */
    private function createSharedDemo(string $playerAId, string $playerBId): void
    {
        $demo = new Demo();
        $this->em->persist($demo);

        $playerA = $this->em->getRepository(Player::class)->find($playerAId);
        $playerB = $this->em->getRepository(Player::class)->find($playerBId);

        $analysisA = new AnalysisResult(
            demo: $demo,
            player: $playerA,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisA);

        $analysisB = new AnalysisResult(
            demo: $demo,
            player: $playerB,
            roundCount: 16,
            aimbotScore: 0.1,
            wallhackScore: 0.1,
            triggerbotScore: 0.1,
            recoilScore: 0.1,
            bhopScore: 0.1,
            sessionConsistencyScore: 0.1,
            overallSuspicion: 0.1,
            suspicionLabel: SuspicionLabel::Clean,
        );
        $this->em->persist($analysisB);

        $this->em->flush();
    }
}
