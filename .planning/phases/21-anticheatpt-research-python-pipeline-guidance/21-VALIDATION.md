---
phase: 21
slug: anticheatpt-research-python-pipeline-guidance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for AntiCheatPT research guidance and Python pipeline alignment.

## Summary

- Phase 21 currently exists only as planning artifacts.
- `README.md` and `21-01-PLAN.md` are present.
- No implementation summary, code changes, or execution evidence is available yet.
- This document is therefore a phase audit and readiness guide, not a completed validation report.

## Status

- Execution status: research wave executed
- Validation status: pending implementation
- Notes: `21-01-SUMMARY.md` was created to capture research findings and next-step guidance.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Pytest |
| Config | `python/requirements.txt` + existing `tests/` harness |
| Quick command | `cmd /c "cd /d i:\github\cs2-demo-cheat-detection && set PYTHONPATH=python&& python -m pytest tests/test_phase21_anticheatpt_research.py -q"` |
| Full suite | existing Python backend test suite |
| Estimated runtime | ~5 seconds for phase doc checks |

## Sampling Rate

- After planning updates: run the new phase doc existence tests.
- After implementation changes: add targeted Python tests for worker/parser/scoring behavior derived from this phase.
- Before phase sign-off: run all Python backend tests plus any new phase-specific validation tests.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | PY-01, PY-02 | T-21-01 | External AntiCheatPT guidance is mapped without altering research-only suspicion semantics | doc | `pytest tests/test_phase21_anticheatpt_research.py` | yes | green |
| 21-01-02 | 01 | 1 | PY-01, PY-02 | T-21-01 | Research findings mapped to our worker/parser/scoring pipeline | doc | `pytest tests/test_phase21_anticheatpt_research.py` | yes | green |
| 21-01-03 | 01 | 1 | PY-01, PY-02 | T-21-01 | Research summary documented for follow-up implementation | doc | `pytest tests/test_phase21_anticheatpt_research.py` | yes | green |

## Wave 0 Requirements

- [ ] Create `21-01-SUMMARY.md` after the research is executed.
- [ ] Add targeted Python unit tests for `python/worker.py` and `python/scoring/weighted_scorer.py` once code changes are implemented.
- [ ] Enable `nyquist_compliant: true` only after verification coverage exists.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| External dataset alignment | PY-01, PY-02 | AntiCheatPT repository review is a research activity, not a deterministic code test | Manually inspect `DataExtraction/CSDemoConverter.py`, `DataConversionPipeline/pipeline.py`, and `context_window_helper.py`; document the mapping decisions in `21-01-SUMMARY.md`.

## Validation Sign-Off

- [ ] Phase planning artifacts exist.
- [ ] Phase remains in draft status until execution occurs.
- [ ] Future implementation will be covered by targeted Python tests.
- [ ] `nyquist_compliant: true` may be enabled after tests are added and pass.

**Approval:** pending
