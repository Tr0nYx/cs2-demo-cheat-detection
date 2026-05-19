<?php

declare(strict_types=1);

namespace App\Application\Steam;

final readonly class SteamMatchHistorySecretCipher
{
    public function __construct(private string $encryptionKey)
    {
    }

    public function encrypt(string $plainText): string
    {
        $key = $this->key();
        $iv = random_bytes(12);
        $tag = '';
        $cipherText = openssl_encrypt($plainText, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipherText === false) {
            throw new \RuntimeException('Unable to encrypt Steam match-history credential.');
        }

        return implode(':', ['v1', base64_encode($iv), base64_encode($tag), base64_encode($cipherText)]);
    }

    public function decrypt(string $cipherText): string
    {
        $parts = explode(':', $cipherText);
        if (count($parts) !== 4 || $parts[0] !== 'v1') {
            throw new \RuntimeException('Unsupported Steam match-history credential format.');
        }

        [, $ivEncoded, $tagEncoded, $valueEncoded] = $parts;
        $iv = base64_decode($ivEncoded, true);
        $tag = base64_decode($tagEncoded, true);
        $value = base64_decode($valueEncoded, true);
        if ($iv === false || $tag === false || $value === false) {
            throw new \RuntimeException('Invalid Steam match-history credential encoding.');
        }

        $plainText = openssl_decrypt($value, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($plainText === false) {
            throw new \RuntimeException('Unable to decrypt Steam match-history credential.');
        }

        return $plainText;
    }

    public function fingerprint(string $plainText): string
    {
        return hash_hmac('sha256', $plainText, $this->key());
    }

    private function key(): string
    {
        $configured = trim($this->encryptionKey);
        if ($configured === '') {
            throw new \RuntimeException('STEAM_MATCH_HISTORY_ENCRYPTION_KEY is not configured.');
        }

        $decoded = base64_decode($configured, true);
        if ($decoded !== false && strlen($decoded) >= 32) {
            return substr($decoded, 0, 32);
        }

        return hash('sha256', $configured, true);
    }
}
