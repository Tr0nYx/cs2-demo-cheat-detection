<?php

declare(strict_types=1);

namespace App\Presentation\Controller;

use App\Application\Handler\GetFilteredLeaderboardHandler;
use App\Application\Query\GetGlobalLeaderboardQuery;
use App\Application\Query\GetFilteredLeaderboardQuery;
use App\Application\Query\GetMapLeaderboardQuery;
use App\Application\Query\GetTeamLeaderboardQuery;
use App\Application\Query\GetTimeWindowLeaderboardQuery;
use App\UI\Api\ApiErrorResponder;
use App\UI\Api\ApiProblem;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * LeaderboardController - REST API endpoints for leaderboard rankings.
 *
 * Provides GET endpoints to retrieve paginated global leaderboard rankings,
 * including qualified players (5+ demos) sorted by 95th percentile TRACE score.
 * Handles query validation, dispatches CQRS query, and serializes response.
 *
 * Endpoint: GET /api/leaderboards/global
 * Query parameters:
 * - limit: int (1-100, default 100) - results per page
 * - offset: int (default 0) - skip first N results
 *
 * Response:
 * - 200: {entries: LeaderboardEntryDto[], pagination: {total, limit, offset, hasMore}}
 * - 400: Invalid query parameters (limit, offset out of range)
 * - 500: Server error
 */
#[Route('/api/leaderboards')]
final class LeaderboardController extends AbstractController
{
    public function __construct(
        private readonly MessageBusInterface $queryBus,
        private readonly SerializerInterface $serializer,
        private readonly ApiErrorResponder $errors,
        private readonly GetFilteredLeaderboardHandler $filteredLeaderboardHandler,
    ) {
    }

    #[Route('/filtered', name: 'get_filtered_leaderboard', methods: ['GET'])]
    public function getFilteredLeaderboard(Request $request): Response
    {
        try {
            $limit = (int) $request->query->get('limit', 100);
            $offset = (int) $request->query->get('offset', 0);
            $daysBack = $request->query->get('days_back');

            $query = new GetFilteredLeaderboardQuery(
                map: $request->query->get('map'),
                ratingBand: $request->query->get('rating_band'),
                daysBack: $daysBack === null ? null : (int) $daysBack,
                limit: $limit,
                offset: $offset,
            );

            $result = ($this->filteredLeaderboardHandler)($query);
            $data = $this->serializer->normalize($result);

            $response = new Response(
                content: json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
                status: 200,
                headers: ['Content-Type' => 'application/json']
            );
            $response->headers->set('Cache-Control', 'public, max-age=300');
            $response->headers->set('X-Total-Count', (string) ($data['total'] ?? 0));

            return $response;
        } catch (\InvalidArgumentException $e) {
            return $this->errors->problem(
                ApiProblem::badRequest('validation_error', $e->getMessage())
            );
        } catch (\Throwable $e) {
            return $this->errors->problem(
                ApiProblem::serverError(
                    'internal_error',
                    'An unexpected error occurred while fetching the filtered leaderboard.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }

    /**
     * Get global leaderboard with qualified players ranked by 95th percentile TRACE score.
     *
     * Returns paginated global leaderboard with players who have at least 5 demos,
     * ranked by their 95th percentile TRACE score in descending order.
     *
     * @param Request $request HTTP request with query parameters
     * @return Response JSON response with 200, 400, or 500
     */
    #[Route('/global', name: 'get_global_leaderboard', methods: ['GET'])]
    public function getGlobalLeaderboard(Request $request): Response
    {
        try {
            // Parse query parameters
            $limit = (int) $request->query->get('limit', 100);
            $offset = (int) $request->query->get('offset', 0);

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

            // Create and dispatch query
            $query = new GetGlobalLeaderboardQuery(
                limit: $limit,
                offset: $offset,
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
                    'An unexpected error occurred while fetching the global leaderboard.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }

    /**
     * Get per-map leaderboard with qualified players ranked by 95th percentile TRACE score.
     *
     * Returns paginated per-map leaderboard with players who have at least 5 demos globally,
     * filtered to a specific map (e.g., de_mirage), ranked by their TRACE score descending.
     *
     * @param Request $request HTTP request with query parameters
     * @param string $mapId Map identifier (e.g., 'de_mirage')
     * @return Response JSON response with 200, 400, or 500
     */
    #[Route('/maps/{mapId}', name: 'get_map_leaderboard', methods: ['GET'])]
    public function getMapLeaderboard(Request $request, string $mapId): Response
    {
        try {
            // Validate mapId: must be non-empty, alphanumeric/underscore, max 64 chars
            if (empty($mapId) || !preg_match('/^[a-z0-9_]+$/i', $mapId) || strlen($mapId) > 64) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_map_id',
                        'Map ID must be alphanumeric with underscores (max 64 chars).',
                        ['provided' => $mapId]
                    )
                );
            }

            // Parse query parameters
            $limit = (int) $request->query->get('limit', 100);
            $offset = (int) $request->query->get('offset', 0);

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

            // Create and dispatch query
            $query = new GetMapLeaderboardQuery(
                mapId: $mapId,
                limit: $limit,
                offset: $offset,
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
                    'An unexpected error occurred while fetching the map leaderboard.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }

    /**
     * Get time-windowed leaderboard with qualified players within a time range.
     *
     * Returns paginated time-windowed leaderboard with players who have at least 5 demos
     * within the specified time window (30 days or 90 days), ranked by their TRACE score descending.
     *
     * @param Request $request HTTP request with query parameters
     * @param string $timeWindow Time window identifier ('30d' or '90d')
     * @return Response JSON response with 200, 400, or 500
     */
    #[Route('/windows/{timeWindow}', name: 'get_time_window_leaderboard', methods: ['GET'])]
    public function getTimeWindowLeaderboard(Request $request, string $timeWindow): Response
    {
        try {
            // Validate timeWindow is '30d' or '90d'
            if (!in_array($timeWindow, ['30d', '90d'], true)) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'invalid_time_window',
                        'Time window must be 30d or 90d.',
                        ['provided' => $timeWindow]
                    )
                );
            }

            // Parse query parameters
            $limit = (int) $request->query->get('limit', 100);
            $offset = (int) $request->query->get('offset', 0);

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

            // Create and dispatch query
            $query = new GetTimeWindowLeaderboardQuery(
                timeWindow: $timeWindow,
                limit: $limit,
                offset: $offset,
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
                    'An unexpected error occurred while fetching the time-window leaderboard.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }

    /**
     * Get global team leaderboard with qualified teams ranked by aggregated 95th percentile TRACE score.
     *
     * Returns paginated global team leaderboard with teams that have at least one member with 5+ demos,
     * ranked by their aggregated 95th percentile TRACE score in descending order.
     * Per D-01, this endpoint returns global team leaderboard (all teams ranked against each other).
     *
     * @param Request $request HTTP request with query parameters
     * @return Response JSON response with 200, 400, or 500
     */
    #[Route('/teams', name: 'get_team_leaderboard', methods: ['GET'])]
    public function getTeamLeaderboard(Request $request): Response
    {
        try {
            // Parse query parameters
            $limit = (int) $request->query->get('limit', 100);
            $offset = (int) $request->query->get('offset', 0);

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

            // Create and dispatch query
            $query = new GetTeamLeaderboardQuery(
                limit: $limit,
                offset: $offset,
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
                    'An unexpected error occurred while fetching the team leaderboard.',
                    ['exception' => $e->getMessage()]
                )
            );
        }
    }
}
