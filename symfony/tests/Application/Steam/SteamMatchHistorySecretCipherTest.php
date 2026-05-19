<?php

declare(strict_types=1);

namespace App\Tests\Application\Steam;

use App\Application\Steam\SteamMatchHistorySecretCipher;
use PHPUnit\Framework\TestCase;

final class SteamMatchHistorySecretCipherTest extends TestCase
{
    public function testEncryptsAndDecryptsCredential(): void
    {
        $cipher = new SteamMatchHistorySecretCipher(base64_encode(random_bytes(32)));
        $plain = 'ABCD-EFGH-IJKL';

        $encrypted = $cipher->encrypt($plain);

        self::assertStringNotContainsString($plain, $encrypted);
        self::assertSame($plain, $cipher->decrypt($encrypted));
    }

    public function testFingerprintIsStableAndNonPlaintext(): void
    {
        $cipher = new SteamMatchHistorySecretCipher('test-secret-material');

        self::assertSame($cipher->fingerprint('secret-code'), $cipher->fingerprint('secret-code'));
        self::assertStringNotContainsString('secret-code', $cipher->fingerprint('secret-code'));
    }

    public function testMissingKeyFailsClearly(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('STEAM_MATCH_HISTORY_ENCRYPTION_KEY');

        (new SteamMatchHistorySecretCipher(''))->encrypt('secret-code');
    }
}
