<?php
declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Import\ImportSharecodeService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/demos')]
final class DemoImportController extends AbstractController
{
    public function __construct(
        private readonly ImportSharecodeService $importService,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    #[Route('/import-sharecode', name: 'api_demos_import_sharecode', methods: ['POST'])]
    public function importSharecode(Request $request): JsonResponse
    {
        try {
            // Parse request
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

            if (!isset($data['sharecodes']) || !is_array($data['sharecodes'])) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'missing_sharecodes',
                        'Provide sharecodes as array: {"sharecodes": ["CSGO-...", ...]}'
                    )
                );
            }

            if (empty($data['sharecodes'])) {
                return $this->errors->problem(
                    ApiProblem::badRequest('empty_sharecodes', 'Sharecodes array cannot be empty.')
                );
            }

            if (count($data['sharecodes']) > 100) {
                return $this->errors->problem(
                    ApiProblem::badRequest(
                        'too_many_sharecodes',
                        'Maximum 100 sharecodes per request. Submit in batches.'
                    )
                );
            }

            // Get authenticated user
            $user = $this->getUser();
            if ($user === null) {
                return $this->errors->problem(ApiProblem::unauthorized());
            }

            // Process imports
            $results = $this->importService->importMultiple(
                sharecodes: array_map('strval', $data['sharecodes']),
                userId: $user->getId(),
            );

            return new JsonResponse([
                'queued' => count($results['queued']),
                'failed' => count($results['failed']),
                'imports' => [
                    'queued' => $results['queued'],
                    'failed' => $results['failed'],
                ],
            ], 202);

        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\JsonException) {
            return $this->errors->problem(
                ApiProblem::badRequest('invalid_json', 'Request body must be valid JSON.')
            );
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('/import-history', name: 'api_demos_import_history', methods: ['GET'])]
    public function importHistory(Request $request): JsonResponse
    {
        try {
            $user = $this->getUser();
            if ($user === null) {
                return $this->errors->problem(ApiProblem::unauthorized());
            }

            $limit = (int) $request->query->get('limit', 50);
            $limit = min($limit, 500); // Cap at 500

            $imports = $this->importService->getHistory($user->getId(), $limit);

            return new JsonResponse([
                'imports' => array_map(fn($imp) => [
                    'id' => $imp->getId()->toRfc4122(),
                    'sharecode' => $imp->getSharecode(),
                    'platform' => $imp->getPlatform(),
                    'status' => $imp->getStatus(),
                    'imported_at' => $imp->getImportedAt()->format(\DateTimeInterface::ATOM),
                    'completed_at' => $imp->getCompletedAt()?->format(\DateTimeInterface::ATOM),
                    'demo_id' => $imp->getDemoId()?->toRfc4122(),
                    'error_message' => $imp->getErrorMessage(),
                ], $imports),
                'total' => count($imports),
            ]);

        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }
}
