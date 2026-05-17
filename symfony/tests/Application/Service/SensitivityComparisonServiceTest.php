<?php

declare(strict_types=1);

namespace App\Tests\Application\Service;

use App\Application\Service\SensitivityComparisonService;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use App\Application\Exception\AccessDeniedException;

final class SensitivityComparisonServiceTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private SensitivityComparisonService $service;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->service = self::getContainer()->get(SensitivityComparisonService::class);
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE trace_rating, analysis_result, player, demo RESTART IDENTITY CASCADE');
    }

    public function testValidInputCreatesComparison(): void
    {
        $demoId = $this->createAnalysis('player-a');

        $comparison = $this->service->createComparison($demoId, 'player-a', $this->thresholds());

        self::assertSame(0.51, $comparison->baselineSuspicion);
        self::assertSame(0.65, $comparison->tunedSuspicion);
        self::assertCount(6, $comparison->impactBreakdown);
    }

    public function testBaselineSuspicionMatchesAnalysisResult(): void
    {
        $demoId = $this->createAnalysis('player-a', overallSuspicion: 0.73);

        $comparison = $this->service->createComparison($demoId, 'player-a', $this->thresholds());

        self::assertSame(0.73, $comparison->baselineSuspicion);
    }

    public function testTunedSuspicionCalculatesCorrectly(): void
    {
        $demoId = $this->createAnalysis('player-a');

        $comparison = $this->service->createComparison($demoId, 'player-a', [
            'aimbot' => 0,
            'wallhack' => 0,
            'triggerbot' => 0,
            'recoil' => 100,
            'bhop' => 100,
            'session' => 100,
        ]);

        self::assertSame(0.65, $comparison->tunedSuspicion);
    }

    public function testImpactBreakdownShowsPerFeatureDelta(): void
    {
        $demoId = $this->createAnalysis('player-a');

        $comparison = $this->service->createComparison($demoId, 'player-a', [
            'aimbot' => 95,
            'wallhack' => 50,
            'triggerbot' => 50,
            'recoil' => 50,
            'bhop' => 50,
            'session' => 50,
        ]);

        self::assertSame(-0.25, $comparison->impactBreakdown['aimbot']);
        self::assertSame(0.0, $comparison->impactBreakdown['wallhack']);
        self::assertArrayHasKey('session', $comparison->impactBreakdown);
    }

    public function testThresholdValidationRejectsOutOfRange(): void
    {
        $demoId = $this->createAnalysis('player-a');

        $this->expectException(\InvalidArgumentException::class);

        $this->service->createComparison($demoId, 'player-a', [...$this->thresholds(), 'aimbot' => 101]);
    }

    public function testUserScopeEnforcement(): void
    {
        $demoId = $this->createAnalysis('player-a');

        $this->expectException(AccessDeniedException::class);

        $this->service->createComparison($demoId, 'player-b', $this->thresholds());
    }

    public function testIncompleteAnalysisThrows(): void
    {
        $demoId = $this->createAnalysis('player-a', markDone: false);

        $this->expectException(\LogicException::class);

        $this->service->createComparison($demoId, 'player-a', $this->thresholds());
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

    private function createAnalysis(string $steamId, float $overallSuspicion = 0.51, bool $markDone = true): string
    {
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
            $overallSuspicion,
            SuspicionLabel::Suspicious,
        );

        $this->em->persist($demo);
        $this->em->persist($player);
        $this->em->persist($analysis);
        $this->em->flush();
        $this->em->clear();

        return $demo->getIdString();
    }
}
