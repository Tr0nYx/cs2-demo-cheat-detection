<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetFilteredDemosHandler;
use App\Application\Query\GetFilteredDemosQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class GetFilteredDemosHandlerTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private GetFilteredDemosHandler $handler;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetFilteredDemosHandler::class);
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE trace_rating, analysis_result, player, demo RESTART IDENTITY CASCADE');
    }

    public function testFilterByMapReturnsOnlyMatchingDemos(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage');
        $this->createAnalyzedDemo('player-a', 'Mirage');
        $this->createAnalyzedDemo('player-a', 'Nuke');

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', map: 'Mirage'));

        self::assertCount(2, $result->demos);
        self::assertSame(['Mirage', 'Mirage'], array_map(static fn ($demo) => $demo->map, $result->demos));
    }

    public function testFilterByRatingBandReturnsCorrectPercentiles(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage', traceAdjusted: 0.2);
        $this->createAnalyzedDemo('player-a', 'Inferno', traceAdjusted: 0.5);
        $this->createAnalyzedDemo('player-a', 'Nuke', traceAdjusted: 0.8);

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', ratingBand: '0-5'));

        self::assertCount(1, $result->demos);
        self::assertLessThan(0.33, $result->demos[0]->traceAdjusted);
    }

    public function testFilterByOutcomeReturnsMatchingResults(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage', outcome: 'win');
        $this->createAnalyzedDemo('player-a', 'Mirage', outcome: 'loss');

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', outcome: 'win'));

        self::assertCount(1, $result->demos);
        self::assertSame('win', $result->demos[0]->outcome);
    }

    public function testFilterByTimeframeReturnsRecentDemos(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage', uploadedAt: new \DateTimeImmutable('-5 days'));
        $this->createAnalyzedDemo('player-a', 'Inferno', uploadedAt: new \DateTimeImmutable('-45 days'));

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', daysBack: 30));

        self::assertCount(1, $result->demos);
        self::assertSame('Mirage', $result->demos[0]->map);
    }

    public function testMultipleFiltersApplyAllConstraints(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage', 0.2, 'win');
        $this->createAnalyzedDemo('player-a', 'Mirage', 0.8, 'win');
        $this->createAnalyzedDemo('player-a', 'Inferno', 0.2, 'win');
        $this->createAnalyzedDemo('player-a', 'Mirage', 0.2, 'loss');

        $result = ($this->handler)(new GetFilteredDemosQuery(
            userId: 'player-a',
            map: 'Mirage',
            ratingBand: '0-5',
            outcome: 'win',
        ));

        self::assertCount(1, $result->demos);
        self::assertSame('Mirage', $result->demos[0]->map);
        self::assertSame('win', $result->demos[0]->outcome);
        self::assertLessThan(0.33, $result->demos[0]->traceAdjusted);
    }

    public function testUserScopeEnforcement(): void
    {
        $this->createAnalyzedDemo('player-a', 'Mirage');
        $this->createAnalyzedDemo('player-b', 'Mirage');

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', map: 'Mirage'));

        self::assertCount(1, $result->demos);
        self::assertSame(1, $result->total);
    }

    public function testPaginationWorksCorrectly(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->createAnalyzedDemo('player-a', 'Mirage', uploadedAt: new \DateTimeImmutable(sprintf('-%d hours', $i)));
        }

        $result = ($this->handler)(new GetFilteredDemosQuery(userId: 'player-a', limit: 5, offset: 5));

        self::assertCount(5, $result->demos);
        self::assertSame(12, $result->total);
        self::assertTrue($result->hasMore);
    }

    private function createAnalyzedDemo(
        string $playerSteamId,
        string $map,
        float $traceAdjusted = 0.5,
        ?string $outcome = 'win',
        ?\DateTimeImmutable $uploadedAt = null,
    ): void {
        $player = $this->em->getRepository(Player::class)->findOneBy(['steamId' => $playerSteamId])
            ?? new Player($playerSteamId, $playerSteamId);
        $demo = new Demo('/storage/demos/test.dem', originalFilename: 'test.dem', uploadedAt: $uploadedAt);
        $demo->setMap($map);
        $demo->setOutcome($outcome);
        $demo->markDone();

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
            playerId: $playerSteamId,
            demoId: $demo->getIdString(),
            calibrationVersion: 'default-v1',
            traceBase: $traceAdjusted,
            traceAdjusted: $traceAdjusted,
            traceNormalized: 1.0,
            trustMultiplier: 0.95,
            roundCount: 24,
            ekill: 1.0,
            aim: 1.0,
            kast: 1.0,
            util: 1.0,
            clutch: 1.0,
            ekillRaw: 0.8,
            aimCpq: 0.75,
            aimCsq: 0.82,
            aimTtd: 0.88,
            aimScs: 0.85,
            kastPercentage: 0.75,
            clutchAttempts: 5,
            clutchWins: 3,
            calculatedAt: $uploadedAt ?? new \DateTimeImmutable(),
        );

        $this->em->persist($player);
        $this->em->persist($demo);
        $this->em->persist($analysis);
        $this->em->persist($trace);
        $this->em->flush();
        $this->em->clear();
    }
}
