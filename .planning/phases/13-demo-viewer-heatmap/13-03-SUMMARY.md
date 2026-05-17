# Phase 13 Wave 3 Summary

## Completed

- Added heatmap PNG cache lookup in Symfony with Redis and filesystem fallback.
- Added Redis viewer job publisher using `PYTHON_VIEWER_QUEUE`, defaulting to `cs2.viewer`.
- Added `GenerateHeatmapMessage` and `GenerateHeatmapHandler`.
- Added `GET /api/demos/{id}/heatmap`.
- Cache hits return `image/png` with `Cache-Control: public, max-age=604800`.
- Cache misses enqueue `generate_heatmap` jobs and return `202` with `Retry-After: 5`.
- Added Python viewer worker for `generate_heatmap` and `export_ticks` job types.
- Added Python heatmap job handler that renders PNG bytes, stores Redis cache entries, and writes files.
- Added Makefile helpers:
  - `make heatmaps demo=UUID`
  - `make viewer-worker`
  - `make export-ticks demo=UUID`

## Queue Contract

- Queue: `cs2.viewer` by default.
- Heatmap job payload:
  - `type: generate_heatmap`
  - `demo_id`
  - `heatmap_type`
  - `player_steam_id`
  - `round_from`
  - `round_to`

## Cache Contract

- Redis key: `heatmap:{demoId}:{playerOrAll}:{type}:{roundFilter}`.
- TTL: 604800 seconds.
- File path: `{HEATMAP_STORAGE_PATH}/{demoId}/{type}_{playerOrAll}_{roundFilter}.png`.

## Files Changed

- `symfony/config/services.yaml`
- `symfony/src/Application/Command/GenerateHeatmapMessage.php`
- `symfony/src/Application/Handler/GenerateHeatmapHandler.php`
- `symfony/src/Infrastructure/Cache/DemoHeatmapCacheRepository.php`
- `symfony/src/Infrastructure/Queue/RedisViewerJobPublisher.php`
- `symfony/src/UI/Api/DemoViewerController.php`
- `symfony/tests/UI/Api/DemoHeatmapControllerTest.php`
- `python/viewer/heatmap_job.py`
- `python/viewer/worker_viewer.py`
- `python/tests/test_viewer_worker_heatmap.py`
- `Makefile`

## Verification

- PHP syntax checks passed for new/changed Symfony files.
- Python compile check passed for new Python worker files.
- `php bin/console lint:container --env=test` passed with `DATABASE_URL` set.
- `python -m pytest tests/test_viewer_worker_heatmap.py -q` passed: 4 tests.
- `docker compose exec -T php php vendor/bin/phpunit tests/Infrastructure/Cache/DemoTickCacheRepositoryTest.php tests/UI/Api/DemoViewerControllerTest.php tests/UI/Api/DemoHeatmapControllerTest.php --testdox` passed: 9 tests, 41 assertions.

## Notes

- The endpoint uses `UI\Api\DemoViewerController` to match the existing API structure.
- Real rendering still depends on radar assets at `assets/maps/{map_name}_radar.png` or a configured `RADAR_ASSET_PATH`.
- Files are not committed yet because the workspace already contains unrelated dirty changes.
