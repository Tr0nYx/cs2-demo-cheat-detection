---
phase: 23
plan: 23
subsystem: player-profile-detail
status: complete
completed: 2026-05-19
requirements-completed: []
key-files:
  created:
    - symfony/src/Application/Dto/PlayerStatsDTO.php
    - symfony/src/Application/Query/GetPlayerStatsQuery.php
    - symfony/src/Application/Handler/GetPlayerStatsHandler.php
    - symfony/src/Infrastructure/Persistence/PlayerStatsRepository.php
    - symfony/src/Presentation/Controller/PlayerStatsController.php
    - frontend/app/players/[playerId]/page.tsx
    - frontend/app/players/[playerId]/demos/page.tsx
    - frontend/app/players/[playerId]/stats/page.tsx
    - frontend/components/PlayerProfile/ProfileNav.tsx
    - frontend/components/PlayerProfile/TraceSection.tsx
    - frontend/components/PlayerProfile/DemoHistorySection.tsx
    - frontend/components/PlayerProfile/StatsSection.tsx
    - frontend/components/PlayerProfile/SteamProfileSection.tsx
    - frontend/components/ResearchDisclaimerBanner.tsx
    - frontend/lib/hooks/usePlayerProfile.ts
    - frontend/lib/research-context.ts
    - frontend/__tests__/components/PlayerProfile/PlayerProfileSections.test.tsx
  modified:
    - symfony/src/Application/Demo/DemoResponseFactory.php
    - frontend/app/leaderboards/page.tsx
    - frontend/app/players/[playerId]/compare/page.tsx
---

# Phase 23: Player Profile Detail Summary

Implemented comprehensive player profile detail surfaces with a Symfony stats endpoint, overview page, demo-history sub-route, stats sub-route, optional Steam enrichment, and research-signal framing.

## What Changed

- Added `GET /api/players/{steamId}/stats?window=30d` with map affinity, weapon activity, metadata, missing-data handling, and `Cache-Control: public, max-age=3600`.
- Added player profile pages at `/players/{playerId}`, `/players/{playerId}/demos`, and `/players/{playerId}/stats`.
- Added profile components for TRACE, demo history, recent stats, navigation, Steam profile reference, and the prominent research disclaimer banner.
- Updated leaderboard player links to target `/players/{playerId}` as the main profile entry point.
- Extended history result payloads with demo map/outcome/upload metadata so profile tables can render useful rows.
- Updated the existing compare route to use Next 16-safe dynamic params while keeping it available from profile navigation.

## Deviations from Plan

- No commits were created because `gsd-sdk` is not available on PATH and the worktree already contained unrelated planning changes. Changes are left staged-by-file for user review rather than mixing unrelated state into commits.
- Full Symfony database-backed PHPUnit could not run locally because `DATABASE_URL` is not configured in the test environment.
- `npx tsc --noEmit` reports pre-existing E2E typing errors in `e2e/steam-match-history.spec.ts` and `e2e/trace-visualizations.spec.ts`; `next build` completed successfully.

## Verification

- `php -l` passed for all new Symfony files.
- `php bin/console debug:router get_player_stats --env=test` passed.
- `php bin/console lint:container --env=test` passed.
- `npm run lint` passed for new profile pages, components, hook, utility, and tests.
- `npm test -- --runTestsByPath __tests__/components/PlayerProfile/PlayerProfileSections.test.tsx --watch=false` passed.
- `npm test -- --runTestsByPath __tests__/components/Comparison/PlayerComparisonCard.test.tsx --watch=false` passed.
- `npm run build` passed and listed the new dynamic player routes.
- Playwright smoke check loaded `/players/76561198000000001` on the dev server; the page rendered with partial/empty API sections because the backend API was not running for that Steam ID.

## Self-Check: PASSED

Phase 23's functional scope is implemented with research-safe copy, optional Steam display, on-demand stats, and profile navigation. Remaining risk is database-backed endpoint behavior in an environment with `DATABASE_URL` configured.
