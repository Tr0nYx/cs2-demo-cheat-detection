---
phase: 20
plan: 03
type: wave
completed_date: 2026-05-19
duration_minutes: 45
tasks_completed: 3
---

# Phase 20 Wave 3: Regression Harness and Problem Demo Guardrails Summary

**Objective Achieved:** Added regression coverage and player-specific slicing guardrails to make sure conservative calibration remains stable and demo-wide aggregate signals are not reintroduced.

## Execution Overview

Wave 3 completed all three planned tasks, with emphasis on regression tests and worker attribution behavior.

### Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 20-03-01 | Add synthetic conservative regression fixtures | ✅ | Added deterministic Phase 20 regression coverage for weak evidence and strong family cases. |
| 20-03-02 | Preserve player-specific slicing and no demo-wide visible result | ✅ | Confirmed `steam_id = 0` is excluded from player IDs and context-only events remain non-attributed. |
| 20-03-03 | Document and optionally run local problem-demo replay check | ✅ | Added local verification guidance for the known problematic demo ID without committing binaries. |

## Key Deliverables

- `tests/test_phase20_conservative_regression.py`
  - Synthetic fixtures covering weak proxy, low-sample, missing feature, and multi-feature strong evidence scenarios.
  - Regression assertions aligned with Phase 20 conservative scoring expectations.

- `tests/test_worker_player_slicing.py`
  - Confirmed real SteamID attribution and exclusion of demo-wide `steam_id = 0` aggregation.
  - Verified opponent footstep/context events remain available but not owned by the target player.

- `python/worker.py`
  - Guarded player slicing and event filtering behavior around player-specific analysis.
  - Minor cleanup to ensure helper functions are consistent.

## Verification Results

- `cmd /c "cd /d i:\github\cs2-demo-cheat-detection && set PYTHONPATH=python&& python -m pytest tests/test_phase20_conservative_regression.py tests/test_worker_player_slicing.py tests/test_weighted_scorer.py -q"`

## Files Modified

- `python/worker.py`
- `python/persistence/result_writer.py`
- `tests/test_worker_player_slicing.py`
- `tests/test_weighted_scorer.py`
- `tests/test_phase20_conservative_regression.py`

## Notes

- The local problem-demo replay path is documented and left optional.
- No `.dem` binaries were added to the repo.
- Regression harness is designed to be CI-safe and deterministic.
