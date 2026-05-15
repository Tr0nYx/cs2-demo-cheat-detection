<?php

declare(strict_types=1);

namespace App\Tests\UI\Api;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class PlayerControllerTest extends WebTestCase
{
    public function testHistoryReturnsNewestResultsFirstWithBoundedPagination(): void
    {
        $client = self::createClient();
        self::getContainer()->get(Connection::class)->executeStatement('TRUNCATE analysis_result, player, demo RESTART IDENTITY CASCADE');
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);

        $player = new Player('76561198000000000', 'Research Player');
        $oldDemo = new Demo('/storage/demos/old.dem');
        $newDemo = new Demo('/storage/demos/new.dem');
        $old = new AnalysisResult(
            $oldDemo,
            $player,
            20,
            0.1,
            0.2,
            0.3,
            0.4,
            0.5,
            0.6,
            0.35,
            SuspicionLabel::Clean,
            analyzedAt: new \DateTimeImmutable('2026-05-14T12:00:00+00:00'),
        );
        $new = new AnalysisResult(
            $newDemo,
            $player,
            24,
            0.2,
            0.3,
            0.4,
            0.5,
            0.6,
            0.7,
            0.55,
            SuspicionLabel::Suspicious,
            analyzedAt: new \DateTimeImmutable('2026-05-15T12:00:00+00:00'),
        );

        $entityManager->persist($player);
        $entityManager->persist($oldDemo);
        $entityManager->persist($newDemo);
        $entityManager->persist($old);
        $entityManager->persist($new);
        $entityManager->flush();

        $client->request('GET', '/api/players/76561198000000000/history?limit=200&offset=0');

        self::assertResponseIsSuccessful();
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(100, $payload['limit']);
        self::assertCount(2, $payload['results']);
        self::assertSame('suspicious', $payload['results'][0]['label']);
        self::assertSame('clean', $payload['results'][1]['label']);
    }
}
