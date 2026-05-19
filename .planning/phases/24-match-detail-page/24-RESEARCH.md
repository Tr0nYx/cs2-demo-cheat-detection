# Phase 24: Match Detail Page - Research

**Date:** 2026-05-19
**Status:** Complete

## Research Question

What needs to be known to plan a comprehensive match detail page that feels like a post-game match report, reuses existing analysis/viewer/player-profile infrastructure, and preserves research-only framing?

## Findings

### Existing Data Contracts

- `symfony/src/UI/Api/DemoController.php` already exposes `GET /api/demos/{id}` and `GET /api/demos/{id}/detail`.
- `symfony/src/Application/Handler/GetDemoDetailHandler.php` adds map, outcome, feature vectors, and baseline suspicion to the detail payload.
- `symfony/src/Application/Demo/DemoResponseFactory.php` returns demo metadata, status, map, outcome, and analysis results with per-player scores.
- `symfony/src/UI/Api/DemoViewerController.php` already exposes:
  - `GET /api/demos/{id}/rounds`
  - `GET /api/demos/{id}/events`
  - `GET /api/demos/{id}/ticks`
  - `GET /api/demos/{id}/heatmap`
- Frontend hooks already exist for demo detail, rounds, events, ticks, and viewer rendering.

### Data Gaps

- The domain `Demo` entity has map, outcome, upload/process metadata, Steam match ID, HLTV URL, status, and results. It does not currently expose full team scores, team names, economy/buy data, or a canonical match score model.
- Analysis results provide player IDs, display names, per-feature scores, labels, model version, feature data, support data, and round count. They do not guarantee team affiliation.
- Viewer event endpoints can show rounds, kills, grenades, and damage, but not full csstats parity for weapons, duels, or economy.

### Planning Implication

Phase 24 should not start by adding a broad backend schema. It can deliver the core match detail experience by composing existing APIs into a frontend view model:

- Match summary: demo metadata, map, outcome, status, upload/process provenance.
- Participants: analysis result players grouped as "participants" when team is unavailable, linked to `/players/{steamId}` for real IDs.
- Rounds: existing round endpoint.
- Events: existing event endpoint with flagged kill review signals.
- Viewer/Heatmaps: existing `DemoViewer` module.

Where data is missing, the UI should render explicit graceful states such as "Score unavailable from current analysis payload" rather than blocking the page.

## Recommended Plan Shape

### Plan 01: Data Foundation

Create a frontend match detail view model and hook that composes existing demo/detail/round/event data and normalizes it for the page.

### Plan 02: Match Report Components

Create reusable header, metadata, participant table, tabs, and empty-state components with research-safe copy.

### Plan 03: Route Assembly and Viewer Integration

Create `/matches/{demoId}`, assemble the page, add rounds/events/viewer sections, and link from existing results/history surfaces.

### Plan 04: Tests and Verification

Add component/page tests, forbidden-language checks, type/build verification, and Playwright smoke coverage for desktop/mobile.

## Security and Safety Notes

- This phase is UI/API composition only. It must not alter scoring, detection thresholds, model labels, or evidence gates.
- The page must keep all detection-related values framed as research signals for post-game review, not proof.
- Viewer requests must continue to use existing bounded tick ranges and cache-backed heatmaps; no raw tick persistence in PostgreSQL.

## External Reference

- `https://csstats.gg/match/443694426` was used as a product reference for match report structure: header, score area, rosters, tabs, rounds, and heatmap access. It is inspiration only, not a source to copy.

## Research Complete

The phase is ready for planning with four executable plans.
