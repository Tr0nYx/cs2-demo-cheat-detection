---
phase: 17
status: human_needed
verified_at: 2026-05-18
---

# Phase 17 Verification

## Automated Checks

- PASS: `docker exec cs2-php php bin/console lint:container`.
- PASS: `docker exec cs2-php php bin/console doctrine:schema:validate --skip-sync`.
- PASS: fresh test DB rebuild via full migration chain: `doctrine:database:drop --env=test`, `doctrine:database:create --env=test`, `doctrine:migrations:migrate --env=test --no-interaction`.
- PASS: `docker exec cs2-php php bin/console doctrine:schema:validate --env=test` after the full migration chain.
- PASS: `cd symfony; php -l` for the new/modified Phase 17 PHP files.
- PASS: `cd frontend; npm test -- PlayerSteamProfileBadge`.
- PASS: `docker exec cs2-php php bin/phpunit --filter PlayerControllerTest` after rebuilding `cs2_detection_test`.
- PASS: `docker exec cs2-php php bin/console app:steam:refresh-profiles --env=test --dry-run --limit=10`.
- PASS: host Symfony command with `DATABASE_URL=postgresql://cs2_app:***@127.0.0.1:5432/cs2_detection`: `php bin/console app:steam:signal-research-report --env=test`.

## Known Verification Limits

- `GetPlayerComparisonHandlerTest` is blocked by an existing test-container issue where `PercentileCalculator` is inlined/private. The application container itself lints successfully.

## Verification Result

The Phase 17 implementation is present, uses the correct `cs2-postgres` database through the Symfony container, and passes full fresh migration, schema validation, container, player-history API, frontend badge, refresh dry-run, and research-report checks. Remaining gap is an older test-harness issue outside the new Phase 17 code path.

## Human Verification Items

1. Decide whether to expose or instantiate inlined application services differently in older handler tests.
2. Review the generated `17-STEAM-SIGNAL-RESEARCH.md` coverage counts after real Steam snapshots exist.
