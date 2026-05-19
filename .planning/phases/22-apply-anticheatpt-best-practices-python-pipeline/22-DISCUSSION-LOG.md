# Phase 22 Discussion Log

**Session:** 2026-05-19
**Participants:** User (Tr0nYx), Claude

## Areas Discussed

### 1. Phase 22 Focus & Approach
**Question:** Should Phase 22 focus on research-oriented improvements or production-oriented improvements?

**Options Presented:**
- Research-first (signal quality) — **Selected**
- Production-first (speed/scalability)
- Balanced (both, but don't optimize for speed)

**Decision:** Research-first. Focus on better feature engineering, calibration gates, and explainability. Pipeline speed is secondary to signal quality, aligning with Phase 20's conservative posture.

**Rationale:** Signal quality and research-safe framing are core to the product mission. Production optimization can follow once signal quality is locked.

---

### 2. Derivative Feature Integration
**Question:** How should derivative-based features be integrated with existing extractors?

**Options Presented:**
- Extend existing extractors — **Selected**
- Separate conversion stage
- Post-processing only

**Decision:** Extend existing extractors. Each extractor (aimbot, recoil, etc.) becomes responsible for computing first/second/third-order derivatives within its own context window.

**Rationale:** Keeps temporal patterns player-local and interpretable. Extractors understand their own signal windows best.

---

### 3. Transformer Integration
**Question:** Should transformer be integrated into weighted scorer or kept separate?

**Options Presented:**
- Integrated scoring — **Selected**
- Shadow-mode research only
- Future model replacement

**Decision:** Integrated scoring. Transformer becomes another feature extractor that feeds into the weighted scorer like any other feature.

**Rationale:** Allows transformer signals to contribute to visible suspicion when strong evidence exists, while respecting Phase 20 evidence gates.

---

### 4. Derivative Depth
**Question:** How many orders of derivative should each extractor compute?

**Options Presented:**
- First-order only (Δangle, Δvelocity)
- First + second-order (acceleration/jerk)
- All three (first, second, third) — **Selected**

**Decision:** All three orders. First-order captures rate of change, second captures acceleration/jerk, third captures snap/mechanical patterns.

**Rationale:** Comprehensive signal coverage aligns with AntiCheatPT patterns. More nuanced temporal behavior detection.

---

### 5. Data Augmentation Strategy
**Question:** How should data augmentation for class imbalance be structured?

**Options Presented:**
- Tick-level augmentation (noise injection)
- Feature-level augmentation (synthetic scores)
- Stratified sampling only — **Selected**

**Decision:** Stratified sampling only. No synthetic data generation in the pipeline. Use stratified sampling during ML model training (separate concern).

**Rationale:** Preserves authenticity of all demo analysis. Synthetic data belongs in ML training, not production pipeline.

---

### 6. Result Schema Changes
**Question:** Should persisted results change, or just internal pipeline structure?

**Options Presented:**
- No schema changes (backward compatible)
- Add derivative-feature evidence
- Modular result structure — **Selected**

**Decision:** Modular result structure. Expose all pipeline stages (extraction → conversion → augmentation → analysis) in persisted results with stage-specific evidence and metadata.

**Rationale:** Full transparency into signal chain. UI can show how signals were derived and at which stage confidence was applied.

---

### 7. Calibration Alignment
**Question:** How strictly should Phase 22 adhere to Phase 20's conservative gates?

**Options Presented:**
- Strict (Phase 20 gates apply first)
- Adaptive (new features can suggest recalibration) — **Selected**
- Separate validation (research signal only)

**Decision:** Adaptive. Implement new features with appropriate gates; if new signals suggest Phase 20 thresholds are too conservative, document for Phase 20 replan.

**Rationale:** Allows Phase 22 to inform Phase 20 improvements without blocking implementation. Empirical feedback loop.

---

### 8. Pipeline Architecture
**Question:** Should modular structure be explicit (separate classes) or implicit (within Worker)?

**Options Presented:**
- Explicit, separate modules
- Extend Worker with stages — **Selected**
- Functional composition
- Don't force explicit structure yet

**Decision:** Extend Worker with explicit stage methods (`_conversion_stage`, `_augmentation_stage`, `_analysis_stage`). Keeps clarity without proliferating files.

**Rationale:** Balances modularity with pragmatism. Easy to refactor to separate classes later if needed.

---

### 9. Positional Encoding Ownership
**Question:** Who should own positional encoding for the transformer?

**Options Presented:**
- Parser (tick-based) — **Selected**
- Extractor (event-based)
- Dedicated encoding layer

**Decision:** Parser. Tick-aligned positional encoding (absolute tick number from demo start). Transformer consumes tick IDs as-is.

**Rationale:** Simple, tick-aligned, natural for sequence modeling. Parser knows ticks; no coupling to transformer logic.

---

## Summary of Locked Decisions

| Decision | Direction |
|----------|-----------|
| Phase focus | Research-first (signal quality) |
| Derivative approach | Extend extractors with first/second/third-order |
| Transformer role | Integrated feature in weighted scorer |
| Augmentation | Stratified sampling only (no synthetic data) |
| Results | Modular structure exposing all pipeline stages |
| Calibration | Adaptive (new signals can inform Phase 20 replan) |
| Architecture | Worker + explicit stage methods |
| Positional encoding | Parser + tick-aligned |

## Deferred to Future Phases

- Synthetic data augmentation
- LSTM/GRU alternatives to transformer
- Online/live model retraining
- External AntiCheatPT model weight integration
- Ban automation or enforcement

---

*Discussion completed: 2026-05-19*
