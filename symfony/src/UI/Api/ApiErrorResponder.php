<?php

declare(strict_types=1);

namespace App\UI\Api;

use Symfony\Component\HttpFoundation\JsonResponse;

final readonly class ApiErrorResponder
{
    public function problem(ApiProblem $problem): JsonResponse
    {
        return new JsonResponse([
            'error' => [
                'code' => $problem->errorCode,
                'message' => $problem->getMessage(),
                'details' => $problem->details,
            ],
        ], $problem->statusCode);
    }

    public function unexpected(): JsonResponse
    {
        return new JsonResponse([
            'error' => [
                'code' => 'internal_error',
                'message' => 'The request could not be completed.',
                'details' => [],
            ],
        ], 500);
    }
}
