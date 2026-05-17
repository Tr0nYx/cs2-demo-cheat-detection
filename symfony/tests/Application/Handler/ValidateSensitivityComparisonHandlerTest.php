<?php

declare(strict_types=1);

namespace App\Tests\Application\Handler;

use App\Application\Dto\SensitivityComparisonDto;
use App\Application\Handler\ValidateSensitivityComparisonHandler;
use App\Application\Query\ValidateSensitivityComparisonQuery;
use App\Application\Service\SensitivityComparisonService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class ValidateSensitivityComparisonHandlerTest extends TestCase
{
    public function testHandlerDispatchesQueryAndReturnsDto(): void
    {
        $dto = new SensitivityComparisonDto(0.5, 0.25, ['aimbot' => -0.25]);
        $service = $this->createMock(SensitivityComparisonService::class);
        $service
            ->expects(self::once())
            ->method('createComparison')
            ->willReturn($dto);

        $handler = new ValidateSensitivityComparisonHandler($service);
        $result = $handler(new ValidateSensitivityComparisonQuery(Uuid::v7()->toRfc4122(), 'player-a', ['aimbot' => 50]));

        self::assertSame($dto, $result);
    }

    public function testExceptionsPropagate(): void
    {
        $service = $this->createMock(SensitivityComparisonService::class);
        $service
            ->expects(self::once())
            ->method('createComparison')
            ->willThrowException(new \InvalidArgumentException('Invalid thresholds'));

        $handler = new ValidateSensitivityComparisonHandler($service);

        $this->expectException(\InvalidArgumentException::class);

        $handler(new ValidateSensitivityComparisonQuery(Uuid::v7()->toRfc4122(), 'player-a', ['aimbot' => 50]));
    }
}
