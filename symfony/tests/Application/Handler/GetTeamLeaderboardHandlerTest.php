<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Handler\GetTeamLeaderboardHandler;
use App\Application\Query\GetTeamLeaderboardQuery;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use App\Domain\Team\Team;
use App\Domain\Trace\TraceRating;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Unit tests for GetTeamLeaderboardHandler.
 *
 * Tests the CQRS handler that builds the team leaderboard with qualified teams,
 * aggregated ranking logic, pagination, and demo count calculation.
 */
final class GetTeamLeaderboardHandlerTest extends KernelTestCase
{
    private GetTeamLeaderboardHandler $handler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->handler = self::getContainer()->get(GetTeamLeaderboardHandler::class);

        // Clear database
        $connection = self::getContainer()->get(Connection::class);
        $connection->executeStatement('TRUNCATE player_team, team, demo, player, analysis_result, trace_rating RESTART IDENTITY CASCADE');
    }

    /**
     * Test 1: Returns teams ranked by aggregated TRACE score descending.
     */
    public function testReturnsTeamsRankedByAggregateScore(): void
    {
        // Create 3 teams with members
        for ($t = 1; $t <= 3; $t++) {
            $team = new Team(
                name: "Team{$t}",
                displayName: "Team {$t}",
            );

            // Add 2 qualified members per team (5+ demos each)
            for ($m = 1; $m <= 2; $m++) {
                $player = new Player("765611980000{$t}{$m}");
                $team->addPlayer($player);

                // Create 5 TRACE ratings (qualified)
                $traceScore = (5 - $t) + (2 - $m) * 0.5; // Descending per team
                for ($d = 1; $d <= 5; $d++) {
                    $this->createTraceRating($player, traceAdjusted: $traceScore);
                }

                $this->em->persist($player);
            }

            $this->em->persist($team);
        }
        $this->em->flush();

        // Query team leaderboard
        $query = new GetTeamLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify teams returned
        self::assertGreaterThan(0, count($result->entries));
        self::assertLessThanOrEqual(3, count($result->entries));

        // Verify sorted by aggregated score DESC
        for ($i = 1; $i < count($result->entries); $i++) {
            self::assertGreaterThanOrEqual(
                $result->entries[$i]->traceAdjusted,
                $result->entries[$i - 1]->traceAdjusted
            );
        }
    }

    /**
     * Test 2: Filters teams with unqualified members (no member with 5+ demos).
     */
    public function testFiltersTeamsWithUnqualifiedMembers(): void
    {
        // Create team with unqualified member (< 5 demos)
        $team1 = new Team(name: 'UnqualifiedTeam');
        $player1 = new Player('7656119800000001');
        $team1->addPlayer($player1);
        for ($i = 0; $i < 3; $i++) { // Only 3 demos (unqualified)
            $this->createTraceRating($player1, traceAdjusted: 1.5);
        }
        $this->em->persist($player1);
        $this->em->persist($team1);

        // Create team with qualified member (5+ demos)
        $team2 = new Team(name: 'QualifiedTeam');
        $player2 = new Player('7656119800000002');
        $team2->addPlayer($player2);
        for ($i = 0; $i < 5; $i++) { // 5 demos (qualified)
            $this->createTraceRating($player2, traceAdjusted: 2.0);
        }
        $this->em->persist($player2);
        $this->em->persist($team2);

        $this->em->flush();

        // Query team leaderboard
        $query = new GetTeamLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify only qualified team returned
        self::assertCount(1, $result->entries);
        self::assertStringContainsString('Qualified', $result->entries[0]->playerName);
    }

    /**
     * Test 3: Pagination works correctly for teams (offset-aware ranking).
     */
    public function testPaginationWorksForTeams(): void
    {
        // Create 10 teams
        for ($t = 1; $t <= 10; $t++) {
            $team = new Team(name: "Team{$t}");

            // Add 1 qualified member per team
            $player = new Player("765611980000{$t}000");
            $team->addPlayer($player);

            $traceScore = 10 - $t; // Descending score
            for ($d = 1; $d <= 5; $d++) {
                $this->createTraceRating($player, traceAdjusted: $traceScore + (1 - $d * 0.01));
            }

            $this->em->persist($player);
            $this->em->persist($team);
        }
        $this->em->flush();

        // Query with limit=5, offset=5
        $query = new GetTeamLeaderboardQuery(limit: 5, offset: 5);
        $result = ($this->handler)($query);

        // Verify correct entries returned
        self::assertCount(5, $result->entries);

        // Verify offset-aware ranking (ranks 6-10)
        self::assertGreaterThanOrEqual(6, $result->entries[0]->rank);
        self::assertLessThanOrEqual(10, $result->entries[4]->rank);

        // Verify total count
        self::assertGreaterThanOrEqual(10, $result->pagination->total);
    }

    /**
     * Test 4: Demo count is aggregated correctly for all team members.
     */
    public function testDemoCountAggregatesTeamDemos(): void
    {
        $team = new Team(name: 'TestTeam');

        // Add 2 players with different demo counts
        $player1 = new Player('7656119800000001');
        $player2 = new Player('7656119800000002');
        $team->addPlayer($player1);
        $team->addPlayer($player2);

        // Player 1: 5 demos
        for ($i = 0; $i < 5; $i++) {
            $this->createTraceRating($player1, traceAdjusted: 1.5);
        }

        // Player 2: 7 demos
        for ($i = 0; $i < 7; $i++) {
            $this->createTraceRating($player2, traceAdjusted: 1.5);
        }

        $this->em->persist($player1);
        $this->em->persist($player2);
        $this->em->persist($team);
        $this->em->flush();

        // Query team leaderboard
        $query = new GetTeamLeaderboardQuery(limit: 100, offset: 0);
        $result = ($this->handler)($query);

        // Verify demo count includes both players (5 + 7 = 12)
        self::assertCount(1, $result->entries);
        self::assertSame(12, $result->entries[0]->demoCount);
    }

    /**
     * Helper method to create a TRACE rating for a player.
     *
     * @param Player $player
     * @param float $traceAdjusted 95th percentile TRACE score
     * @return void
     */
    private function createTraceRating(Player $player, float $traceAdjusted): void
    {
        $demo = new Demo(
            fileName: "test_{$player->getId()}.dem",
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

        $traceRating = new TraceRating(
            analysisResult: $analysisResult,
            playerId: $player->getId(),
            percentile95: $traceAdjusted,
            traceAdjusted: $traceAdjusted,
            ekill: 0.8,
            aim: 1.2,
            kast: 0.9,
            util: 1.1,
            clutch: 0.8,
            calibrationVersion: 'v1',
        );

        $this->em->persist($demo);
        $this->em->persist($analysisResult);
        $this->em->persist($traceRating);
    }
}
