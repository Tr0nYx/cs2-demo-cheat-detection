---
phase: 13-demo-viewer-heatmap
plan: 01
subsystem: python-viewer
tags: [python, heatmap, redis, demo-parser, cs2-radar]
requires:
  - phase: 03-python-analysis-pipeline
    provides: DemoParserAdapter and parsed tick/event dataframes
provides:
  - Python viewer package with map coordinate transforms
  - Server-side PNG heatmap renderer
  - Redis tick chunk exporter
  - Grenade similar-throw helper
affects: [phase-13-demo-viewer-heatmap, symfony-viewer-api, frontend-demo-viewer]
tech-stack:
  added: [pillow, matplotlib]
  patterns: [typed-python-viewer-helpers, compressed-redis-tick-chunks, server-side-png-rendering]
key-files:
  created:
    - python/viewer/__init__.py
    - python/viewer/map_config.py
    - python/viewer/heatmap.py
    - python/viewer/tick_exporter.py
    - python/viewer/grenade_analyzer.py
    - python/tests/test_viewer_map_config.py
    - python/tests/test_viewer_heatmap.py
    - python/tests/test_viewer_tick_exporter.py
    - python/tests/test_viewer_grenade_analyzer.py
  modified:
    - python/requirements.txt
key-decisions:
  - "Use python/viewer/map_config.py as the canonical server-side radar transform source."
  - "Keep raw tick rows out of PostgreSQL by exporting sampled, compressed Redis chunks."
  - "Return radar-only PNG bytes for empty heatmap event sets."
patterns-established:
  - "Viewer Python modules use typed pure helpers plus pytest coverage."
  - "Tick cache payloads are JSON -> zlib -> base64 with 48-hour TTL."
requirements-completed: [VIEWER-PYTHON-FOUNDATION]
duration: 18 min
completed: 2026-05-17
---

# Phase 13 Plan 01: Python Viewer Foundation Summary

**Radar transforms, server-rendered heatmap PNGs, compressed tick chunks, and grenade similarity helpers for the 2D demo viewer**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-17T00:00:00Z
- **Completed:** 2026-05-17T00:18:00Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Created `python/viewer/map_config.py` with Valve overview-based transforms for seven active CS2 maps.
- Implemented `python/viewer/heatmap.py` with Pillow/matplotlib/scipy rendering to valid PNG bytes.
- Implemented `python/viewer/tick_exporter.py` for sampled, compressed Redis tick chunks.
- Implemented `python/viewer/grenade_analyzer.py` for map-pixel similar throw matching and trajectory downsampling.
- Added focused pytest coverage for all Wave 1 modules.

## Task Commits

Not committed yet. The workspace already contained unrelated dirty changes, so this execution kept changes scoped in the working tree rather than staging unrelated files.

## Files Created/Modified

- `python/viewer/__init__.py` - Viewer utility package marker.
- `python/viewer/map_config.py` - MapConfig dataclass and world/map transform helpers.
- `python/viewer/heatmap.py` - Server-side radar heatmap PNG renderer.
- `python/viewer/tick_exporter.py` - Demo tick exporter for Redis chunks.
- `python/viewer/grenade_analyzer.py` - Similar grenade throw and trajectory helpers.
- `python/tests/test_viewer_map_config.py` - Transform tests.
- `python/tests/test_viewer_heatmap.py` - PNG renderer tests.
- `python/tests/test_viewer_tick_exporter.py` - Redis chunk export tests.
- `python/tests/test_viewer_grenade_analyzer.py` - Grenade helper tests.
- `python/requirements.txt` - Added `pillow` and `matplotlib`.

## Decisions Made

- `world_to_map` raises `ValueError` for unsupported maps so Symfony/Python callers can return explicit user-facing errors.
- Empty heatmaps return the radar image as PNG instead of failing or fabricating intensity.
- Tick chunks include `step` in the Redis key to avoid mixing different sampling rates.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The bare `pytest` command did not use the same import path as `python -m pytest` in this Windows environment. Verification uses `python -m pytest`.
- `matplotlib` was not installed locally; installed it with pip after adding it to `python/requirements.txt`.

## Verification

```bash
cd python && python -m pytest tests/test_viewer_map_config.py tests/test_viewer_heatmap.py tests/test_viewer_tick_exporter.py tests/test_viewer_grenade_analyzer.py -q
```

Result: `19 passed in 2.79s`.

## User Setup Required

None for Wave 1. Real heatmap rendering in later waves still needs radar PNG assets at the configured map asset path.

## Next Phase Readiness

Wave 2 can build Symfony cache/API contracts against the Redis tick key format and viewer event assumptions from this wave.

---
*Phase: 13-demo-viewer-heatmap*
*Completed: 2026-05-17*
