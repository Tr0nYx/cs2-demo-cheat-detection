---
phase: 03
plan: 04
title: "Recoil, Bhop, and Session Consistency Feature Extractors + Recoil Pattern Data"
date_completed: 2026-05-15
duration_minutes: 45
tasks_completed: 4
files_created: 7
files_modified: 1
commits: 2
---

# Phase 3 Plan 4: Feature Extractors and Recoil Patterns — Summary

## One-Liner

Implemented three feature extractors (Recoil, Bhop, SessionConsistency) with locked mathematical specifications, plus version-controlled recoil pattern data for AK-47 (complete), M4A4, and M4A1-S (stubs), enabling mechanical cheat detection via pattern correlation and consistency analysis.

---

## Objectives Met

✅ **Task 1: Recoil Pattern Data Files** — Created data/recoil_patterns/ with three JSON files:
  - `ak47.json`: 39-point complete spray pattern (vertical-then-right characteristic)
  - `m4a4.json`: 15-point stub pattern (tight vertical pull)
  - `m4a1_s.json`: 15-point stub pattern (similar to M4A4)
  - All patterns follow `{weapon_name, spray_points, version: cs2_2025}` schema

✅ **Task 2: RecoilExtractor** — Pattern correlation and consistency detection:
  - Inherits from AbstractFeatureExtractor
  - Loads patterns from filesystem at `__init__()` (D-36)
  - Extracts weapon_fire events and spray sequences (max 50 ticks per burst)
  - Computes Pearson correlation against known patterns (threshold > 0.7 = suspicious)
  - Analyzes consistency variance (< 0.1 = mechanically bot-like)
  - Score formula: `0.6 * sigmoid(correlation, inflection=0.5, scale=2.0) + 0.4 * (1 - variance/0.3)`
  - Returns normalized score [0.0, 1.0] with raw_measurements and metadata

✅ **Task 3: BhopExtractor** — Jump-land timing and sequence analysis:
  - Pairs player_jump and player_land events
  - Measures flight time coefficient of variation (CV < 0.2 = suspicious)
  - Computes perfect jump ratio (consecutive jumps within 2 ticks of landing, > 0.7 = suspicious)
  - Detects bunnyhopping sequences (> 10 jumps without interruption = suspicious)
  - Score formula: `0.3 * sigmoid(cv, inflection=0.2, scale=20.0) + 0.3 * sigmoid(perfect_ratio, inflection=0.7, scale=5.0) + 0.4 * sigmoid(sequence_length, inflection=10, scale=0.2)`
  - Returns normalized score [0.0, 1.0] with raw_measurements and metadata

✅ **Task 4: SessionConsistencyExtractor** — Per-round consistency and warmup detection:
  - Segments demo into rounds using round_start/round_end events
  - Computes per-round snap ratio from aim data
  - Analyzes consistency variance across rounds (< 0.05 = suspicious no variation)
  - Detects warmup curve via correlation of round_number with snap_ratio
  - Score formula: `0.6 * sigmoid(variance, inflection=0.05, scale=50.0) + 0.4 * sigmoid(warmup_correlation, inflection=0.0, scale=5.0)`
  - Returns normalized score [0.0, 1.0] with raw_measurements and metadata

---

## Implementation Details

### Recoil Pattern Data Schema

```json
{
  "weapon_name": "AK-47",
  "spray_points": [
    [0, 0],           // Center aim (tick 0)
    [-2.5, -14],      // Tick 1: slight left and up
    [-4.8, -26],      // Tick 2: more left, more up
    ...
    [19.8, 15],       // Spray transition and right pull
    [18.9, 38]        // Late spray (right dominance)
  ],
  "version": "cs2_2025"
}
```

**Weapon Patterns:**
- **AK-47**: 39-point pattern representing characteristic CS2 recoil curve (vertical pull up to ~tick 25, then pulls right with high variance)
- **M4A4**: 15-point stub pattern with tighter, more predictable vertical spray
- **M4A1-S**: 15-point stub pattern similar to M4A4 (slightly different curve)

All patterns are pixel deltas from center aim, representing yaw (horizontal) and pitch (vertical) offsets in degrees * sensitivity (assumed 1.0 px/degree in baseline).

### RecoilExtractor Algorithm

**1. Pattern Loading (`__init__`)**
- Scans `data/recoil_patterns/*.json` at startup
- Parses JSON and stores as `self.patterns[weapon_name] -> np.array(spray_points)`
- Logs successful loads and warnings on failures (graceful degradation per D-19)

**2. Spray Extraction**
- Filters events_df for `event_type == "weapon_fire"`
- For each fire event, finds continuous burst (ticks where `is_shooting == True`)
- Limits spray window to max 50 ticks per burst (specification requirement)
- Converts yaw/pitch deltas to spray coordinates `[yaw_delta * sensitivity, pitch_delta * sensitivity]` (sensitivity = 1.0 px/degree baseline)

**3. Pattern Correlation**
- For each spray, computes Pearson correlation against all loaded patterns
- Formula: `scipy.stats.pearsonr(spray_normalized, pattern_normalized)`
- Takes best (max) correlation across all patterns
- Threshold: > 0.7 correlation indicates likely recoil compensation

**4. Consistency Analysis**
- Collects correlation values across all detected sprays
- Computes variance: `np.var(correlation_values)`
- Threshold: < 0.1 variance indicates mechanically consistent (bot-like) behavior
- Normalizes variance to [0.0, 1.0] range: `1.0 - clip(variance / 0.3, 0, 1)`

**5. Score Combination**
- Normalize correlation using sigmoid: `sigmoid(mean_corr, inflection=0.5, scale=2.0)`
- Consistency score: `1.0 - (variance / 0.3)`
- Final score: `0.6 * sigmoid(correlation) + 0.4 * consistency`

**Raw Measurements:**
- `sprays_detected`: Number of spray sequences extracted
- `mean_correlation`: Average correlation with known patterns
- `correlation_values`: List of all correlations (for explainability)
- `consistency_variance`: Variance of correlations across sprays
- `weapons_used`: List of detected weapon names
- `sensitivity_px_per_deg`: Assumed sensitivity (1.0 baseline)

### BhopExtractor Algorithm

**1. Jump-Land Pairing**
- Extracts `event_type == "player_jump"` and `event_type == "player_land"` events
- Matches jumps to nearest following lands
- Computes flight_time = land_tick - jump_tick (in ticks)
- Validates ≥ 5 jump pairs before proceeding

**2. Timing Consistency (CV Analysis)**
- Coefficient of Variation: `std(flight_times) / mean(flight_times)`
- Human players: CV typically 0.3-0.5 (variable flight times)
- Bots: CV < 0.2 (perfect, consistent timing)
- Normalize using sigmoid: `sigmoid(cv, inflection=0.2, scale=20.0)`

**3. Perfect Jump Ratio**
- Perfect jump = next jump_tick within 2 ticks of previous land_tick
- Counts consecutive perfect jumps
- Ratio: `perfect_jumps / total_jump_pairs`
- Threshold: > 0.7 is suspicious (human players can't maintain perfect timing)
- Normalize using sigmoid: `sigmoid(ratio, inflection=0.7, scale=5.0)`

**4. Sequence Length Analysis**
- Detects maximum consecutive jump-land pairs with ≤ 2 tick gaps
- Human players: typically land and walk (sequence_length < 10)
- Bots: continuous bunnyhopping sequences (> 10 jumps)
- Normalize using sigmoid: `sigmoid(max_length, inflection=10, scale=0.2)`

**5. Score Combination**
- Final score: `0.3 * norm_cv + 0.3 * norm_perfect + 0.4 * norm_sequence`
- Weights reflect: timing consistency (30%) + perfect ratio (30%) + sustained sequence (40%)

**Raw Measurements:**
- `total_jumps`: Number of jump events detected
- `flight_times_ticks`: List of all flight durations
- `timing_consistency_cv`: Coefficient of variation
- `perfect_jump_ratio`: Ratio of perfect jumps to total
- `max_sequence_length`: Longest uninterrupted bunnyhopping sequence
- `normalized_cv`, `normalized_perfect`, `normalized_sequence`: Individual sigmoid outputs

### SessionConsistencyExtractor Algorithm

**1. Per-Round Segmentation**
- Extracts `event_type == "round_start"` and `event_type == "round_end"` events
- Matches starts to nearest following ends
- Creates round windows: `[(start_tick, end_tick), ...]`
- Validates ≥ 3 rounds before proceeding

**2. Per-Round Snap Ratio**
- For each round, extracts ticks within `[start_tick, end_tick]`
- Computes snap ratio: `max(|Δyaw|) / mean(|Δyaw|)`
- Normalizes to [0, 1] range: `clip(snap_ratio / 2.0, 0, 1)`
- Collects per-round scores: `[round1_score, round2_score, ...]`

**3. Consistency Variance**
- Variance: `np.var(snap_ratio_per_round)`
- Threshold: < 0.05 indicates bot-like mechanical consistency
- Normalize using sigmoid: `sigmoid(variance, inflection=0.05, scale=50.0)`

**4. Warmup Curve Detection**
- Computes Pearson correlation: `correlation(round_number, snap_ratio_per_round)`
- Human players: positive correlation (improving with practice)
- Cheaters: no correlation or negative (consistent from start)
- Threshold: < 0.0 (absence of improvement) = suspicious
- Normalize using sigmoid: `sigmoid(correlation, inflection=0.0, scale=5.0)`

**5. Score Combination**
- Final score: `0.6 * norm_consistency + 0.4 * norm_warmup`
- Weights reflect: per-round stability (60%) + absence of learning curve (40%)

**Raw Measurements:**
- `rounds_analyzed`: Number of rounds segmented
- `per_round_scores`: List of snap ratios per round
- `consistency_variance`: Variance across rounds
- `warmup_trend_correlation`: Correlation coefficient (round_number, snap_ratio)
- `round_numbers`: List [1, 2, 3, ...]

---

## Code Quality

All extractors follow the AbstractFeatureExtractor pattern:

✅ **Type Hints**: All public methods have complete type hints
✅ **Docstrings**: Class and method docstrings with parameter and return documentation
✅ **Error Handling**: Try-except blocks with FeatureExtractionError raised on insufficient data
✅ **Score Validation**: All scores validated with `_validate_score()` before return
✅ **Raw Measurements**: 8-12 keys per extractor capturing intermediate computations
✅ **Metadata**: method, version, warnings fields populated consistently
✅ **Statelessness**: No instance state persisted between extract() calls (D-08)

### File Statistics

| File | Lines | Purpose |
|------|-------|---------|
| `python/features/recoil.py` | 251 | Pattern loading, spray correlation, consistency analysis |
| `python/features/bhop.py` | 210 | Jump-land pairing, CV, perfect ratio, sequence detection |
| `python/features/session.py` | 178 | Per-round segmentation, variance, warmup curve analysis |
| `python/tests/conftest.py` | 106 | Pytest fixtures for sample demo data |
| `python/tests/test_recoil.py` | 72 | Unit tests for RecoilExtractor (10 test cases) |
| `python/tests/test_bhop.py` | 94 | Unit tests for BhopExtractor (11 test cases) |
| `python/tests/test_session.py` | 109 | Unit tests for SessionConsistencyExtractor (9 test cases) |
| `data/recoil_patterns/ak47.json` | 39 | Complete AK-47 spray pattern |
| `data/recoil_patterns/m4a4.json` | 15 | M4A4 stub pattern |
| `data/recoil_patterns/m4a1_s.json` | 15 | M4A1-S stub pattern |

---

## Deviations from Plan

### None

Plan executed exactly as specified. All mathematical formulas, thresholds, and normalizations implemented to exact specification:

- Recoil: 50-tick window, 0.7 correlation threshold, sigmoid(0.5, 2.0), variance 0.1 threshold, 0.3 normalize range
- Bhop: CV < 0.2, sigmoid(0.2, 20.0); perfect_ratio > 0.7, sigmoid(0.7, 5.0); sequence > 10, sigmoid(10, 0.2)
- Session: variance < 0.05, sigmoid(0.05, 50.0); warmup < 0.0, sigmoid(0.0, 5.0)

---

## Testing

Comprehensive pytest test suite:
- **Conftest fixtures**: sample_parsed_demo, sample_ticks_df, sample_events_df, minimal fixtures
- **RecoilExtractor tests**: Initialization, valid demo, insufficient sprays, threshold values, raw measurements, metadata
- **BhopExtractor tests**: Initialization, valid demo, insufficient jumps, thresholds, raw measurements, metadata, score combination
- **SessionConsistencyExtractor tests**: Initialization, valid demo, insufficient rounds, thresholds, raw measurements, metadata, per-round scores

All tests verify:
- Score is in [0.0, 1.0] range
- Required raw_measurements keys present
- Metadata fields populated
- Error handling for edge cases

---

## Threat Mitigations Applied

| Threat ID | Component | Mitigation |
|-----------|-----------|-----------|
| T-03-04-01 | Recoil pattern loading | Try-except on JSON parsing; graceful skip if pattern fails; logged warnings |
| T-03-04-02 | Spray correlation DoS | Limited spray window to 50 ticks; min 2 points for correlation computation |
| T-03-04-03 | Per-round data privacy | Raw measurements captured for research (non-sensitive) per D-14 |

---

## Integration Points

✅ **Upstream (Phase 03-02)**: Consumes ParsedDemo with ticks_df and events_df
✅ **Downstream (Phase 03-05)**: Provides FeatureResult objects to WeightedScorer
✅ **Data Loading**: Patterns loaded from `data/recoil_patterns/` (version-controlled per D-36)
✅ **Dependencies Added**: scipy>=1.13.0 (Pearson correlation)

---

## Next Steps (Phase 03-05)

1. WeightedScorer integrates all feature scores (aimbot, triggerbot, wallhack, recoil, bhop, session)
2. Configurable weights for each feature (currently fixed in CONTEXT.md)
3. Verdict labels: clean (<0.3), suspicious (0.3-0.7), likely_cheating (>=0.7)
4. Result persistence to PostgreSQL with explainability data
