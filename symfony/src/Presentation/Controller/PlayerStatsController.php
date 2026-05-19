<?php

declare(strict_types=1);

namespace App\Presentation\Controller;

use App\Application\Handler\GetPlayerStatsHandler;
use App\Application\Query\GetPlayerStatsQuery;
use App\Domain\Player\PlayerNotFoundException;
use App\UI\Api\ApiErrorResponder;
use App\UI\Api\ApiProblem;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

#[Route('/api/players')]
final class PlayerStatsController extends AbstractController
{
    public function __construct(
        private readonly GetPlayerStatsHandler $handler,
        private readonly SerializerInterface $serializer,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    #[Route('/{steamId}/stats', name: 'get_player_stats', methods: ['GET'])]
    public function stats(string $steamId, Request $request): Response
    {
        try {
            $query = new GetPlayerStatsQuery(
                steamId: $steamId,
                window: (string) $request->query->get('window', '30d'),
            );
            $data = $this->serializer->normalize(($this->handler)($query));

            $response = new Response(
                content: json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
                status: 200,
                headers: ['Content-Type' => 'application/json'],
            );
            $response->headers->set('Cache-Control', 'public, max-age=3600');

            return $response;
        } catch (PlayerNotFoundException $e) {
            return $this->errors->problem(ApiProblem::notFound('player_not_found', $e->getMessage()));
        } catch (\InvalidArgumentException $e) {
            return $this->errors->problem(ApiProblem::badRequest('validation_error', $e->getMessage()));
        } catch (\Throwable $e) {
            return $this->errors->problem(
                ApiProblem::serverError(
                    'internal_error',
                    'An unexpected error occurred while fetching player statistics.',
                    ['exception' => $e->getMessage()],
                ),
            );
        }
    }
}
