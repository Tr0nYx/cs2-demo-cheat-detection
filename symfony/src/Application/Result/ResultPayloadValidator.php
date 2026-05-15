<?php

declare(strict_types=1);

namespace App\Application\Result;

use App\Domain\Analysis\SuspicionLabel;
use App\UI\Api\ApiProblem;
use Symfony\Component\Uid\Uuid;

final readonly class ResultPayloadValidator
{
    /** @param array<string, mixed> $payload @return array{demo_id: string, error: ?string, results: list<array<string, mixed>>} */
    public function validate(array $payload): array
    {
        $demoId = $payload['demo_id'] ?? null;
        if (!is_string($demoId) || !Uuid::isValid($demoId)) {
            throw ApiProblem::badRequest('invalid_demo_id', 'Result ingest payload must include a valid demo_id.');
        }

        $error = $payload['error'] ?? null;
        if (is_string($error) && $error !== '') {
            return ['demo_id' => $demoId, 'error' => $error, 'results' => []];
        }

        $results = $payload['results'] ?? null;
        if (!is_array($results)) {
            throw ApiProblem::badRequest('invalid_results', 'Result ingest payload must include a results array.');
        }

        $normalized = [];
        foreach ($results as $index => $result) {
            if (!is_array($result)) {
                throw ApiProblem::badRequest('invalid_result', 'Each result must be an object.', ['index' => $index]);
            }

            $label = $result['suspicion_label'] ?? $result['label'] ?? null;
            if (!is_string($label) || SuspicionLabel::tryFrom($label) === null) {
                throw ApiProblem::badRequest('invalid_label', 'Each result must include a valid suspicion label.', ['index' => $index]);
            }

            $steamId = $result['steam_id'] ?? null;
            if (!is_string($steamId) || $steamId === '') {
                throw ApiProblem::badRequest('invalid_player', 'Each result must include a steam_id.', ['index' => $index]);
            }

            $scores = $result['scores'] ?? [];
            if (!is_array($scores)) {
                throw ApiProblem::badRequest('invalid_scores', 'Result scores must be an object.', ['index' => $index]);
            }

            $normalized[] = [
                'steam_id' => $steamId,
                'display_name' => is_string($result['display_name'] ?? null) ? $result['display_name'] : null,
                'round_count' => (int) ($result['round_count'] ?? 0),
                'aimbot_score' => $this->score($result, $scores, 'aimbot_score', 'aimbot'),
                'wallhack_score' => $this->score($result, $scores, 'wallhack_score', 'wallhack'),
                'triggerbot_score' => $this->score($result, $scores, 'triggerbot_score', 'triggerbot'),
                'recoil_score' => $this->score($result, $scores, 'recoil_score', 'recoil'),
                'bhop_score' => $this->score($result, $scores, 'bhop_score', 'bhop'),
                'session_consistency_score' => $this->score($result, $scores, 'session_consistency_score', 'session_consistency'),
                'overall_suspicion' => $this->score($result, $scores, 'overall_suspicion', 'overall'),
                'suspicion_label' => $label,
                'feature_data' => is_array($result['feature_data'] ?? null) ? $result['feature_data'] : [],
                'support_data' => is_array($result['support_data'] ?? null) ? $result['support_data'] : [],
            ];
        }

        return ['demo_id' => $demoId, 'error' => null, 'results' => $normalized];
    }

    /** @param array<string, mixed> $result @param array<string, mixed> $scores */
    private function score(array $result, array $scores, string $flatKey, string $nestedKey): float
    {
        $value = $result[$flatKey] ?? $scores[$nestedKey] ?? null;

        if (!is_int($value) && !is_float($value)) {
            throw ApiProblem::badRequest('invalid_scores', sprintf('Missing numeric score: %s.', $flatKey));
        }

        if ($value < 0.0 || $value > 1.0) {
            throw ApiProblem::badRequest('invalid_scores', sprintf('Score %s must be between 0 and 1.', $flatKey));
        }

        return (float) $value;
    }
}
