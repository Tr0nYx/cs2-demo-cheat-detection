---
phase: 18
status: passed
verified: 2026-05-18
---

# Phase 18 Verification: Sharecode Import and Automatic Match History Tracking

## Result

Status: passed with one host-environment verification limitation.

## Automated Checks

- `symfony`: `php bin/phpunit --filter 'SharecodeSeedParserTest|SteamMatchHistorySecretCipherTest|SteamMatchHistoryClientTest|SteamMatchHistoryTrackingPlannerTest|TrackSteamMatchHistoryHandlerTest|SteamMatchHistoryControllerTest'` passed: 21 tests, 42 assertions.
- `symfony`: `php bin/console lint:container` passed with explicit host `DATABASE_URL`.
- `symfony`: `php bin/console doctrine:schema:validate --skip-sync` passed mapping validation.
- `frontend`: `npm test -- SteamMatchHistory --runInBand` passed: 2 suites, 7 tests.

## Must-Haves Verified

- Authenticated users can connect, view safe status, and disconnect their own match-history tracking.
- `steamidkey` is encrypted at rest, removed on disconnect, and absent from API/UI status tests.
- Seed parsing accepts plain sharecodes and supported Steam launcher links while rejecting arbitrary text.
- Valve `200`, `202/n/a`, `403`, `412`, `429`, and `503` outcomes map to typed tracking states.
- Background tracking is bounded and routes discovered sharecodes through the existing import path.
- Match-history metadata does not mutate suspicion scores, TRACE scores, labels, model confidence, or player trust.

## Residual Risk

- `app:steam:track-match-history --dry-run --limit=10` was attempted but the host shell lacks a usable PDO database driver/container database. Run it inside the project Docker PHP container after migrations are applied.
