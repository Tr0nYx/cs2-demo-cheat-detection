# Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 22 implements AntiCheatPT-aligned feature engineering patterns into the Python analysis pipeline while preserving Phase 20's conservative calibration posture. The phase adds derivative-based temporal analysis (first/second/third-order angles and velocities), modular pipeline stages (conversion → augmentation → analysis), transformer-based sequence modeling with tick-aligned positional encoding, and research-signal structured results that expose the multi-stage analysis process.

This phase does not add external data sources, model replacement, or new ethical boundaries. All new features remain research-signal language. Phase 20's evidence gates may be refined based on new signal strength, but visible suspicion decisions remain player-specific and conservative. No synthetic data augmentation is used; stratified sampling only.

</domain>

<decisions>
## Implementation Decisions

### Feature Engineering: Derivative Computation
- **D-01:** All existing feature extractors (aimbot, wallhack, triggerbot, recoil, bhop, session) compute first, second, and third-order derivatives.
- **D-02:** First-order derivatives capture rate of change (Δangle, Δvelocity); second-order captures acceleration/jerk; third-order captures snap/mechanical patterns.
- **D-03:** Derivatives are computed within each extractor's context window (e.g., per-kill windows for aimbot, per-spray for recoil) to keep signals player-local and interpretable.
- **D-04:** Raw derivative values and normalized scores are stored in `raw_measurements` for explainability; extractors return both derivative-derived score and traditional score for backward compatibility during Phase 20 validation.

### Data Handling: Class Imbalance
- **D-05:** No synthetic data augmentation or tick-level noise injection in this phase.
- **D-06:** Use stratified sampling during ML model training/evaluation (separate concern from production pipeline scoring).
- **D-07:** Production demo analysis uses the full, authentic demo tick/event stream with no augmentation.

### Pipeline Architecture: Modular Stages
- **D-08:** Worker orchestrates three explicit analysis stages: `_conversion_stage` (compute derivatives and statistical summaries), `_augmentation_stage` (prepare for model input), `_analysis_stage` (run transformer and weighted scorer).
- **D-09:** Each stage is a clear Worker method with defined input/output contracts, making the pipeline structure visible but minimizing new files.
- **D-10:** Stage methods document their responsibilities: conversion handles time-series math, augmentation handles formatting/padding, analysis runs scoring.

### Transformer Integration: Sequence Modeling
- **D-11:** Transformer is implemented as an additional feature extractor (`TransformerSequenceExtractor`) that inherits from `AbstractFeatureExtractor`.
- **D-12:** Transformer runs after traditional extractors and produces a normalized suspicion score fed into the weighted scorer like any other feature.
- **D-13:** Positional encoding is tick-aligned (absolute tick number from demo start) and computed by the parser; TransformerSequenceExtractor consumes tick IDs as-is.
- **D-14:** Context windows for transformer remain kill-based (matched to aimbot/trigger logic) to preserve interpretability and player-local framing.

### Calibration and Evidence Gates
- **D-15:** Phase 20's conservative evidence gates remain the baseline for visible suspicion scoring during Phase 22 development.
- **D-16:** New derivative and transformer signals are adaptive: if they consistently suggest Phase 20's thresholds are too conservative, document findings for Phase 20 replan. This informs but does not override Phase 20 decisions during implementation.
- **D-17:** Transformer confidence is exposed in CalibrationMetadata; high transformer score alone does not drive visible `High review signal` without Phase 20 evidence gates.

### Result Schema: Modular Output Structure
- **D-18:** Persisted results expose all pipeline stages: `raw_extraction` (traditional extractor scores), `converted` (with derivatives and statistical summaries), `augmented` (model-ready format indicators), and `transformer_analysis` (transformer score and confidence).
- **D-19:** Each stage includes its own evidence and metadata so downstream UI/analysis can show full signal chain, not just final score.
- **D-20:** Backward compatibility: existing API responses continue to show the weighted-scorer result; new stage details are available in expanded feature_data or research mode.

### Claude's Discretion
- Exact derivative computation methods (smoothing, windowing, boundary handling) are researcher/planner discretion.
- Specific transformer architecture (embedding dim, attention heads, layer count) and training strategy are implementation details.
- Exact stratified sampling ratios and augmentation thresholds for future ML model work are deferred.

</decisions>

<specifics>
## Specific Ideas

- The motivating external source is the AntiCheatPT dataset and published notebook patterns, reviewed in Phase 21 research.
- Derivative signals should feel like natural extensions of existing extractors, not a separate system. Extractors should own their temporal patterns.
- The modular pipeline makes it easy for future work to plug in different models (e.g., GRU, LSTM, attention-only) without restructuring orchestration.
- Transformer context windows should respect kill-local boundaries to maintain the player-specific framing established in Phase 20.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Prior Phase Context
- `.planning/PROJECT.md` - Core post-game research scope and ethical boundary.
- `.planning/REQUIREMENTS.md` - Python worker, feature extraction, and persistence constraints.
- `.planning/ROADMAP.md` - Phase 22 goal, expected waves, and dependencies.
- `.planning/phases/20-calibrate-high-review-signals-reduce-false-positives/20-CONTEXT.md` - Locked calibration posture, evidence gates, and confidence handling (Phase 22 must not override these without Phase 20 replan).

### External Guidance
- `.planning/phases/21-anticheatpt-research-python-pipeline-guidance/21-01-PLAN.md` - Phase 21 research plan; read after Phase 21 execution for AntiCheatPT patterns and code recommendations.
- `.planning/phases/21-anticheatpt-research-python-pipeline-guidance/README.md` - Phase 21 research summary of AntiCheatPT dataset conventions, feature engineering patterns, and conservative research-signal guidance (read after Phase 21 completes).

### Code Anchors
- `python/features/base.py` - `AbstractFeatureExtractor`, `FeatureResult`, `CalibrationMetadata` contract; all new extractors must inherit and use this structure.
- `python/worker.py` - Current orchestration; Phase 22 adds `_conversion_stage`, `_augmentation_stage`, `_analysis_stage` methods here.
- `python/scoring/weighted_scorer.py` - Scoring rules and evidence aggregation; transformer becomes a feature input.
- `python/persistence/result_writer.py` - Schema for persisting modular results with stage-specific evidence and metadata.
- `python/parser/adapter.py` - Demo parsing interface; adds tick-aligned positional encoding for transformer.

### UI/Results Integration
- `frontend/lib/api.ts` - Backend result mapping into UI evidence structures; must handle modular result schema.
- `frontend/components/FeatureTable.tsx` - Feature evidence display; may need expansion for derivative/transformer metadata.
- `frontend/components/ResultsCard.tsx` - Overall suspicion rendering; transformer is scored like other features, no special handling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AbstractFeatureExtractor` with `CalibrationMetadata` already supports derivative and confidence metadata; all new extractors can reuse this pattern.
- `worker.py` already slices analysis by player SteamID and orchestrates per-player extraction; Phase 22 adds stage methods without changing this structure.
- `result_writer.py` already persists `feature_data` with arbitrary metadata; modular result structure can be represented in this field.
- `base.py` provides `_sigmoid_normalize` and `_clip_normalize` utilities for score normalization; derivative scoring can use these.

### Established Patterns
- Python owns parsing, feature extraction, scoring, and all ML behavior.
- Symfony owns API boundaries, result persistence contract, and product constraints.
- All outputs framed as research signals; no proof language.
- Per-player, per-extractor, per-signal evidence tracking is standard.

### Integration Points
- Parser adds tick-aligned IDs to each event/tick so transformer can compute positional encoding.
- Each extractor returns `FeatureResult` with score, raw measurements, and metadata; transformer does the same.
- Weighted scorer inputs transformer score alongside existing feature scores; no special combinatorial logic.
- Result writer persists modular stages in `feature_data` with clear stage-boundary markers for UI parsing.

</code_context>

<deferred>
## Deferred Ideas

- Synthetic data augmentation, tick-level noise injection, or in-distribution data generation remain deferred to a future ML-focused phase.
- LSTM, GRU, or other sequence architectures beyond transformer are deferred; transformer is the first sequence model.
- Live model retraining or online learning remain out of scope; model weights are static post-training.
- Integration with external AntiCheatPT model weights or pre-trained embeddings is deferred unless Phase 21 research strongly recommends it.
- Ban automation, enforcement, or live anti-cheat behavior remain out of scope.

</deferred>

---

*Phase: 22-apply-anticheatpt-best-practices-python-pipeline*
*Context gathered: 2026-05-19*
