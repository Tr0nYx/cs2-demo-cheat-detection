---
phase: 17
slug: steamprofile-usage
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-18
---

# Phase 17 - Validation Strategy

> Per-phase validation contract for Steam profile, inventory, and research-signal enrichment.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | PHPUnit, Jest |
| Config file | `symfony/phpunit.xml.dist`, `frontend/jest.config.js` |
| Quick run command | `cd symfony; php bin/phpunit --filter Steam` |
| Full suite command | `cd symfony; php bin/phpunit; cd ../frontend; npm test -- --runInBand` |
| Estimated runtime | ~120 seconds |

## Sampling Rate

- After every backend task commit: run the most targeted PHPUnit class for the changed service/entity/controller.
- After every frontend task commit: run the component or hook Jest test for the changed surface.
- After every wave: run `cd symfony; php bin/console doctrine:schema:validate --skip-sync` plus the wave test subset.
- Before verification: backend and frontend targeted suites must be green.
- Max feedback latency: 180 seconds for targeted checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | D-01..D-05,D-15,D-16 | T-17-01 | External metadata stored separately from demo features | unit/schema | `cd symfony; php bin/phpunit --filter SteamProfileSnapshot` | yes | pending |
| 17-02-01 | 02 | 1 | D-02,D-03,D-05 | T-17-02 | API failures become snapshot states with backoff | unit | `cd symfony; php bin/phpunit --filter SteamProfileRefresh` | yes | pending |
| 17-03-01 | 03 | 2 | D-02,D-05 | T-17-02 | Refresh queue respects tiers and rate limits | unit/command | `cd symfony; php bin/phpunit --filter SteamProfileRefreshCommand` | yes | pending |
| 17-04-01 | 04 | 3 | D-06..D-09 | T-17-03 | Player pages enrich identity without broad leakage | controller/frontend | `cd symfony; php bin/phpunit --filter PlayerController; cd ../frontend; npm test -- PlayerComparisonCard` | yes | pending |
| 17-05-01 | 05 | 4 | D-10..D-14 | T-17-04 | Shadow signals do not affect visible scoring | unit/static | `cd symfony; php bin/phpunit --filter SteamExternalSignalResearch` | yes | pending |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Steam API credentials and rate-limit behavior | D-02,D-05 | Requires live Steam API key and public/private sample accounts | Run refresh command against a small controlled Steam ID set and inspect snapshot states. |
| Market price volatility | D-05 | Depends on live market response availability | Verify cached price timestamps and unknown-price handling in logs. |

## Validation Sign-Off

- [x] All tasks have automated verify commands or manual-only rationale.
- [x] Sampling continuity has no 3 consecutive tasks without automated verification.
- [x] Wave 0 not required; existing PHPUnit/Jest infrastructure covers the phase.
- [x] No watch-mode flags.
- [x] Feedback latency target below 180s for targeted checks.

**Approval:** pending
