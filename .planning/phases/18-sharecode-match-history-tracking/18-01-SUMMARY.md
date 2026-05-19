---
phase: 18
plan: 01
subsystem: symfony-steam-match-history
tags: [steam, sharecode, secrets, valve-client]
requirements-completed: []
completed: 2026-05-18
---

# Phase 18 Plan 01: Tracking Foundation, Secret Storage, and Valve Client Summary

Implemented the match-history tracking foundation: a Doctrine connection entity/table, strict seed parser for plain sharecodes and supported Steam launcher links, env-backed encrypted `steamidkey` storage, and a typed Valve next-code client.

## Key Files

- `symfony/migrations/Version20260518MatchHistoryTracking.php`
- `symfony/src/Domain/Steam/SteamMatchHistoryConnection.php`
- `symfony/src/Infrastructure/Persistence/SteamMatchHistoryConnectionRepository.php`
- `symfony/src/Application/Steam/SharecodeSeedParser.php`
- `symfony/src/Application/Steam/SteamMatchHistorySecretCipher.php`
- `symfony/src/Infrastructure/Steam/SteamMatchHistoryClient.php`
- `symfony/src/Infrastructure/Steam/SteamMatchHistoryResult.php`

## Verification

- `php bin/phpunit --filter SharecodeSeedParserTest|SteamMatchHistorySecretCipherTest|SteamMatchHistoryClientTest` passed.
- `php bin/console lint:container` passed with an explicit host `DATABASE_URL`.
- `php bin/console doctrine:schema:validate --skip-sync` passed mapping validation.

## Deviations from Plan

Fixed the existing sharecode validator length from 24 to 34 so valid `CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX` values pass.

## Self-Check: PASSED
