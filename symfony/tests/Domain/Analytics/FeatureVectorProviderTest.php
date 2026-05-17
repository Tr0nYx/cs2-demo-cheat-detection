<?php

declare(strict_types=1);

namespace App\Tests\Domain\Analytics;

use App\Domain\Analytics\FeatureVectorsDto;
use App\Domain\Analysis\AnalysisResult;
use App\Domain\Analysis\SuspicionLabel;
use App\Domain\Demo\Demo;
use App\Domain\Player\Player;
use PHPUnit\Framework\TestCase;

final class FeatureVectorProviderTest extends TestCase
{
    public function testFromAnalysisResultPopulatesAllSixScores(): void
    {
        $dto = FeatureVectorsDto::fromAnalysisResult($this->analysisResult());

        self::assertSame(0.1, $dto->aimbotScore);
        self::assertSame(0.2, $dto->wallhackScore);
        self::assertSame(0.3, $dto->triggerbotScore);
        self::assertSame(0.4, $dto->recoilScore);
        self::assertSame(0.5, $dto->bhopScore);
        self::assertSame(0.6, $dto->sessionScore);
    }

    public function testValidationRejectsOutOfRangeScores(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        new FeatureVectorsDto(1.2, 0.2, 0.3, 0.4, 0.5, 0.6);
    }

    public function testSerializationProducesValidJson(): void
    {
        $json = json_encode(FeatureVectorsDto::fromAnalysisResult($this->analysisResult())->toArray(), JSON_THROW_ON_ERROR);

        self::assertJson($json);
        self::assertStringContainsString('aimbotScore', $json);
        self::assertStringContainsString('sessionScore', $json);
    }

    private function analysisResult(): AnalysisResult
    {
        return new AnalysisResult(
            new Demo('/storage/demos/test.dem'),
            new Player('76561198000000001'),
            24,
            0.1,
            0.2,
            0.3,
            0.4,
            0.5,
            0.6,
            0.51,
            SuspicionLabel::Suspicious,
        );
    }
}
