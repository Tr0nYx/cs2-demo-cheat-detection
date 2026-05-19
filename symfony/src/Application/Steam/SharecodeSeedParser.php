<?php

declare(strict_types=1);

namespace App\Application\Steam;

use App\Application\Import\SharecodeValidator;
use App\UI\Api\ApiProblem;

final readonly class SharecodeSeedParser
{
    private const PLAIN_PATTERN = '/^CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i';
    private const LINK_PATTERN = '#^steam://rungame/730/[0-9]+/\+csgo_download_match(?:%20|\+)('
        . 'CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}'
        . ')$#i';

    public function parse(string $input): string
    {
        $input = trim($input);

        if (preg_match(self::PLAIN_PATTERN, $input) === 1) {
            return $this->normalizeAndValidate($input);
        }

        if (preg_match(self::LINK_PATTERN, $input, $matches) === 1) {
            return $this->normalizeAndValidate($matches[1]);
        }

        throw ApiProblem::badRequest(
            'invalid_seed_sharecode',
            'Provide a plain CS2 sharecode or a Steam match download launcher link.'
        );
    }

    private function normalizeAndValidate(string $sharecode): string
    {
        $normalized = SharecodeValidator::normalize($sharecode);
        if (!SharecodeValidator::validate($normalized)) {
            throw ApiProblem::badRequest('invalid_seed_sharecode', 'The seed sharecode is malformed.');
        }

        return $normalized;
    }
}
