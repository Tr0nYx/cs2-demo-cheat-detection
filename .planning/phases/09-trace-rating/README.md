# Phase 9: TRACE Rating System

Implement the TRACE (Tactical Round Action & Contribution Evaluation) player impact rating system for CS2 demo analysis.

## Overview

TRACE provides a transparent player impact rating that complements the existing cheat-suspicion pipeline:
- **Suspicion score**: answers "how unusual or potentially automated was this behavior?"
- **TRACE score**: answers "how much useful round impact did this player produce?"

Both signals must remain visible and separate.

## Scope

This phase implements the MVP TRACE scoring system based on [.planning/TRACE.md](./../../../TRACE.md):

### Core Components
- **eKILL**: Economy-adjusted kill value (weapon equity factor)
- **AIM**: Mechanical skill score (reused feature outputs)
- **KAST**: Round participation percentage
- **UTIL**: Team utility impact (flashes, grenades, damage)
- **CLUTCH**: High-value round win scenarios

### Implementation
- [ ] Python TRACE calculator module (`python/scoring/trace_rating.py`)
- [ ] Component extraction helpers (`python/scoring/trace_components.py`)
- [ ] Unit tests for formulas and edge cases
- [ ] MVP persistence in `support_data.trace` (JSON in existing `AnalysisResult`)
- [ ] Symfony API exposure via response factories
- [ ] Frontend types and UI integration
- [ ] Calibration storage (version tracking, global averages)

### Out of Scope (Phase 2 feature)
- SWING component (win-probability model)
- Relational TRACE tables (use after MVP validation)
- Advanced analytics and leaderboards

## Key Formulas

```
trace_base = eKILL*0.30 + AIM*0.25 + KAST*0.20 + UTIL*0.15 + CLUTCH*0.10
trust_multiplier = clamp(1.0 - (suspicion_score * 0.30), 0.73, 1.00)
trace_adjusted = trace_base * trust_multiplier
trace_normalized = trace_adjusted / calibration.global_average
```

## Success Criteria
- MVP TRACE calculation works end-to-end (Python → Symfony → React)
- All unit tests pass (formula edges, trust behavior, zero-kill handling)
- Frontend displays TRACE separately from suspicion verdicts
- Trust multiplier labeled as "suspicion adjustment" (not proof of cheating)
- Calibration fallback works with < 100 samples

## References
- [TRACE.md](./../../../TRACE.md) — Full specification and implementation order
- Existing extractors: `python/analysis/extractors/`
- Current scoring: `python/scoring/weighted_scorer.py`
