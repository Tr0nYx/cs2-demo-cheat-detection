<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Command\GenerateHeatmapMessage;
use App\Application\Handler\GenerateHeatmapHandler;
use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStatus;
use App\Infrastructure\Cache\DemoHeatmapCacheRepository;
use App\Infrastructure\Cache\DemoTickCacheRepository;
use App\Infrastructure\Persistence\DemoRepository;
use App\Infrastructure\Persistence\ViewerEventRepository;
use App\Infrastructure\Queue\RedisViewerJobPublisher;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/demos')]
final class DemoViewerController extends AbstractController
{
    private const EVENT_TYPES = ['all', 'kills', 'grenades', 'damage'];
    private const HEATMAP_TYPES = ['kills', 'deaths', 'damage', 'taken', 'grenades'];
    private const DEFAULT_TICK_STEP = 4;
    private const MAX_TICK_RANGE = 5000;

    public function __construct(
        private readonly DemoRepository $demos,
        private readonly ViewerEventRepository $events,
        private readonly DemoHeatmapCacheRepository $heatmaps,
        private readonly DemoTickCacheRepository $tickCache,
        private readonly GenerateHeatmapHandler $generateHeatmap,
        private readonly RedisViewerJobPublisher $viewerJobs,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    #[Route('/{id}/ticks', name: 'api_demo_viewer_ticks', methods: ['GET'])]
    public function ticks(string $id, Request $request): JsonResponse
    {
        try {
            $demo = $this->requireAnalyzedDemo($id);
            $round = $this->nullablePositiveInt($request->query->get('round'), 'round');
            $fromTick = $this->nullablePositiveInt($request->query->get('from_tick'), 'from_tick');
            $toTick = $this->nullablePositiveInt($request->query->get('to_tick'), 'to_tick');
            $step = $this->nullablePositiveInt($request->query->get('step'), 'step') ?? self::DEFAULT_TICK_STEP;
            $players = $this->playerList($request);

            if ($step > 128) {
                throw ApiProblem::badRequest('invalid_step', 'step must be between 1 and 128.');
            }

            if ($round !== null && ($fromTick === null || $toTick === null)) {
                [$roundStart, $roundEnd] = $this->resolveRoundRange($demo, $round);
                $fromTick ??= $roundStart;
                $toTick ??= $roundEnd;
            }

            if ($fromTick === null || $toTick === null) {
                throw ApiProblem::badRequest('missing_tick_range', 'Provide from_tick and to_tick, or provide a round.');
            }

            if ($fromTick > $toTick) {
                throw ApiProblem::badRequest('invalid_tick_range', 'from_tick must be less than or equal to to_tick.');
            }

            if (($toTick - $fromTick) > self::MAX_TICK_RANGE) {
                throw ApiProblem::badRequest('tick_range_too_large', 'Tick range is too large for one request.', [
                    'max_range' => self::MAX_TICK_RANGE,
                ]);
            }

            $payload = $this->tickCache->fetch($demo->getIdString(), $fromTick, $toTick, $step);

            if ($payload === null) {
                $this->viewerJobs->publish([
                    'type' => 'export_ticks',
                    'demo_id' => $demo->getIdString(),
                    'from_tick' => $fromTick,
                    'to_tick' => $toTick,
                    'step' => $step,
                    'players' => $players,
                ]);

                return new JsonResponse([
                    'status' => 'generating',
                    'retryAfterSeconds' => 3,
                    'from_tick' => $fromTick,
                    'to_tick' => $toTick,
                    'step' => $step,
                ], 202, ['Retry-After' => '3']);
            }

            return new JsonResponse($this->filterTickPlayers($payload, $players) + [
                'status' => 'ready',
                'from_tick' => $fromTick,
                'to_tick' => $toTick,
                'step' => $step,
            ]);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('/{id}/heatmap', name: 'api_demo_viewer_heatmap', methods: ['GET'])]
    public function heatmap(string $id, Request $request): Response
    {
        try {
            $demo = $this->requireAnalyzedDemo($id);
            $type = $request->query->getString('type', 'kills');
            $player = $this->nullablePlayer($request->query->get('player'));
            $roundFrom = $this->nullablePositiveInt($request->query->get('round_from'), 'round_from');
            $roundTo = $this->nullablePositiveInt($request->query->get('round_to'), 'round_to');

            if (!in_array($type, self::HEATMAP_TYPES, true)) {
                throw ApiProblem::badRequest('invalid_heatmap_type', 'Heatmap type must be one of kills, deaths, damage, taken, or grenades.', [
                    'type' => $type,
                ]);
            }

            if ($roundFrom !== null && $roundTo !== null && $roundFrom > $roundTo) {
                throw ApiProblem::badRequest('invalid_round_range', 'round_from must be less than or equal to round_to.');
            }

            $bytes = $this->heatmaps->fetchBytes($demo->getIdString(), $player, $type, $roundFrom, $roundTo)
                ?? $this->heatmaps->fetchFile($demo->getIdString(), $player, $type, $roundFrom, $roundTo);

            if ($bytes !== null) {
                return $this->png($bytes);
            }

            ($this->generateHeatmap)(new GenerateHeatmapMessage(
                $demo->getIdString(),
                $type,
                $player,
                $roundFrom,
                $roundTo,
            ));

            return new JsonResponse([
                'status' => 'generating',
                'retryAfterSeconds' => 5,
            ], 202, ['Retry-After' => '5']);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('/{id}/rounds', name: 'api_demo_viewer_rounds', methods: ['GET'])]
    public function rounds(string $id): JsonResponse
    {
        try {
            $demo = $this->requireAnalyzedDemo($id);

            return new JsonResponse([
                'rounds' => array_map($this->round(...), $this->events->findRoundsForDemo($demo)),
            ]);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('/{id}/events', name: 'api_demo_viewer_events', methods: ['GET'])]
    public function events(string $id, Request $request): JsonResponse
    {
        try {
            $demo = $this->requireAnalyzedDemo($id);
            $type = $request->query->getString('type', 'all');
            $round = $this->nullablePositiveInt($request->query->get('round'), 'round');
            $player = $this->nullablePlayer($request->query->get('player'));

            if (!in_array($type, self::EVENT_TYPES, true)) {
                throw ApiProblem::badRequest('invalid_event_type', 'Event type must be one of all, kills, grenades, or damage.', [
                    'type' => $type,
                ]);
            }

            $payload = [];

            if ($type === 'all' || $type === 'kills') {
                $payload['kills'] = array_map(
                    $this->kill(...),
                    $this->events->findKillsForDemo($demo, $round, $player),
                );
            }

            if ($type === 'all' || $type === 'grenades') {
                $payload['grenades'] = array_map(
                    $this->grenade(...),
                    $this->events->findGrenadesForDemo($demo, $round, $player),
                );
            }

            if ($type === 'all' || $type === 'damage') {
                $payload['damage'] = $this->events->findDamageEventsForDemo($demo, $round, $player);
            }

            return new JsonResponse($payload);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    private function requireAnalyzedDemo(string $id): Demo
    {
        $demo = $this->demos->findByUuidString($id);

        if ($demo === null) {
            throw ApiProblem::notFound('demo_not_found', 'Demo not found.');
        }

        if ($demo->getStatus() !== DemoStatus::Done) {
            throw ApiProblem::badRequest('demo_not_analyzed', 'Demo viewer data is available after analysis completes.', [
                'status' => $demo->getStatus()->value,
            ]);
        }

        return $demo;
    }

    private function nullablePositiveInt(mixed $value, string $name): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_scalar($value) || !ctype_digit((string) $value) || (int) $value < 1) {
            throw ApiProblem::badRequest('invalid_'.$name, str_replace('_', ' ', $name).' must be a positive integer.');
        }

        return (int) $value;
    }

    private function nullablePlayer(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_string($value) || preg_match('/^[A-Za-z0-9_:-]{1,64}$/', $value) !== 1) {
            throw ApiProblem::badRequest('invalid_player', 'Player filter must be a stable player identifier.');
        }

        return $value;
    }

    /** @return list<string> */
    private function playerList(Request $request): array
    {
        $values = $request->query->all('players');
        if ($values === []) {
            $single = $request->query->get('player');
            $values = $single === null ? [] : [$single];
        }

        $players = [];
        foreach ($values as $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $players[] = $this->nullablePlayer($value);
        }

        return array_values(array_filter($players));
    }

    /** @return array{0: int, 1: int} */
    private function resolveRoundRange(Demo $demo, int $roundNumber): array
    {
        foreach ($this->events->findRoundsForDemo($demo) as $round) {
            if ($round['roundNumber'] === $roundNumber) {
                return [$round['startTick'], $round['endTick']];
            }
        }

        throw ApiProblem::notFound('round_not_found', 'Round metadata not found for this demo.', [
            'round' => $roundNumber,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $players
     * @return array<string, mixed>
     */
    private function filterTickPlayers(array $payload, array $players): array
    {
        if ($players === [] || !isset($payload['ticks']) || !is_array($payload['ticks'])) {
            return $payload;
        }

        $allowed = array_flip($players);
        $payload['ticks'] = array_map(static function (mixed $tick) use ($allowed): mixed {
            if (!is_array($tick) || !isset($tick['players']) || !is_array($tick['players'])) {
                return $tick;
            }

            $tick['players'] = array_values(array_filter(
                $tick['players'],
                static fn (mixed $player): bool => is_array($player)
                    && isset($player['steam_id'])
                    && array_key_exists((string) $player['steam_id'], $allowed),
            ));

            return $tick;
        }, $payload['ticks']);

        return $payload;
    }

    /** @return array<string, mixed> */
    private function round(array $round): array
    {
        return [
            'round_number' => $round['roundNumber'],
            'start_tick' => $round['startTick'],
            'end_tick' => $round['endTick'],
            'winner' => $round['winner'],
            'end_reason' => $round['reason'],
            'duration_ms' => $round['durationMs'],
            'kills' => $round['kills'],
            'first_kill_tick' => $round['firstKillTick'],
            'bomb_planted' => $round['bombPlanted'],
        ];
    }

    /** @return array<string, mixed> */
    private function grenade(array $grenade): array
    {
        return [
            'round_number' => $grenade['roundNumber'],
            'tick' => $grenade['tick'],
            'time_ms' => $grenade['timeMs'],
            'thrower' => [
                'steam_id' => $grenade['thrower']['steamId'],
                'name' => $grenade['thrower']['name'],
            ],
            'type' => $grenade['type'],
            'start' => $grenade['start'],
            'end' => $grenade['end'],
            'end_map_px' => $grenade['endMapPixel']['x'],
            'end_map_py' => $grenade['endMapPixel']['y'],
            'trajectory' => $grenade['trajectory'],
        ];
    }

    /** @return array<string, mixed> */
    private function kill(array $kill): array
    {
        return [
            'round_number' => $kill['roundNumber'],
            'tick' => $kill['tick'],
            'attacker' => [
                'steam_id' => $kill['attacker']['steamId'],
                'name' => $kill['attacker']['name'],
                'position' => $kill['attacker']['position'],
            ],
            'victim' => [
                'steam_id' => $kill['victim']['steamId'],
                'name' => $kill['victim']['name'],
                'position' => $kill['victim']['position'],
            ],
            'weapon' => $kill['weapon'],
            'headshot' => $kill['headshot'],
            'review_signal' => [
                'suspicion_score' => $kill['reviewSignal']['aimbotScore'],
                'aimbot_score' => $kill['reviewSignal']['aimbotScore'],
                'snap_ratio' => $kill['reviewSignal']['snapRatio'],
                'reaction_ms' => $kill['reviewSignal']['reactionMs'],
                'flag_reasons' => $kill['reviewSignal']['flaggedReasons'],
            ],
        ];
    }

    private function png(string $bytes): Response
    {
        return new Response($bytes, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }
}
