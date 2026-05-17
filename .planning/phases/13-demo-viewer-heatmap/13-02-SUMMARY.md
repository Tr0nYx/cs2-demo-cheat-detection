# Phase 13 Wave 2 Summary

## Completed

- Added compact Symfony viewer entities for rounds, grenades, suspicious kill review signals, and heatmap references.
- Added a Postgres-compatible migration for viewer event and heatmap metadata tables.
- Added `ViewerEventRepository` query methods:
  - `findRoundsForDemo`
  - `findKillsForDemo`
  - `findGrenadesForDemo`
  - `findDamageEventsForDemo`
  - `findHeatmapReference`
  - `upsertHeatmapReference`
- Added `DemoTickCacheRepository` with compressed JSON Redis payloads and 48-hour TTL.
- Added `GET /api/demos/{id}/rounds`.
- Added `GET /api/demos/{id}/events` with `type`, `round`, and `player` validation.
- Kept raw tick data out of PostgreSQL; persisted SQL data is compact summary metadata only.
- Framed kill signals as explainable `review_signal` data rather than proof or enforcement language.

## Files Changed

- `symfony/src/Domain/Viewer/DemoRound.php`
- `symfony/src/Domain/Viewer/DemoGrenade.php`
- `symfony/src/Domain/Viewer/DemoSuspiciousKill.php`
- `symfony/src/Domain/Viewer/DemoHeatmap.php`
- `symfony/src/Infrastructure/Persistence/ViewerEventRepository.php`
- `symfony/src/Infrastructure/Cache/DemoTickCacheRepository.php`
- `symfony/src/UI/Api/DemoViewerController.php`
- `symfony/migrations/Version20260517130000.php`
- `symfony/tests/Infrastructure/Cache/DemoTickCacheRepositoryTest.php`
- `symfony/tests/UI/Api/DemoViewerControllerTest.php`

## Verification

- `php -l` passed for new PHP source, tests, and migration.
- `php bin/console doctrine:schema:validate --skip-sync --env=test` passed mapping validation.
- `php bin/console lint:container --env=test` passed.
- `docker compose exec -T php php vendor/bin/phpunit tests/Infrastructure/Cache/DemoTickCacheRepositoryTest.php tests/UI/Api/DemoViewerControllerTest.php --testdox` passed: 5 tests, 18 assertions.

## Notes

- The local test DB had older schema drift from previous phases. To run the controller tests in the already-running container, the new Phase 13 migration was executed directly and the missing prior `demo.map` test column was added manually.
- Files are not committed yet because the workspace already contains unrelated dirty changes.
