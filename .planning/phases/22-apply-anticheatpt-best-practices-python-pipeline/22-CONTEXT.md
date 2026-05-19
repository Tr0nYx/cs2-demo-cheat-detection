# Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline - Context

**Gathered:** 2026-05-19
**Compliance Reviewed:** 2026-05-19 against AntiCheatPT (arXiv 2508.06348, CS2CD dataset, itubrainlab/AntiCheatPT)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 22 implements AntiCheatPT-aligned feature engineering patterns (arXiv 2508.06348: 89.17% accuracy baseline) into the Python analysis pipeline while preserving Phase 20's conservative calibration posture. The phase adds:
- Derivative-based temporal analysis (first/second/third-order angles and velocities)
- Dual-path data handling: authentic production scoring + augmented ML model training
- Modular pipeline stages (extraction → conversion → augmentation → analysis)
- Transformer-based sequence modeling with tick-aligned positional encoding (context windows: 300-tick per kill event)
- Research-signal structured results exposing all pipeline stages with evidence metadata

**Production Pipeline (Phase 20 Constraint):** Uses authentic, stratified demo data with no synthetic augmentation. All visible suspicion remains player-specific and conservative.

**ML Training Pipeline (AntiCheatPT Alignment):** Model training uses SMOTE-like oversampling, temporal shifting, and noise injection to match AntiCheatPT methodology and achieve comparable accuracy.

This phase does not add external data sources, model replacement, or new ethical boundaries. All outputs remain research-signal language. Phase 20's evidence gates may be refined based on new signal strength but are not overridden.

</domain>

<decisions>
## Implementation Decisions

### Feature Engineering: Derivative Computation
- **D-01:** All existing feature extractors (aimbot, wallhack, triggerbot, recoil, bhop, session) compute first, second, and third-order derivatives.
- **D-02:** First-order derivatives capture rate of change (Δangle, Δvelocity); second-order captures acceleration/jerk; third-order captures snap/mechanical patterns.
- **D-03:** Derivatives are computed within each extractor's context window (e.g., per-kill windows for aimbot, per-spray for recoil) to keep signals player-local and interpretable.
- **D-04:** Raw derivative values and normalized scores are stored in `raw_measurements` for explainability; extractors return both derivative-derived score and traditional score for backward compatibility during Phase 20 validation.

### Data Handling: Dual-Path (Production vs ML Training)

#### Production Pipeline (Phase 20 Constraint - Authentic Data)
- **D-05:** Production demo analysis uses the full, authentic demo tick/event stream with no synthetic data or augmentation.
- **D-06:** Production results use stratified sampling for validation splits to match authentic conditions.
- **D-07:** All visible suspicion scores derive from authentic demo analysis; no augmented or synthetic data influences player-facing output.

#### ML Model Training (AntiCheatPT Alignment - Augmented Data)
- **D-08:** Transformer model training uses augmentation techniques matching AntiCheatPT methodology (achieved 89.17% accuracy on unaugmented test set):
  - **SMOTE-like Synthetic Minority Oversampling**: Generate synthetic context windows for under-represented cheat classes (target: balanced class distribution in training)
  - **Temporal Shifting**: Create variations by offsetting event sequences within context windows (e.g., ±5-tick shifts)
  - **Realistic Measurement Noise**: Add bounded Gaussian noise to feature streams matching demo parser precision (~0.1-0.5% of value ranges)
  - **Feature Scaling Variants**: Augment with different sensitivity ranges (e.g., ±10% velocity scaling) to test robustness
- **D-09:** Augmentation applies only to training dataset (train split after stratified split). Validation and test splits use authentic, stratified demo data.
- **D-10:** Augmentation seeds, ratios, and noise parameters must be documented and reproducible; include in model metadata for research transparency.
- **D-11:** Model validation uses unaugmented test data (matching AntiCheatPT evaluation protocol) to verify real-world performance.

### Pipeline Architecture: Modular Stages (AntiCheatPT Structure)
- **D-12:** Worker orchestrates four explicit analysis stages (matching AntiCheatPT DataExtraction → DataConversion → DataAugmentation → Transformer structure):
  - `_extraction_stage`: Parse ticks, kills, events; compute traditional feature scores (aimbot, wallhack, etc.)
  - `_conversion_stage`: Compute derivatives, statistical summaries (mean, variance, percentiles); normalize to tensor format
  - `_augmentation_stage`: Apply augmentation for ML model input (production: none; training: SMOTE, noise, temporal shifts)
  - `_analysis_stage`: Run transformer sequence model and weighted scorer to produce final suspicion labels
- **D-13:** Each stage is a clear Worker method with defined input/output contracts, making the pipeline structure visible while minimizing new files.
- **D-14:** Stage methods document their responsibilities: extraction handles event parsing, conversion handles time-series math, augmentation handles balancing/noise, analysis runs sequence modeling.

### Transformer Integration: Sequence Modeling (AntiCheatPT Alignment)
- **D-15:** Transformer is implemented as an additional feature extractor (`TransformerSequenceExtractor`) that inherits from `AbstractFeatureExtractor`.
- **D-16:** Transformer runs after traditional extractors and produces a normalized suspicion score fed into the weighted scorer like any other feature.
- **D-17:** Positional encoding is tick-aligned (absolute tick number from demo start, computed by parser); TransformerSequenceExtractor consumes tick IDs for positional vectors.
- **D-18:** Context windows for transformer: **300-tick per kill event** (kill ± 150 ticks), matching AntiCheatPT's 90,707 context-window dataset structure. Window stride and event selection (kills vs. bomb actions) is researcher discretion.

### Transformer Architecture: Hyperparameters (AntiCheatPT-Recommended Baselines)
- **D-19:** Model: Transformer encoder with multihead attention (Vaswani et al., 2017). Not LSTM/GRU.
- **D-20:** **Embedding dimension (d_model):** 256 (reference: AntiCheatPT_256 model; adjust based on validation convergence)
- **D-21:** **Attention heads:** Test {4, 8, 16}; recommend starting with 8 for 256-dim (head_dim = 32)
- **D-22:** **Transformer layers:** Test {2, 4, 6, 8, 12}; recommend starting with 6 layers
- **D-23:** **Feedforward dimension (d_ff):** 4 × d_model (e.g., 1024 for d_model=256), standard from "Attention is All You Need"
- **D-24:** **Dropout rate:** 0.1 during training; 0.0 during inference (to match AntiCheatPT robustness)
- **D-25:** **Training strategy:** Adam optimizer, learning rate scheduling, batch size, and loss function are researcher/planner discretion. Target: ≥89% accuracy on unaugmented test set (AntiCheatPT baseline).

### Calibration and Evidence Gates
- **D-15:** Phase 20's conservative evidence gates remain the baseline for visible suspicion scoring during Phase 22 development.
- **D-16:** New derivative and transformer signals are adaptive: if they consistently suggest Phase 20's thresholds are too conservative, document findings for Phase 20 replan. This informs but does not override Phase 20 decisions during implementation.
- **D-17:** Transformer confidence is exposed in CalibrationMetadata; high transformer score alone does not drive visible `High review signal` without Phase 20 evidence gates.

### Result Schema: Modular Output Structure
- **D-18:** Persisted results expose all pipeline stages: `raw_extraction` (traditional extractor scores), `converted` (with derivatives and statistical summaries), `augmented` (model-ready format indicators), and `transformer_analysis` (transformer score and confidence).
- **D-19:** Each stage includes its own evidence and metadata so downstream UI/analysis can show full signal chain, not just final score.
- **D-20:** Backward compatibility: existing API responses continue to show the weighted-scorer result; new stage details are available in expanded feature_data or research mode.

### Claude's Discretion (Researcher/Planner Flexibility)
- **Derivative Computation:** Smoothing methods (Savitzky-Golay, exponential, simple differences), windowing (centered vs. forward-looking), boundary handling (pad vs. drop).
- **Augmentation Ratios:** SMOTE target ratio (1:1 balance vs. 1:2 minority boost), noise magnitude, temporal shift bounds within {±1-10 ticks}.
- **Training Strategy:** Optimizer (Adam, SGD), learning rate schedule, batch size, epochs, loss function (cross-entropy, focal loss for imbalance), early stopping criteria.
- **Validation Protocol:** k-fold (5 or 10), stratified vs. random splits, when to evaluate on unaugmented test set.
- **Feature Normalization:** Z-score, min-max, or other scaling strategies per feature family.
- **Model Checkpointing:** When to save best model, how to track metrics, reproducibility seed management.

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

### External Guidance (AntiCheatPT Best Practices - Peer-Reviewed)
- **ArXiv 2508.06348** - Official paper: "AntiCheatPT: A Transformer-Based Approach to Cheat Detection in Competitive Computer Games" (https://arxiv.org/abs/2508.06348). Reference for baseline accuracy (89.17%), architecture, context windows (90,707 from 795 matches), and augmentation strategy.
- **GitHub: itubrainlab/AntiCheatPT** (https://github.com/itubrainlab/AntiCheatPT) - Official implementation. Reference: DataExtraction, DataConversion, DataAugmentation, Transformer modules for code patterns and hyperparameters.
- **Hugging Face: CS2CD Dataset** (https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection) - 795 labeled matches, 90,707 context windows (317 cheaters, 478 clean). DOI: 10.57967/hf/5654. Reference dataset structure and access patterns.
- `.planning/phases/21-anticheatpt-research-python-pipeline-guidance/21-01-PLAN.md` - Phase 21 research plan; read for AntiCheatPT patterns extraction and code recommendations.
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

- **Production-side augmentation:** Synthetic data remains training-only (Phase 22). Production pipeline uses authentic data. This boundary is firm per Phase 20.
- **LSTM/GRU architectures:** Other sequence models beyond transformer are deferred. Transformer is the first sequence model; alternatives can follow if performance warrants.
- **Online/live retraining:** Model weights are static post-training. Periodic retraining on new demo batches is a future production-ops concern.
- **Pre-trained AntiCheatPT weights:** Integration with external AntiCheatPT_256 model weights or embeddings is deferred unless Phase 21 research specifically recommends transfer learning. Current plan trains from scratch on authentic + augmented data.
- **Attention visualization/explainability:** Transformer attention head visualization and interpretability tools are deferred to a later research phase.
- **Ensemble methods:** Combining transformer with other models (e.g., gradient boosting) is deferred; weighted scorer handles feature fusion.
- **Ban automation, enforcement, or live anti-cheat behavior:** Remain out of scope per PROJECT.md ethical boundary.

</deferred>

---

*Phase: 22-apply-anticheatpt-best-practices-python-pipeline*
*Context gathered: 2026-05-19*
