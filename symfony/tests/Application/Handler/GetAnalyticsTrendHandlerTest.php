<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetAnalyticsTrendHandler;
use App\Application\Query\GetAnalyticsTrendQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Analytics\ArcTrendDto;
use App\Domain\Analytics\ConsistencyTrendDto;
use App\Domain\Analytics\WeaponStrengthDto;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class GetAnalyticsTrendHandlerTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private GetAnalyticsTrendHandler $handler;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetAnalyticsTrendHandler::class);
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE trace_rating, analysis_result, player, demo RESTART IDENTITY CASCADE');
        self::getContainer()->get(CacheItemPoolInterface::class)->clear();
    }

    public function testConsistencyReturnsVarianceBands(): void
    {
        $this->seedRatings('player-a');

        $trend = ($this->handler)(new GetAnalyticsTrendQuery('player-a', 'consistency', 30));

        self::assertInstanceOf(ConsistencyTrendDto::class, $trend);
        self::assertNotEmpty($trend->bands);
        self::assertNull($trend->message);
    }

    public function testArcCalculatesRegression(): void
    {
        $this->seedRatings('player-a');

        $trend = ($this->handler)(new GetAnalyticsTrendQuery('player-a', 'arc'));

        self::assertInstanceOf(ArcTrendDto::class, $trend);
        self::assertLessThan(0.0, $trend->slope);
        self::assertGreaterThanOrEqual(0.0, $trend->rSquared);
    }

    public function testWeaponsGroupsByClass(): void
    {
        $this->seedRatings('player-a');

        $trend = ($this->handler)(new GetAnalyticsTrendQuery('player-a', 'weapons'));

        self::assertInstanceOf(WeaponStrengthDto::class, $trend);
        self::assertArrayHasKey('Rifle', $trend->strengths);
        self::assertArrayHasKey('Sniper', $trend->strengths);
    }

    public function testInsufficientDemosReturnsMessage(): void
    {
        $this->seedRatings('player-a', 3);

        $trend = ($this->handler)(new GetAnalyticsTrendQuery('player-a', 'arc'));

        self::assertSame('Only 3 demos, need 5+.', $trend->message);
    }

    public function testInvalidMetricThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new GetAnalyticsTrendQuery('player-a', 'invalid');
    }

    private function seedRatings(string $steamId, int $count = 6): void
    {
        $player = new Player($steamId, $steamId);
        $classes = ['Rifle', 'Sniper', 'Pistol', 'SMG', 'Rifle', 'Sniper'];

        for ($i = 0; $i < $count; $i++) {
            $demo = new Demo('/storage/demos/trend-'.$i.'.dem', originalFilename: 'trend.dem');
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
                0.5,
                SuspicionLabel::Suspicious,
                ['weapon_class' => $classes[$i % count($classes)]],
            );
            $trace = new TraceRating(
                analysisResult: $analysis,
                playerId: $steamId,
                demoId: $demo->getIdString(),
                calibrationVersion: 'default-v1',
                traceBase: 0.8 - ($i * 0.05),
                traceAdjusted: 0.8 - ($i * 0.05),
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
                calculatedAt: new \DateTimeImmutable(sprintf('-%d days', $count - $i)),
            );

            $this->em->persist($demo);
            $this->em->persist($analysis);
            $this->em->persist($trace);
        }

        $this->em->persist($player);
        $this->em->flush();
        $this->em->clear();
    }
}
