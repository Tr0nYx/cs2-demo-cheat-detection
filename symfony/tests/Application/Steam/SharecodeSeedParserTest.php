<?php

declare(strict_types=1);

namespace App\Tests\Application\Steam;

use App\Application\Steam\SharecodeSeedParser;
use App\UI\Api\ApiProblem;
use PHPUnit\Framework\TestCase;

final class SharecodeSeedParserTest extends TestCase
{
    private const SHARECODE = 'CSGO-EDFZN-X7W2U-CQBXT-B26NM-TSVEM';

    public function testParsesPlainSharecode(): void
    {
        self::assertSame(self::SHARECODE, (new SharecodeSeedParser())->parse(strtolower(self::SHARECODE)));
    }

    public function testParsesSteamLauncherLink(): void
    {
        $link = 'steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-EdFZn-X7w2U-CqbxT-B26nM-TSveM';

        self::assertSame(self::SHARECODE, (new SharecodeSeedParser())->parse($link));
    }

    public function testRejectsArbitraryTextBlob(): void
    {
        $this->expectException(ApiProblem::class);

        (new SharecodeSeedParser())->parse('please import '.self::SHARECODE);
    }

    public function testRejectsMalformedLauncherLink(): void
    {
        $this->expectException(ApiProblem::class);

        (new SharecodeSeedParser())->parse('steam://rungame/730/76561202255233023/+other%20'.self::SHARECODE);
    }
}
