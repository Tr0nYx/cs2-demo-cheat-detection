<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Result\ResultIngestHandler;
use App\Application\Result\ResultIngestMessage;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ResultIngestController extends AbstractController
{
    public function __construct(
        private readonly ResultIngestHandler $handler,
        private readonly ApiErrorResponder $errors,
        #[Autowire(param: 'result_ingest_token')]
        private readonly string $token,
    ) {
    }

    #[Route('/api/internal/results', name: 'api_internal_results_ingest', methods: ['POST'])]
    public function ingest(Request $request): JsonResponse
    {
        if ($this->token === '' || !hash_equals($this->token, (string) $request->headers->get('X-Result-Ingest-Token', ''))) {
            return $this->errors->problem(ApiProblem::badRequest('invalid_ingest_token', 'Result ingest token is invalid.'));
        }

        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($payload)) {
                throw ApiProblem::badRequest('invalid_json', 'Request body must be a JSON object.');
            }

            return new JsonResponse($this->handler->__invoke(new ResultIngestMessage($payload)), 202);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\JsonException) {
            return $this->errors->problem(ApiProblem::badRequest('invalid_json', 'Request body must be valid JSON.'));
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }
}
