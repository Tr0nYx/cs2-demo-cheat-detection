# Phase 13: 2D Demo Viewer + Heatmap Module - Context

## Source Brief

Primary task brief: `tasks/analyse.md`

## Goal

Implement a 2D demo viewer and heatmap module for analyzed CS2 demos, inspired by post-game analysis tools while adding a project-specific cheat-suspicion review overlay.

The phase spans three layers:

- Python: map coordinate transforms, tick export, grenade analysis, and static server-side heatmap rendering
- Symfony: JSON/image endpoints for rounds, events, ticks, and heatmaps, plus cache/message infrastructure
- React: interactive Canvas radar viewer, playback timeline, heatmap viewer, suspicious kill review panel, and grenade inspector

## Must Preserve

- Post-game demo analysis only; no live cheat functionality, memory reading, client tampering, or ban automation.
- Suspicion indicators must remain explainable research signals, not proof of cheating.
- Symfony remains responsible for API boundaries, queue dispatch, persistence, and product behavior.
- Python remains responsible for parsing, feature extraction, coordinate transforms, rendering, and analysis-side cache population.
- Tick-level payloads should be cache-backed and sampled/chunked; do not persist raw tick volume in PostgreSQL.

## Required Outputs

- `python/viewer/map_config.py` with Valve overview-based coordinate transforms and tests.
- `python/viewer/heatmap.py` with PNG heatmap rendering over radar images.
- Tick, round, event, and heatmap APIs:
  - `GET /api/demos/{id}/ticks`
  - `GET /api/demos/{id}/rounds`
  - `GET /api/demos/{id}/events`
  - `GET /api/demos/{id}/heatmap`
- Redis-backed tick and heatmap caching.
- Heatmap and grenade/suspicious-kill persistence references where useful.
- React `DemoViewer` module with Canvas rendering, playback, timeline, player legend, heatmap viewer, suspicion panel, and grenade inspector.
- Makefile helpers for heatmaps, viewer worker, and tick export.

## Planning Notes

The task brief proposes a six-step implementation order:

1. Backend foundation: coordinate transforms, tick export, rounds endpoint, kill events endpoint.
2. Static heatmaps: renderer, radar assets, heatmap endpoint, PNG cache, frontend heatmap viewer.
3. Tick streaming API: chunked tick endpoint plus React data/playback hooks.
4. 2D viewer: Canvas map, timeline, round/player controls, main container.
5. Suspicion overlay: suspicious kill storage, Canvas overlay, suspicion panel, timeline event markers.
6. Grenade inspector: trajectory extraction, similar throw matching, grenade endpoint and UI.

`$gsd-plan-phase 13` should split this into executable plans that respect those dependencies.

## References

- `tasks/analyse.md`
- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- Existing Phase 11 and Phase 12 TRACE frontend/API patterns
