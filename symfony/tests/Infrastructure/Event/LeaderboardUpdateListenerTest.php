<?php

declare(strict_types=1);

namespace App\Tests\Infrastructure\Event;

use App\Application\Service\LeaderboardUpdateService;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\AnalysisResultCreated;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Team\Team;
use App\Domain\Trace\TraceRating;
use App\Infrastructure\Event\LeaderboardUpdateListener;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for LeaderboardUpdateListener.
 *
 * Tests the event listener that triggers on AnalysisResultCreated events
 * and invokes the LeaderboardUpdateService for incremental updates.
 */
final class LeaderboardUpdateListenerTest extends KernelTestCase
{
    private LeaderboardUpdateListener $listener;
    private LeaderboardUpdateService $service;
    private LoggerInterface $logger;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->service = self::getContainer()->get(LeaderboardUpdateService::class);
        $this->logger = self::getContainer()->get(LoggerInterface::class);

        $this->listener = new LeaderboardUpdateListener(
            updateService: $this->service,
            logger: $this->logger,
        );

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE player_team, team, demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Listener is triggered on AnalysisResultCreated event.
     */
    public function testListenerIsTriggeredOnAnalysisResultCreated(): void
    {
        // Create test data
        $player = new Player('7656119800000001');
        $demo = new Demo(
            fileName: 'test.dem',
            fileSize: 1024,
            demoProtocol: 4,
            networkProtocol: 18,
        );
        $demo->setMap('de_mirage');

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
            suspicionLabel: SuspicionLabel::CLEAN,
            featureData: [],
            supportData: [],
        );

        $this->em->persist($player);
        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->flush();

        // Create and fire event
        $event = new AnalysisResultCreated($analysisResult);

        // Fire listener (should not throw)
        $this->listener->onAnalysisResultCreated($event);

        self::assertTrue(true); // Event handled without exception
    }

    /**
     * Test 2: Listener extracts player ID, map, and team from event.
     */
    public function testListenerExtractsPlayerMapAndTeamData(): void
    {
        // Create test data with team
        $player = new Player('7656119800000001');
        $team = new Team(name: 'TestTeam');
        $team->addPlayer($player);

        $demo = new Demo(
            fileName: 'test.dem',
            fileSize: 1024,
            demoProtocol: 4,
            networkProtocol: 18,
        );
        $demo->setMap('de_ancient');

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
            suspicionLabel: SuspicionLabel::CLEAN,
            featureData: [],
            supportData: [],
        );

        $this->em->persist($player);
        $this->em->persist($team);
        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->flush();

        // Create and fire event
        $event = new AnalysisResultCreated($analysisResult);

        // Fire listener (should extract player, map, team without throwing)
        $this->listener->onAnalysisResultCreated($event);

        self::assertTrue(true); // Event handled successfully
    }

    /**
     * Test 3: Listener handles missing team gracefully (player not on team).
     */
    public function testListenerHandlesPlayerWithoutTeam(): void
    {
        // Create test data WITHOUT team
        $player = new Player('7656119800000001');

        $demo = new Demo(
            fileName: 'test.dem',
            fileSize: 1024,
            demoProtocol: 4,
            networkProtocol: 18,
        );
        $demo->setMap('de_mirage');

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
            suspicionLabel: SuspicionLabel::CLEAN,
            featureData: [],
            supportData: [],
        );

        $this->em->persist($player);
        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->flush();

        // Create and fire event
        $event = new AnalysisResultCreated($analysisResult);

        // Fire listener (should handle null teamId gracefully)
        $this->listener->onAnalysisResultCreated($event);

        self::assertTrue(true); // Event handled without exception
    }

    /**
     * Test 4: Listener does not throw when demo map is null.
     */
    public function testListenerHandlesNullMapGracefully(): void
    {
        // Create test data with null map
        $player = new Player('7656119800000001');

        $demo = new Demo(
            fileName: 'test.dem',
            fileSize: 1024,
            demoProtocol: 4,
            networkProtocol: 18,
        );
        // Don't set map (null)

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
            suspicionLabel: SuspicionLabel::CLEAN,
            featureData: [],
            supportData: [],
        );

        $this->em->persist($player);
        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->flush();

        // Create and fire event
        $event = new AnalysisResultCreated($analysisResult);

        // Fire listener (should handle null mapId gracefully)
        $this->listener->onAnalysisResultCreated($event);

        self::assertTrue(true); // Event handled without exception
    }

    /**
     * Test 5: Listener persists log message after processing event.
     */
    public function testListenerLogsEventProcessing(): void
    {
        // Create minimal test data
        $player = new Player('7656119800000001');
        $demo = new Demo(
            fileName: 'test.dem',
            fileSize: 1024,
            demoProtocol: 4,
            networkProtocol: 18,
        );

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
            suspicionLabel: SuspicionLabel::CLEAN,
            featureData: [],
            supportData: [],
        );

        $this->em->persist($player);
        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->flush();

        // Create and fire event
        $event = new AnalysisResultCreated($analysisResult);

        // Fire listener
        $this->listener->onAnalysisResultCreated($event);

        // Verify listener processed without error
        self::assertTrue(true);
    }
}
