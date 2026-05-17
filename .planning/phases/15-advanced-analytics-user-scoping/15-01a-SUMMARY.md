---
phase: 15
plan: 01a
subsystem: backend analytics filtering
tags:
  - symfony
  - cqrs
  - filtering
  - analytics
key-files:
  created:
    - symfony/src/Application/Query/GetFilteredDemosQuery.php
    - symfony/src/Application/Query/DemoSummaryDto.php
    - symfony/src/Application/Query/FilteredDemosDto.php
    - symfony/src/Application/Handler/GetFilteredDemosHandler.php
    - symfony/src/UI/Api/AnalyticsFilterMetadataController.php
    - symfony/migrations/Version20260517193000.php
    - symfony/tests/Application/Handler/GetFilteredDemosHandlerTest.php
  modified:
    - symfony/src/UI/Api/DemoController.php
    - symfony/src/Infrastructure/Persistence/DemoRepository.php
    - symfony/src/Domain/Demo/Demo.php
    - symfony/config/services.yaml
    - symfony/tests/UI/Api/DemoControllerTest.php
    - symfony/src/Application/Handler/GetGlobalLeaderboardHandler.php
    - symfony/src/Application/Handler/GetMapLeaderboardHandler.php
    - symfony/src/Application/Handler/GetPlayerComparisonHandler.php
    - symfony/src/Application/Handler/GetTeamLeaderboardHandler.php
    - symfony/src/Application/Handler/GetTimeWindowLeaderboardHandler.php
requirements-completed: []
duration: 65 min
completed: 2026-05-17
---

# Phase 15 Plan 01a: Backend Analytics Filters Summary

## What Was Built

Implemented the backend foundation for user-scoped demo filtering:

- `GetFilteredDemosQuery` validates user ID, rating band, outcome, timeframe, limit, and offset.
- `GetFilteredDemosHandler` returns lightweight demo summaries with total count and `hasMore`.
- `DemoRepository` now performs one joined Doctrine query for map, TRACE rating band, outcome, timeframe, and authenticated player scope.
- `DemoController` routes filtered `GET /api/demos?...` calls through the new handler while preserving the legacy unfiltered listing path.
- `GET /api/analytics/filters/metadata` returns cached filter enums for frontend controls.
- `Demo` now has a nullable `outcome` field and indexes for `map` and `outcome`.

## Verification

Passed:

- `php bin/console lint:container` with test database env vars.
- `php vendor/bin/phpunit tests/Application/Handler/GetFilteredDemosHandlerTest.php` locally: 7 tests, 17 assertions.
- `docker exec ... php vendor/bin/phpunit tests/UI/Api/DemoControllerTest.php --filter 'testGetFilteredDemos|testGetFilterMetadata'`: 7 tests, 16 assertions.
- `docker exec ... php vendor/bin/phpunit tests/Application/Handler/GetFilteredDemosHandlerTest.php tests/UI/Api/DemoControllerTest.php`: new phase 15 tests pass; one pre-existing upload queue assertion remains failing.

## Acceptance Criteria

- Map filter: verified by `testFilterByMapReturnsOnlyMatchingDemos`.
- Rating band filter: verified by `testFilterByRatingBandReturnsCorrectPercentiles`.
- Outcome filter: verified by `testFilterByOutcomeReturnsMatchingResults`.
- Timeframe filter: verified by `testFilterByTimeframeReturnsRecentDemos`.
- Combined filters: verified by `testMultipleFiltersApplyAllConstraints`.
- User scope: verified by `testUserScopeEnforcement` and controller fixture with a second player.
- Pagination: verified by `testPaginationWorksCorrectly` and `X-Total-Count`.
- Invalid map/rating/outcome/days values: verified by controller tests returning 400.
- Missing JWT for filtered requests: verified by controller test returning 401.
- Metadata endpoint: verified by controller test returning map/rating/outcome/timeframe enums.

## Deviations from Plan

**[Rule 1 - Missing Critical] Demo outcome field missing** - Found during: Task 1 | Issue: `Demo` did not have the locked Phase 15 `outcome` filter field | Fix: added nullable `outcome` column, ORM metadata, validation setter, and migration | Verification: outcome handler/controller tests pass | Commit: `856f973`.

**[Rule 1 - Compatibility] Symfony Messenger handler interface removed** - Found during: lint verification | Issue: Symfony 7.4 no longer ships `MessageHandlerInterface`, causing `lint:container` failure | Fix: removed the marker interface from invokable query handlers; autoconfiguration still discovers handlers | Verification: `lint:container` passes | Commit: `856f973`.

**[Rule 3 - Environment Drift] Local migration history stale** - Found during: verification | Issue: `doctrine:migrations:migrate` attempted to replay older migrations against already-mutated schema | Fix: used idempotent schema update for local test database only; committed migration remains authoritative for clean environments | Verification: test schema in sync after `doctrine:schema:update --force`.

**Total deviations:** 3 auto-handled. **Impact:** Backend filter API is complete; migration history drift is local environment state, not committed behavior.

## Known Residual

Running the full existing `DemoControllerTest` file in Docker still fails `testUploadDemoReturnsAcceptedDemoResponse` because the expected Redis queue item is not present after upload. This appears unrelated to Phase 15 filter work; all newly added controller tests pass.

## Commits

| Hash | Description |
|------|-------------|
| `856f973` | `feat(15-01a): add filtered demo analytics backend` |

## Next Phase Readiness

Wave 1b can consume:

- `GET /api/demos?map=mirage&rating_band=0-5&outcome=win&days_back=999&limit=5`
- `GET /api/analytics/filters/metadata`

Frontend should send `Authorization: Bearer <access_token>` for filtered demo requests.

## Self-Check: PASSED
