<?php

declare(strict_types=1);

namespace App\Tests\Application;

use App\Application\Result\ResultIngestHandler;
use App\Application\Result\ResultIngestMessage;
use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStatus;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class ResultIngestHandlerTest extends KernelTestCase
{
    public function testHandlerWritesResultsAndMarksDemoDone(): void
    {
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE demo_suspicious_kill, demo_grenade, demo_round, demo_heatmap, analysis_result, player, demo RESTART IDENTITY CASCADE');
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/ingest.dem');
        $demo->markQueued();
        $entityManager->persist($demo);
        $entityManager->flush();

        $result = self::getContainer()->get(ResultIngestHandler::class)->__invoke(new ResultIngestMessage([
            'demo_id' => $demo->getIdString(),
            'results' => [[
                'steam_id' => '76561198000000002',
                'display_name' => 'Ingest Player',
                'round_count' => 24,
                'scores' => [
                    'aimbot' => 0.1,
                    'wallhack' => 0.2,
                    'triggerbot' => 0.3,
                    'recoil' => 0.4,
                    'bhop' => 0.5,
                    'session_consistency' => 0.6,
                    'overall' => 0.47,
                ],
                'label' => 'suspicious',
                'feature_data' => ['triggerbot' => ['instant_kill_ratio' => 0.12]],
                'support_data' => ['summary' => 'research signal'],
            ]],
        ]));

        self::assertSame(['results_written' => 1], $result);
        $entityManager->clear();
        $stored = $entityManager->find(Demo::class, $demo->getId());
        self::assertSame(DemoStatus::Done, $stored->getStatus());
        self::assertCount(1, $stored->getAnalysisResults());
    }

    public function testHandlerCanMarkDemoError(): void
    {
        self::ensureKernelShutdown();
        self::bootKernel();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE demo_suspicious_kill, demo_grenade, demo_round, demo_heatmap, analysis_result, player, demo RESTART IDENTITY CASCADE');
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $demo = new Demo('/storage/demos/error.dem');
        $demo->markQueued();
        $entityManager->persist($demo);
        $entityManager->flush();

        $result = self::getContainer()->get(ResultIngestHandler::class)->__invoke(new ResultIngestMessage([
            'demo_id' => $demo->getIdString(),
            'error' => 'parser could not read demo',
        ]));

        self::assertSame(['results_written' => 0], $result);
        $entityManager->clear();
        $stored = $entityManager->find(Demo::class, $demo->getId());
        self::assertSame(DemoStatus::Error, $stored->getStatus());
        self::assertSame('parser could not read demo', $stored->getErrorMessage());
    }
}
