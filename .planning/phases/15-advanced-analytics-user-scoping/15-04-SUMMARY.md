# Phase 15-04 Summary: Trend Metrics and Caching

## Status

Completed on 2026-05-17.

## What Was Built

- Added trend DTOs for consistency variance bands, improvement arc regression, outliers, and weapon strengths.
- Added `GetAnalyticsTrendQuery` and `GetAnalyticsTrendHandler` for consistency, arc, and weapons metrics.
- Added `AnalyticsCacheAdapter` with 1-hour TTL and per-user trend invalidation.
- Added `OnAnalysisResultCreated` listener to invalidate trend cache when new analysis arrives.
- Extended `AnalyticsController` with `GET /api/analytics/trends/{metric}`.
- Added `useAnalyticsTrends`, `useAllTrends`, `TrendChart`, and `/analytics/trends`.

## Verification

- `docker exec ... php vendor/bin/phpunit tests/Application/Handler/GetAnalyticsTrendHandlerTest.php tests/Infrastructure/Cache/AnalyticsCacheAdapterTest.php tests/UI/Api/AnalyticsControllerTest.php` passed: 17 tests, 40 assertions.
- `npm run test -- --runTestsByPath __tests__/components/Analytics/TrendChart.test.tsx` passed: 4 tests.
- `php bin/console lint:container` passed.
- `npm run build` passed.

## Sample Calculations

- Consistency groups TRACE ratings by day and returns mean plus lower/upper variance bands.
- Arc uses least-squares regression over chronological demos and returns slope, intercept, R2, and 2-sigma outliers.
- Weapons groups `feature_data.weapon_class` or normalized weapon names into Rifle, Pistol, Sniper, and SMG.

## Cache Notes

- Trend cache keys are namespaced per metric, hashed player ID, and window.
- TTL is 3600 seconds.
- Cache invalidation clears consistency, arc, and weapons keys for the affected player.
- Cache access is best-effort: cache errors fall back to fresh computation.

## Visualization Notes

- Consistency uses an SVG mean line with an upper/lower band and flagged-date markers.
- Arc shows slope interpretation, intercept, R2, and outlier count.
- Weapons uses color-coded horizontal bars.
- The `/analytics/trends` layout stacks on mobile and uses three columns on large screens.

## Known Notes

- Build still reports the existing Next.js `middleware` to `proxy` deprecation warning.
- The cache adapter uses Symfony's configured cache pool; the project cache config still defaults to filesystem unless Redis is configured for the app pool.
