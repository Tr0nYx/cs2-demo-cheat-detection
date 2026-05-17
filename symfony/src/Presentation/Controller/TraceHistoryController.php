<?php

declare(strict_types=1);

namespace App\Presentation\Controller;

use App\Application\Query\GetPlayerTraceHistoryQuery;
use App\UI\Api\ApiErrorResponder;
use App\UI\Api\ApiProblem;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * TraceHistoryController - REST API endpoint for player TRACE history.
 *
 * Provides GET endpoint to retrieve paginated TRACE history for a player,
 * including percentile ranks for peer comparison. Handles query validation,
 * dispatches CQRS query, and serializes response.
 *
 * Endpoint: GET /api/players/{playerId}/trace-history
 * Query parameters:
 * - limit: int (1-100, default 10) - results per page
 * - offset: int (default 0) - skip first N results
 * - sortBy: string ('date'|'date_asc', default 'date') - sort order
 *
 * Response:
 * - 200: {traces: TraceHistoryDto[], pagination: {total, limit, offset, hasMore}}
 * - 400: Invalid player ID or query parameters
 * - 404: Player not found
 * - 500: Server error
 */
#[Route('/api/players')]
final class TraceHistoryController extends AbstractController
{
    public function __construct(
        private readonly MessageBusInterface $queryBus,
        private readonly SerializerInterface $serializer,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    /**
     * Get paginated TRACE history for a player with percentile ranks.
     *
     * Returns player's historical TRACE scores with component percentiles
     * enabling peer comparison and trend analysis.
     *
     * @param string $playerId Player ID (UUID or numeric ID)
     * @param Request $request HTTP request with query parameters
     * @return Response JSON response with 200, 400, 404, or 500
     */
    #[Route('/{playerId}/trace-history', name: 'get_trace_history', methods: ['GET'])]
    public function getTraceHistory(string $playerId, Request $request): Response
    {
        try {
            // Validate playerId is not empty
            if (empty($playerId)) {
                return $this->errors->problem(
                    ApiProblem::badRequest('invalid_player_id', 'Player ID cannot be empty.')
                );
            }

            // Parse query parameters
            $limit = (int) $request->query->get('limit', 10);
            $offset = (int) $request->query->get('offset', 0);
            $sortBy = (string) $request->query->get('sortBy', 'date');

            // Validate limit is in range [1, 100]
            if ($limit < 1 || $limit > 100) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_limit',
                        'Limit must be between 1 and 100.',
                        ['provided' => $limit]
                    )
                );
            }

            // Validate offset is non-negative
            if ($offset < 0) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_offset',
                        'Offset cannot be negative.',
                        ['provided' => $offset]
                    )
                );
            }

            // Validate sortBy is valid
            if (!\in_array($sortBy, ['date', 'date_asc'], true)) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_sort_by',
                        'sortBy must be "date" or "date_asc".',
                        ['provided' => $sortBy]
                    )
                );
            }

            // Create and dispatch query
            $query = new GetPlayerTraceHistoryQuery(
                playerId: $playerId,
                limit: $limit,
                offset: $offset,
                sortBy: $sortBy
            );

            $result = $this->queryBus->dispatch($query);

            // Serialize collection to JSON
            $data = $this->serializer->normalize($result);

            // Return response with cache headers
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
                    'An unexpected error occurred while fetching player TRACE history.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }
}
