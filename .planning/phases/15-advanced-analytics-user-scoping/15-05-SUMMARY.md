# 15-05 Summary: Filtered Leaderboards and Integration Coverage

## Completed

- Added `GET /api/leaderboards/filtered` with map, rating band, timeframe, limit, and offset filters.
- Implemented filtered ranking with PostgreSQL `PERCENTILE_CONT(0.95)`, a 5-demo qualification threshold, deterministic ranking, total count, and `X-Total-Count`.
- Added frontend leaderboard filtering via `useFilteredLeaderboard`, `LeaderboardFilters`, and `/leaderboards`.
- Added route-mocked Playwright integration coverage for the five phase workflows:
  - `testUserDemosAnalytics`
  - `testSensitivityComparison`
  - `testTrendMetrics`
  - `testFilteredLeaderboard`
  - `testCompleteFilterContract`

## Verification

- Passed: `docker exec ... php vendor/bin/phpunit tests/Application/Handler/GetFilteredLeaderboardHandlerTest.php tests/Presentation/Controller/FilteredLeaderboardControllerTest.php`
  - 8 tests, 25 assertions
- Passed: `php bin/console lint:container`
- Passed: `npm run test -- --runTestsByPath __tests__/lib/hooks/useFilteredLeaderboard.test.tsx __tests__/components/Leaderboard/LeaderboardFilters.test.tsx`
  - 7 tests
- Passed: `npm run build`
  - Existing Next.js middleware-to-proxy deprecation warning remains.
- Attempted: `npm run e2e -- analytics-integration.spec.ts`
  - Timed out after 4 minutes without Playwright test output. The route-mocked spec is committed for deterministic integration coverage, but the local command did not complete in this environment.

## Notes

- The filtered leaderboard route is injected directly with `GetFilteredLeaderboardHandler` because the existing `LeaderboardController`'s Messenger query pattern does not automatically register new query handlers.
- The response frames TRACE ranks as research signals. No live cheat, memory-reading, client-tampering, or ban automation behavior was introduced.
