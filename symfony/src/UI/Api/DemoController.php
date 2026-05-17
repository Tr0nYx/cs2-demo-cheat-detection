<?php

declare(strict_types=1);

namespace App\UI\Api;

use App\Application\Demo\DemoResponseFactory;
use App\Application\Demo\UploadDemoRequest;
use App\Application\Demo\UploadDemoService;
use App\Infrastructure\Persistence\DemoRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/demos')]
final class DemoController extends AbstractController
{
    public function __construct(
        private readonly UploadDemoService $uploadDemos,
        private readonly DemoRepository $demos,
        private readonly DemoResponseFactory $responses,
        private readonly ApiErrorResponder $errors,
    ) {
    }

    #[Route('', name: 'api_demos_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $file = $request->files->get('demo') ?? $request->files->get('file');

        if ($file === null) {
            return $this->errors->problem(ApiProblem::badRequest('missing_file', 'Upload a .dem file in the demo field.'));
        }

        try {
            $demo = $this->uploadDemos->upload(new UploadDemoRequest($file, $request->request->getString('steam_match_id') ?: null));

            return new JsonResponse($this->responses->demo($demo), 202);
        } catch (ApiProblem $problem) {
            return $this->errors->problem($problem);
        } catch (\Throwable) {
            return $this->errors->unexpected();
        }
    }

    #[Route('', name: 'api_demos_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        try {
            $page = $request->query->getInt('page', 1);
            $limit = $request->query->getInt('limit', 20);
            $sortBy = $request->query->getString('sort', 'date');
            $sortOrder = $request->query->getString('order', 'desc');

            // Validate pagination parameters
            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;

            $offset = ($page - 1) * $limit;

            // Get all demos (for now, no user filtering)
            // TODO: When user authentication is integrated, filter by current user's steam_id
            $allDemos = $this->demos->findAll();

            // Sort demos
            usort($allDemos, function ($a, $b) use ($sortBy, $sortOrder) {
                $comparison = 0;

                if ($sortBy === 'date') {
                    $comparison = ($b->getUploadedAt() <=> $a->getUploadedAt());
                } elseif ($sortBy === 'suspicion') {
                    // Get average suspicion score from all analysis results
                    $aResults = $a->getAnalysisResults()->toArray();
                    $bResults = $b->getAnalysisResults()->toArray();

                    $aScore = 0;
                    if (!empty($aResults)) {
                        $sum = 0;
                        foreach ($aResults as $result) {
                            $sum += $result->getOverallSuspicion();
                        }
                        $aScore = $sum / count($aResults);
                    }

                    $bScore = 0;
                    if (!empty($bResults)) {
                        $sum = 0;
                        foreach ($bResults as $result) {
                            $sum += $result->getOverallSuspicion();
                        }
                        $bScore = $sum / count($bResults);
                    }

                    $comparison = $bScore <=> $aScore;
                }

                return $sortOrder === 'asc' ? -$comparison : $comparison;
            });

            $total = count($allDemos);
            $demos = array_slice($allDemos, $offset, $limit);

            $demoResponses = array_map(fn ($demo) => $this->responses->demo($demo), $demos);

            return new JsonResponse([
                'demos' => $demoResponses,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit,
                    'hasMore' => ($offset + $limit) < $total,
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->errors->unexpected();
        }
    }

    #[Route('/{id}', name: 'api_demos_show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $demo = $this->demos->findByUuidString($id);

        if ($demo === null) {
            return $this->errors->problem(ApiProblem::notFound('demo_not_found', 'Demo not found.'));
        }

        return new JsonResponse($this->responses->demo($demo));
    }
}
