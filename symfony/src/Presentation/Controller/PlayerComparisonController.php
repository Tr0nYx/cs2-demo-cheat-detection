<?php

declare(strict_types=1);

namespace App\Presentation\Controller;

use App\Application\Query\GetPlayerComparisonQuery;
use App\UI\Api\ApiErrorResponder;
use App\UI\Api\ApiProblem;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * PlayerComparisonController - REST API endpoint for player comparison view.
 *
 * Provides GET endpoint to retrieve comparison data for two players across 4 metrics:
 * component breakdown, TRACE trend, map affinity, and shared demo history.
 * Handles query validation, dispatches CQRS query, and serializes response.
 *
 * Endpoint: GET /api/players/{playerId}/compare?with={otherPlayerId}
 * Query parameters:
 * - with: string (required) - ID of player to compare against
 *
 * Response:
 * - 200: {playerAId, playerAName, playerAComponents, playerATrend, playerAMaps, playerAHistory, ...same for B}
 * - 400: Missing or invalid parameters (missing 'with', self-comparison)
 * - 404: Player not found
 * - 500: Server error
 */
#[Route('/api/players')]
final class PlayerComparisonController extends AbstractController
{
    public function __construct(
        private readonly MessageBusInterface $queryBus,
        private readonly SerializerInterface $serializer,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    /**
     * Get player comparison data for two players.
     *
     * Returns comprehensive comparison across 4 metrics: component breakdown,
     * TRACE trend (last 10 demos), map affinity (top 3 maps), and shared demos.
     *
     * @param Request $request HTTP request with query parameters
     * @param string $playerId First player ID (from URL path)
     * @return Response JSON response with 200, 400, or 500
     */
    #[Route('/{playerId}/compare', name: 'get_player_comparison', methods: ['GET'])]
    public function getPlayerComparison(Request $request, string $playerId): Response
    {
        try {
            // Extract compareWithId from query parameters
            $compareWithId = $request->query->get('with');

            // Validate 'with' parameter is present
            if (empty($compareWithId)) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'missing_parameter',
                        "Parameter 'with' is required for comparison.",
                    )
                );
            }

            // Validate self-comparison is not allowed
            if ($playerId === $compareWithId) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_comparison',
                        'Cannot compare a player with themselves.',
                    )
                );
            }

            // Create and dispatch query
            $query = new GetPlayerComparisonQuery(
                playerId: $playerId,
                compareWithId: $compareWithId,
            );

            $result = $this->queryBus->dispatch($query);

            // Serialize response to JSON
            $data = $this->serializer->normalize($result);

            // Return response with cache headers per D-14
            $response = new Response(
                content: json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
                status: 200,
                headers: ['Content-Type' => 'application/json']
            );
            $response->headers->set('Cache-Control', 'public, max-age=300');

            return $response;
        } catch (\InvalidArgumentException $e) {
            // Validation errors from handler
            return $this->errors->problem(
                ApiProblem::badRequest('validation_error', $e->getMessage())
            );
        } catch (\Throwable $e) {
            // Unexpected errors
            return $this->errors->problem(
                ApiProblem::serverError(
                    'internal_error',
                    'An unexpected error occurred while fetching player comparison.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }
}
