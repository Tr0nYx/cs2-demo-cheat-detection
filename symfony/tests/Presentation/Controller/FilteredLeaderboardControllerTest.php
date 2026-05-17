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

final class FilteredLeaderboardControllerTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
        self::ensureKernelShutdown();
    }

    public function testFilteredLeaderboardReturnsPlayersAndTotalHeader(): void
    {
        $this->createQualifiedPlayer('steam-filtered', 'Filtered Player', 'Mirage', [0.7, 0.72, 0.74, 0.76, 0.78]);
        $this->createQualifiedPlayer('steam-other', 'Other Player', 'Inferno', [0.9, 0.92, 0.94, 0.96, 0.98]);

        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/filtered?map=Mirage&limit=10');

        self::assertResponseStatusCodeSame(200);
        self::assertResponseHeaderSame('X-Total-Count', '1');

        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1, $payload['total']);
        self::assertFalse($payload['hasMore']);
        self::assertSame('steam-filtered', $payload['players'][0]['playerId']);
        self::assertSame('Filtered Player', $payload['players'][0]['username']);
    }

    public function testFilteredLeaderboardRejectsInvalidFilters(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/leaderboards/filtered?rating_band=banana');

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('validation_error', $payload['error']['code']);
    }

    /** @param list<float> $scores */
    private function createQualifiedPlayer(string $steamId, string $displayName, string $map, array $scores): void
    {
        self::bootKernel();
        $em = self::getContainer()->get(EntityManagerInterface::class);
        $player = new Player($steamId, $displayName);
        $em->persist($player);

        foreach ($scores as $index => $score) {
            $demo = new Demo("/storage/demos/{$steamId}-{$index}.dem", originalFilename: "{$steamId}-{$index}.dem");
            $demo->setMap($map);
            $demo->markDone(new \DateTimeImmutable('2026-05-15T12:00:00+00:00'));

            $analysis = new AnalysisResult(
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

            $trace = new TraceRating(
                analysisResult: $analysis,
                playerId: $steamId,
                demoId: $demo->getIdString(),
                calibrationVersion: 'default-v1',
                traceBase: $score,
                traceAdjusted: $score,
                traceNormalized: $score,
                trustMultiplier: 0.95,
                roundCount: 24,
                ekill: $score,
                aim: $score,
                kast: $score,
                util: $score,
                clutch: $score,
                ekillRaw: $score,
                aimCpq: $score,
                aimCsq: $score,
                aimTtd: $score,
                aimScs: $score,
                kastPercentage: $score,
                clutchAttempts: 2,
                clutchWins: 1,
                calculatedAt: new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
            );

            $em->persist($demo);
            $em->persist($analysis);
            $em->persist($trace);
        }

        $em->flush();
        $em->clear();
        self::ensureKernelShutdown();
    }
}
