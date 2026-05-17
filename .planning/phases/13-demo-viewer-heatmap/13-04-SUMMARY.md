# Phase 13 Wave 4 Summary

## Completed

- Added `GET /api/demos/{id}/ticks`.
- Tick endpoint validates:
  - `from_tick`
  - `to_tick`
  - `round`
  - `players[]`
  - `step`
- Default viewer tick step is `4`.
- Tick range can be resolved from persisted round metadata.
- Tick cache hits read compressed Redis chunks through `DemoTickCacheRepository`.
- Tick cache misses enqueue an `export_ticks` job and return `202` with retry info.
- Added frontend viewer DTOs and API helpers:
  - `fetchDemoRounds`
  - `fetchDemoEvents`
  - `fetchDemoTicks`
  - `demoHeatmapUrl`
- Added React Query hooks:
  - `useDemoRounds`
  - `useDemoEvents`
  - `useTickData`
- `useTickData` chunks in 500-tick windows and prefetches the adjacent next chunk.
- Added `usePlayback` with play, pause, seek, speed, nextRound, and prevRound.
- Added `useMapTransform` with Python-parity map constants, round-trip transforms, zoom, and pan state.

## Files Changed

- `symfony/src/UI/Api/DemoViewerController.php`
- `symfony/tests/UI/Api/DemoViewerControllerTest.php`
- `frontend/lib/types.ts`
- `frontend/lib/api.ts`
- `frontend/lib/hooks/useDemoRounds.ts`
- `frontend/lib/hooks/useDemoEvents.ts`
- `frontend/lib/hooks/useTickData.ts`
- `frontend/lib/hooks/usePlayback.ts`
- `frontend/lib/hooks/useMapTransform.ts`
- `frontend/__tests__/lib/hooks/usePlayback.test.tsx`
- `frontend/__tests__/lib/hooks/useMapTransform.test.tsx`

## Verification

- PHP syntax checks passed for changed Symfony source and tests.
- `docker compose exec -T php php vendor/bin/phpunit tests/UI/Api/DemoViewerControllerTest.php --testdox` passed: 7 tests, 34 assertions.
- `npm test -- --runInBand __tests__/hooks/useTraceQuery.test.ts __tests__/lib/hooks/usePlayback.test.tsx __tests__/lib/hooks/useMapTransform.test.tsx` passed: 15 tests.
- `Select-String` confirmed `useTickData` uses React Query.
- `npx tsc --noEmit` still fails on pre-existing unrelated frontend errors in older tests/components/e2e files; no remaining matches from the new Wave 4 files after fixing `UseTickDataResult`.

## Notes

- Frontend work only added data/state hooks, not visible UI components.
- Tick cache miss behavior currently queues `export_ticks`; the Python implementation accepts that job type as a worker contract placeholder.
- Files are not committed yet because the workspace already contains unrelated dirty changes.
