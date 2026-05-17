<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Trace\TraceMapper;
use App\Infrastructure\Persistence\AnalysisResultRepository;
use App\Infrastructure\Persistence\TraceRatingRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * TraceController - API endpoint for TRACE rating data.
 *
 * Provides GET endpoint to retrieve TRACE (Tactical Round Action & Contribution Evaluation)
 * scores for a demo analysis. Handles demo validation, TRACE existence checking, and
 * serialization to JSON response.
 */
#[Route('/api/demos')]
final class TraceController extends AbstractController
{
    public function __construct(
        private readonly AnalysisResultRepository $analysisResults,
        private readonly TraceRatingRepository $traceRatings,
        private readonly TraceMapper $mapper,
        private readonly ApiErrorResponder $errors,
        private readonly SerializerInterface $serializer,
    ) {
    }

    /**
     * Get TRACE rating data for a demo.
     *
     * Returns the TRACE (Tactical Round Action & Contribution Evaluation) breakdown
     * including component scores, trust multiplier, calibration version, and timestamps.
     *
     * @param string $id Demo ID (UUID)
     * @return JsonResponse TRACE data with 200, or error with 404/400/500
     */
    #[Route('/{id}/trace', name: 'get_trace', methods: ['GET'])]
    public function getTrace(string $id): Response
    {
        try {
            // Parse and validate demo ID as UUID
            $demoId = Uuid::fromString($id);
        } catch (\InvalidArgumentException) {
            return $this->errors->problem(
                ApiProblem::badRequest('invalid_demo_id', 'Demo ID must be a valid UUID.')
            );
        }

        // Check if demo exists
        $analysisResult = $this->analysisResults->find($demoId);
        if ($analysisResult === null) {
            return $this->errors->problem(
                ApiProblem::notFound('demo_not_found', 'Demo not found.')
            );
        }

        // Check if TRACE has been calculated for this demo
        $traceRating = $this->traceRatings->findOneBy(['analysisResult' => $analysisResult]);
        if ($traceRating === null) {
            return $this->errors->problem(
                ApiProblem::notFound('trace_not_calculated', 'TRACE not yet calculated for this demo.')
            );
        }

        // Map entity to DTO and return response
        $traceDto = $this->mapper->toDto($traceRating);

        // Serialize DTO to array with camelCase property names
        $data = $this->serializer->normalize($traceDto);

        $response = new JsonResponse($data, 200);
        $response->headers->set('Cache-Control', 'public, max-age=3600');

        return $response;
    }
}
