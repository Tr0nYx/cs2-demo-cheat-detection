<?php

declare(strict_types=1);

namespace App\Application\Result;

use App\Domain\Analysis\SuspicionLabel;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use App\Infrastructure\Persistence\DemoRepository;
use App\Infrastructure\Persistence\PlayerRepository;
use App\Infrastructure\Persistence\ViewerEventRepository;
use App\UI\Api\ApiProblem;
use Doctrine\ORM\EntityManagerInterface;

final readonly class ResultIngestHandler
{
    public function __construct(
        private ResultPayloadValidator $validator,
        private DemoRepository $demos,
        private PlayerRepository $players,
        private AnalysisResultRepository $results,
        private ViewerEventRepository $viewerEvents,
        private EntityManagerInterface $entityManager,
    ) {
    }

    /** @return array{results_written: int} */
    public function __invoke(ResultIngestMessage $message): array
    {
        $payload = $this->validator->validate($message->payload);
        $demo = $this->demos->findByUuidString($payload['demo_id']);

        if ($demo === null) {
            throw ApiProblem::notFound('demo_not_found', 'Demo not found.');
        }

        if ($payload['error'] !== null) {
            $demo->markError($payload['error']);
            $this->entityManager->flush();

            return ['results_written' => 0];
        }

        foreach ($payload['results'] as $result) {
            $player = $this->players->findOrCreateBySteamId($result['steam_id'], $result['display_name']);
            $this->results->upsertForDemoAndPlayer(
                $demo,
                $player,
                $result['round_count'],
                $result['aimbot_score'],
                $result['wallhack_score'],
                $result['triggerbot_score'],
                $result['recoil_score'],
                $result['bhop_score'],
                $result['session_consistency_score'],
                $result['overall_suspicion'],
                SuspicionLabel::from($result['suspicion_label']),
                $result['feature_data'],
                $result['support_data'],
            );
        }

        $this->populateViewerSummaries($demo, $message->payload['viewer'] ?? []);
        $demo->markDone();
        $this->entityManager->flush();

        return ['results_written' => count($payload['results'])];
    }

    /** @param mixed $viewer */
    private function populateViewerSummaries(\App\Domain\Demo\Demo $demo, mixed $viewer): void
    {
        if (!is_array($viewer)) {
            return;
        }

        $rounds = is_array($viewer['rounds'] ?? null) ? $viewer['rounds'] : [];
        $grenades = is_array($viewer['grenades'] ?? null) ? $viewer['grenades'] : [];
        $kills = is_array($viewer['suspicious_kills'] ?? $viewer['kills'] ?? null) ? ($viewer['suspicious_kills'] ?? $viewer['kills']) : [];

        if ($rounds === [] && $grenades === [] && $kills === []) {
            return;
        }

        $this->viewerEvents->clearViewerSummaries($demo);

        foreach ($rounds as $round) {
            if (is_array($round)) {
                $this->viewerEvents->addRoundSummary($demo, $round);
            }
        }

        foreach ($grenades as $grenade) {
            if (is_array($grenade)) {
                $this->viewerEvents->addGrenadeSummary($demo, $grenade);
            }
        }

        foreach ($kills as $kill) {
            if (!is_array($kill)) {
                continue;
            }
            $signal = is_array($kill['review_signal'] ?? null) ? $kill['review_signal'] : [];
            $reasons = $kill['flag_reasons'] ?? $signal['flag_reasons'] ?? [];
            if (is_array($reasons) && $reasons !== []) {
                $this->viewerEvents->addSuspiciousKillSummary($demo, $kill);
            }
        }
    }
}
