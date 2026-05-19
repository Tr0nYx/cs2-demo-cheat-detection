---
phase: 18
plan: 03
subsystem: symfony-steam-match-history-tracking
tags: [messenger, scheduler, sharecode-import]
requirements-completed: []
completed: 2026-05-18
---

# Phase 18 Plan 03: Bounded Background Tracking and Import Dispatch Summary

Implemented queued background match-history tracking with a bounded per-run message, due-connection planner, CLI command, Valve cursor advancement, status/backoff handling, and dispatch of discovered sharecodes through the existing `ImportSharecodeService`.

## Key Files

- `symfony/src/Application/Steam/TrackSteamMatchHistoryMessage.php`
- `symfony/src/Application/Steam/SteamMatchHistoryTrackingPlanner.php`
- `symfony/src/Application/Steam/TrackSteamMatchHistoryHandler.php`
- `symfony/src/Command/TrackSteamMatchHistoryCommand.php`
- `symfony/src/Application/Import/ImportSharecodeService.php`
- `symfony/config/packages/messenger.yaml`

## Verification

- `php bin/phpunit --filter SteamMatchHistoryTrackingPlannerTest|TrackSteamMatchHistoryHandlerTest` passed.
- `php bin/console lint:container` passed with an explicit host `DATABASE_URL`.
- `php bin/console app:steam:track-match-history --dry-run --limit=10` could not run in the host shell because no usable PDO driver/container database was available.

## Deviations from Plan

When a run hits the per-user discovery limit before Valve reports caught-up, the connection stays `active` and schedules a near-term follow-up instead of incorrectly marking `caught_up`.

## Self-Check: PASSED
