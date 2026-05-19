<?php

declare(strict_types=1);

namespace App\Tests\Infrastructure\Steam;

use App\Infrastructure\Steam\SteamMatchHistoryClient;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class SteamMatchHistoryClientTest extends TestCase
{
    public function testMapsNextCodeResponse(): void
    {
        $client = new SteamMatchHistoryClient(new MockHttpClient([
            new MockResponse(json_encode(['result' => ['nextcode' => 'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE']], JSON_THROW_ON_ERROR), ['http_code' => 200]),
        ]), 'mock-key');

        $result = $client->getNextCode('76561198000000000', 'secret', 'CSGO-11111-22222-33333-44444-55555');

        self::assertSame('next_code', $result->status);
        self::assertSame('CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE', $result->nextCode);
    }

    public function testMapsCaughtUpResponse(): void
    {
        $client = new SteamMatchHistoryClient(new MockHttpClient([
            new MockResponse(json_encode(['result' => ['nextcode' => 'n/a']], JSON_THROW_ON_ERROR), ['http_code' => 202]),
        ]), 'mock-key');

        self::assertSame('caught_up', $client->getNextCode('steam', 'secret', 'known')->status);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('statusProvider')]
    public function testMapsDocumentedHttpStatuses(int $httpStatus, string $expectedStatus): void
    {
        $client = new SteamMatchHistoryClient(new MockHttpClient([
            new MockResponse('{}', ['http_code' => $httpStatus]),
        ]), 'mock-key');

        self::assertSame($expectedStatus, $client->getNextCode('steam', 'secret', 'known')->status);
    }

    public function testParsesRetryAfterHeaderForRateLimitedResponses(): void
    {
        $client = new SteamMatchHistoryClient(new MockHttpClient([
            new MockResponse('{}', [
                'http_code' => 429,
                'response_headers' => ['retry-after' => '120'],
            ]),
        ]), 'mock-key');

        $result = $client->getNextCode('steam', 'secret', 'known');

        self::assertSame('rate_limited', $result->status);
        self::assertSame(120, $result->retryAfterSeconds);
    }

    /** @return iterable<array{int, string}> */
    public static function statusProvider(): iterable
    {
        yield [403, 'auth_failed'];
        yield [412, 'invalid_seed'];
        yield [429, 'rate_limited'];
        yield [503, 'steam_unavailable'];
    }

    public function testMalformedPayloadIsTyped(): void
    {
        $client = new SteamMatchHistoryClient(new MockHttpClient([
            new MockResponse('{}', ['http_code' => 200]),
        ]), 'mock-key');

        self::assertSame('malformed_response', $client->getNextCode('steam', 'secret', 'known')->status);
    }
}
