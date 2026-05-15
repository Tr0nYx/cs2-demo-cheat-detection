<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Demo\DemoResponseFactory;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class PlayerController extends AbstractController
{
    public function __construct(
        private readonly AnalysisResultRepository $results,
        private readonly DemoResponseFactory $responses,
    ) {
    }

    #[Route('/api/players/{steamId}/history', name: 'api_players_history', methods: ['GET'])]
    public function history(string $steamId, Request $request): JsonResponse
    {
        $limit = $request->query->getInt('limit', 20);
        $offset = $request->query->getInt('offset', 0);
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);
        $results = $this->results->newestForSteamId($steamId, $limit, $offset);

        return new JsonResponse([
            'steam_id' => $steamId,
            'limit' => $limit,
            'offset' => $offset,
            'results' => array_map(fn ($result): array => $this->responses->result($result), $results),
        ]);
    }
}
