---
phase: 20
plan: 02
type: wave
completed_date: 2026-05-19
duration_minutes: 60
tasks_completed: 5
---

# Phase 20 Wave 2: Feature Evidence Gates and Conservative Caps Summary

**Objective Achieved:** Applied conservative evidence gates across the six feature families so weak proxy and low-sample signals are capped and annotated rather than automatically creating high review scores.

## Execution Overview

Wave 2 completed the five planned extractor-level tasks. The focus was on making each feature family explainable and resistant to single-shot weak evidence.

### Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 20-02-01 | Gate aimbot scores by repeated suspicious kill-window evidence | ✅ | Added repeated-window and independent-signal requirements. |
| 20-02-02 | Cap proxy-only wallhack signals | ✅ | Capped yaw/sound proxy cases and preserved raw signal metadata. |
| 20-02-03 | Require repeated short reaction windows for triggerbot | ✅ | Added low-sample and repeated instant-window gating. |
| 20-02-04 | Require known weapon and real spray basis for recoil | ✅ | Capped unknown weapon / insufficient spray evidence. |
| 20-02-05 | Apply low-sample caps to bhop and session consistency | ✅ | Extended low-count caps and metadata for bhop/session. |

## Key Deliverables

- `python/features/aimbot.py`
  - High scores now require multiple suspicious kill windows and multiple independent aim signals.
  - Single extreme snap cases are capped and annotated.

- `python/features/wallhack.py`
  - Proxy-only evidence is treated conservatively.
  - Low peek counts and missing visual alignment produce caps and warnings.

- `python/features/triggerbot.py`
  - Low reaction sample counts no longer drive high scores.
  - Repeated instant-window evidence is required for stronger labels.

- `python/features/recoil.py`
  - Unknown weapons, missing patterns, and low spray counts yield conservative caps.
  - Known multi-spray evidence can still score strongly.

- `python/features/bhop.py` and `python/features/session.py`
  - Low jump counts and insufficient round measurements are capped.
  - Confidence/evidence metadata is emitted consistently.

- Feature tests updated to cover conservative cap reasons and metadata.

## Verification Results

- `cmd /c "cd /d i:\github\cs2-demo-cheat-detection && set PYTHONPATH=python&& python -m pytest tests/test_features_aimbot.py tests/test_features_wallhack.py tests/test_features_triggerbot.py tests/test_features_recoil.py tests/test_features_bhop.py tests/test_features_session.py -q"`
- `cmd /c "cd /d i:\github\cs2-demo-cheat-detection && set PYTHONPATH=python&& python -m py_compile python/features/aimbot.py python/features/wallhack.py python/features/triggerbot.py python/features/recoil.py python/features/bhop.py python/features/session.py"`

## Files Modified

- `python/features/aimbot.py`
- `python/features/wallhack.py`
- `python/features/triggerbot.py`
- `python/features/recoil.py`
- `python/features/bhop.py`
- `python/features/session.py`
- `tests/test_features_aimbot.py`
- `tests/test_features_wallhack.py`
- `tests/test_features_triggerbot.py`
- `tests/test_features_recoil.py`
- `tests/test_features_bhop.py`
- `tests/test_features_session.py`

## Notes

- This wave preserves strong evidence while reducing false positives from weak or single-signal feature outputs.
- The metadata contract from Wave 1 is used consistently across extractors.
