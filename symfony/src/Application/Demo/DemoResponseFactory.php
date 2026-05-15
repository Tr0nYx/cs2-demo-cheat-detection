<?php

declare(strict_types=1);

namespace App\Application\Demo;

use App\Domain\Analysis\AnalysisResult;
use App\Domain\Demo\Demo;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final readonly class DemoResponseFactory
{
    public function __construct(private UrlGeneratorInterface $router)
    {
    }

    /** @return array<string, mixed> */
    public function demo(Demo $demo): array
    {
        return [
            'demo_id' => $demo->getIdString(),
            'status' => $demo->getStatus()->value,
            'status_url' => $this->router->generate('api_demos_show', ['id' => $demo->getIdString()]),
            'metadata' => [
                'steam_match_id' => $demo->getSteamMatchId(),
                'original_filename' => $demo->getOriginalFilename(),
                'file_path' => $demo->getFilePath(),
                'storage_disk' => $demo->getStorageDisk(),
                'uploaded_at' => $demo->getUploadedAt()->format(\DateTimeInterface::ATOM),
                'processed_at' => $demo->getProcessedAt()?->format(\DateTimeInterface::ATOM),
                'error_message' => $demo->getErrorMessage(),
            ],
            'results' => array_map(
                fn (AnalysisResult $result): array => $this->result($result),
                $demo->getAnalysisResults()->toArray(),
            ),
        ];
    }

    /** @return array<string, mixed> */
    public function result(AnalysisResult $result): array
    {
        return [
            'result_id' => $result->getId()->toRfc4122(),
            'demo_id' => $result->getDemo()->getIdString(),
            'player' => [
                'steam_id' => $result->getPlayer()->getSteamId(),
                'display_name' => $result->getPlayer()->getDisplayName(),
            ],
            'round_count' => $result->getRoundCount(),
            'scores' => [
                'aimbot' => $result->getAimbotScore(),
                'wallhack' => $result->getWallhackScore(),
                'triggerbot' => $result->getTriggerbotScore(),
                'recoil' => $result->getRecoilScore(),
                'bhop' => $result->getBhopScore(),
                'session_consistency' => $result->getSessionConsistencyScore(),
                'overall' => $result->getOverallSuspicion(),
            ],
            'label' => $result->getSuspicionLabel()->value,
            'feature_data' => $result->getFeatureData(),
            'support_data' => $result->getSupportData(),
            'analyzed_at' => $result->getAnalyzedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
