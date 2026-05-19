# Phase 20: Calibrate High Review Signals and Reduce False Positives in Player Analysis - Research

**Researched:** 2026-05-19
**Status:** Complete

## Summary

Phase 20 is a calibration and false-positive reduction phase. The current pipeline now writes player-specific results, but several extractors can still produce inflated feature scores from weak evidence:

- `AimbotExtractor` uses the maximum of normalized snap/angular sub-scores, so one over-sensitive sub-signal can dominate.
- `WallhackExtractor` still relies on broad yaw-before-footstep and crosshair delta proxies that are not strong enough for high review by themselves.
- `TriggerbotExtractor` can over-trust small reaction samples and bimodality on low counts.
- `RecoilExtractor` can score consistency even when weapon identity or pattern data is weak.
- `WeightedScorer` redistributes missing feature weights proportionally, which can amplify remaining over-sensitive features.

The planning target is not a new detection system. It is a conservative evidence-gated scoring contract: high feature and overall labels require enough player-local evidence, while uncertain or parser-limited data is capped and explained.

## Technical Direction

### Evidence and Confidence Metadata

Introduce a shared feature calibration metadata shape in `FeatureResult.metadata` and persisted `feature_data`:

- `confidence`: `low`, `medium`, `high`
- `evidence_strength`: `weak`, `moderate`, `strong`
- `score_cap_applied`: boolean
- `score_cap_reason`: optional string
- `independent_signals`: list of signal names that passed evidence gates
- `sample_count`: relevant count for the feature
- `warnings`: existing list, expanded with calibration warnings

This can be added without changing the database schema because `feature_data` already persists raw measurements and metadata as JSON.

### Score Caps

Apply score caps in extractors or a shared helper before `WeightedScorer` consumes feature scores. A practical first pass:

- Weak evidence or low samples: cap at `0.40`
- Moderate evidence: cap at `0.60`
- Strong evidence: no cap
- Missing parser context: cap at `0.40` or fail feature conservatively when the feature cannot be interpreted

The exact numbers remain implementation discretion, but tests should encode the behavior category rather than rely only on specific floating-point values.

### Extractor Priorities

- Aimbot: replace `max(subscores)` dominance with multiple suspicious kill windows and independent signal counting. High score should require repeated snap/jerk evidence.
- Wallhack: treat yaw-before-footstep as weak proxy unless paired with stronger player-local timing/context evidence. Cap proxy-only scores.
- Triggerbot: require repeated very short fire-to-kill windows and sufficient sample counts before high scoring.
- Recoil: require known weapon/pattern basis and multiple spray sequences before consistency can become strong evidence.
- Bhop/session: keep low sample count warnings, but ensure they cap high results and never inflate overall.

### Weighted Scorer Guardrails

The scorer should not redistribute missing or weak evidence in a way that inflates labels. It should:

- Prefer conservative missing-feature handling over proportional amplification.
- Respect feature confidence/evidence metadata when available.
- Require multiple strong feature families before `likely_cheating`/overall high review, except for explicitly exceptional high-confidence evidence.
- Expose enough summary metadata for tests and UI mapping.

### Regression Strategy

Tests should cover:

- Existing unit tests for each extractor continue to pass after updating expected metadata.
- Low sample/high raw proxy scenarios get capped.
- Missing feature results do not inflate remaining feature weights.
- One high feature alone does not generally produce `likely_cheating`.
- Multiple high-confidence feature families can still produce `likely_cheating`.
- The known problematic demo ID `019e3a28-60a6-7c96-99c8-34ddd3231268` should be used as a local/manual regression target where available, with fixture-style synthetic tests as the committed baseline.

## Planning Recommendation

Use four waves:

1. Shared calibration model and scorer guardrails.
2. Extractor-specific evidence gates.
3. Regression suite and demo replay verification.
4. Frontend/API evidence and confidence display polish.

## Validation Architecture

Validation should combine unit tests, integration-like synthetic parsed demo fixtures, and a manual/local replay check for the known problematic demo when the demo file exists in storage.

Required commands:

- `PYTHONPATH=python pytest tests/test_weighted_scorer.py tests/test_worker_player_slicing.py`
- `PYTHONPATH=python pytest tests/test_features_aimbot.py tests/test_features_wallhack.py tests/test_features_triggerbot.py tests/test_features_recoil.py tests/test_features_bhop.py tests/test_features_session.py`
- `cd frontend && npm test -- ResultsCard.test.tsx`
- `cd frontend && npm run lint`

## RESEARCH COMPLETE
