<?php

declare(strict_types=1);

namespace App\Application\Demo;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class HltvImportController extends AbstractController
{
    #[Route('/api/admin/hltv-import', name: 'api_admin_hltv_import', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function __invoke(Request $request, MessageBusInterface $messageBus): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $url = $data['url'] ?? null;

        if (!$url || !is_string($url) || !str_starts_with($url, 'https://www.hltv.org/matches/')) {
            return $this->json(['error' => 'Invalid HLTV match URL provided'], 400);
        }

        $messageBus->dispatch(new HltvImportMessage($url));

        return $this->json([
            'status' => 'pending',
            'message' => 'HLTV match queued for import'
        ], 202);
    }
}
