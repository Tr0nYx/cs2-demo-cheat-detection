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
