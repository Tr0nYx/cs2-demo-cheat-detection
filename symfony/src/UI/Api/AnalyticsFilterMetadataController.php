<?php

declare(strict_types=1);

namespace App\UI\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

final class AnalyticsFilterMetadataController extends AbstractController
{
    #[Route('/api/analytics/filters/metadata', name: 'api_analytics_filters_metadata', methods: ['GET'])]
    public function metadata(CacheInterface $cache): JsonResponse
    {
        $metadata = $cache->get('analytics_filter_metadata_v1', function (ItemInterface $item): array {
            $item->expiresAfter(3600);

            return [
                'maps' => ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Vertigo'],
                'ratingBands' => [
                    ['id' => '0-5', 'label' => 'Below 5 RWS'],
                    ['id' => '5-10', 'label' => '5-10 RWS'],
                    ['id' => '10+', 'label' => '10+ RWS'],
                ],
                'outcomes' => [
                    ['id' => 'win', 'label' => 'Win'],
                    ['id' => 'loss', 'label' => 'Loss'],
                    ['id' => 'draw', 'label' => 'Draw'],
                ],
                'timeframes' => [
                    ['id' => '7', 'label' => 'Last 7 days'],
                    ['id' => '30', 'label' => 'Last 30 days'],
                    ['id' => '90', 'label' => 'Last 90 days'],
                    ['id' => '999', 'label' => 'All-time'],
                ],
            ];
        });

        return new JsonResponse($metadata);
    }
}
