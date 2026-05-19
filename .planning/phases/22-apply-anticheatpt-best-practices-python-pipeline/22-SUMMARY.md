# Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline

**Compliance Status:** ✅ Aligned with AntiCheatPT (arXiv 2508.06348, 89.17% accuracy baseline)
**Last Updated:** 2026-05-19 (AntiCheatPT compliance audit)

## Goal

Implement AntiCheatPT best-practice feature engineering, data handling (dual-path: production authentic + ML augmented), and transformer-based sequence modeling into the CS2 detection pipeline. Achieve ≥89% accuracy baseline while preserving Phase 20's conservative production scoring.

## Architecture Overview

Modular pipeline matching AntiCheatPT structure (DataExtraction → DataConversion → DataAugmentation → Transformer):

```
Player Demo
  ↓
_extraction_stage (parse ticks, kills, events; traditional features)
  ↓
_conversion_stage (derivatives 1°/2°/3°, statistical summaries, normalization)
  ↓
_augmentation_stage
  ├─ Production path: None (authentic data only, Phase 20 constraint)
  └─ Training path: SMOTE, noise, temporal shifts (ML training only)
  ↓
_analysis_stage (transformer sequence model + weighted scorer)
  ↓
Modular Results (raw_extraction → converted → augmented → transformer_analysis)
```

## Feature Engineering: Derivatives & Statistics

### Derivative Patterns (All Three Orders)
- **1st-order (Δangle, Δvelocity)**: Rate of change; captures smooth aim behavior
- **2nd-order (Δ²angle, acceleration)**: Acceleration/jerk; captures sudden aim changes
- **3rd-order (snap/jerk)**: Mechanical snap patterns; captures automated aim behavior

Computed per-extractor within context windows:
- **Aimbot**: Kill-local windows (kill ± 30 ticks)
- **Recoil**: Per-spray sequences
- **Wallhack**: Pre-peek windows
- **Triggerbot**: Fire reaction windows

### Statistical Summaries (Per Context Window)
- Mean, variance, percentiles (25th, 50th, 75th, 95th) of feature distributions
- Multi-scale aggregation at 5-tick, 20-tick, 100-tick windows
- Cumulative displacement over context windows

## Data Handling: Dual-Path Architecture

### Production Pipeline (Phase 20 Constraint - Authentic Data)
```
Real Demo → Extraction → Conversion (no augmentation) → Analysis → Suspicion Score
```
- **All visible suspicion** derives from authentic demo data only
- No synthetic data influences player-facing results
- Stratified validation splits match authentic demo distribution

### ML Training Pipeline (AntiCheatPT Alignment - Augmented Data)
```
Training Data (80%)
  ├─ Authentic data (primary)
  └─ Augmented data (minority class balance)
       ├─ SMOTE-like Synthetic Minority Oversampling (target: balanced classes)
       ├─ Temporal Shifting (±1-10 ticks; create event-sequence variations)
       ├─ Realistic Measurement Noise (0.1-0.5% Gaussian, parser-precision-matched)
       └─ Feature Scaling Variants (±10% velocity/angle ranges)

Validation Data (10%) - Authentic, stratified only
Test Data (10%) - Authentic, stratified only (unaugmented test set for evaluation)
```
- **Training:** Augmented data + authentic → train transformer
- **Validation/Test:** Authentic only → verify real-world performance
- **Expected:** ≥89% accuracy on unaugmented test set (AntiCheatPT baseline)

## Transformer Architecture (AntiCheatPT-Recommended)

### Model Type
- **Architecture:** Transformer encoder (Vaswani et al., "Attention is All You Need", 2017)
- **Not:** LSTM, GRU, or hybrid approaches (reserved for future phases)

### Context Windows
- **Size:** 300 ticks per kill event (kill ± 150 ticks)
- **Event alignment:** Kill-based, matching AntiCheatPT's 90,707 context-window dataset
- **Stride/overlap:** Researcher/planner discretion

### Hyperparameters (Baseline Configuration)

| Parameter | Baseline | Range | Rationale |
|-----------|----------|-------|-----------|
| **Embedding dim (d_model)** | 256 | 128-512 | AntiCheatPT_256 baseline; adjust if training diverges |
| **Attention heads** | 8 | {4, 8, 16} | 256÷8 = head_dim 32; test for convergence |
| **Layers** | 6 | {2, 4, 6, 8, 12} | Balance expressiveness vs. overfitting |
| **Feedforward dim (d_ff)** | 1024 | 4×d_model | Standard Vaswani ratio |
| **Dropout** | 0.1 (train) / 0.0 (infer) | 0.05-0.2 | AntiCheatPT robustness pattern |
| **Positional Encoding** | Tick-aligned sine/cosine | N/A | Absolute tick number from demo start |
| **Activation** | ReLU | - | Standard transformer |

### Training Strategy (Researcher/Planner Discretion)
- **Optimizer:** Adam recommended (learning rate, weight decay, eps tuning)
- **Loss Function:** Cross-entropy (or focal loss if training imbalance persists)
- **Batch Size:** TBD (typically 32-128 for demo windows)
- **Epochs:** TBD with early stopping on validation loss
- **Learning Rate Schedule:** Warmup + decay (e.g., cosine annealing)
- **Checkpointing:** Save best model on validation loss; track metrics per epoch

## Pipeline Modularization

### Stage Methods in Worker
```python
# Orchestrated by worker:
worker._extraction_stage(demo)           # → traditional feature scores
worker._conversion_stage(features)       # → derivatives + statistics
worker._augmentation_stage(converted)    # → (production: none; training: apply augmentation)
worker._analysis_stage(augmented)        # → transformer + weighted scorer → final labels
```

### Result Schema (Modular Visibility)
```json
{
  "player_id": "...",
  "stages": {
    "raw_extraction": {
      "aimbot_score": 0.65,
      "wallhack_score": 0.32,
      ...
    },
    "converted": {
      "aimbot_with_derivatives": {...},
      "statistical_summaries": {...}
    },
    "augmented": {
      "model_ready_tensors": [...],
      "augmentation_applied": false  // (true only in training)
    },
    "transformer_analysis": {
      "transformer_score": 0.71,
      "confidence": "high",
      "attention_patterns": {...}  // research mode
    }
  },
  "weighted_scorer_result": { ... },
  "final_suspicion_label": "Review signal"
}
```

## Calibration & Evidence Gates

### Production Suspicion (Phase 20 Constraint)
- All visible suspicion derives from Phase 20 evidence gates
- Transformer score alone does not drive `High review signal`
- Derivative scores must pass Phase 20 evidence gates to influence visible output

### Research Signals (Adaptive Feedback)
- New derivative and transformer signals may suggest Phase 20 recalibration
- Document findings; Phase 20 replan decides whether to adjust gates
- Never override Phase 20 decisions during Phase 22 implementation

## Data Sources & References

### Primary Sources
- **ArXiv 2508.06348** - Official paper: "AntiCheatPT: A Transformer-Based Approach to Cheat Detection in Competitive Computer Games"
  - 89.17% accuracy, 93.36% AUC on unaugmented test set
  - 90,707 context windows from 795 labeled CS2 matches
  - Architecture, augmentation, and training protocol reference
  
- **GitHub: itubrainlab/AntiCheatPT** (https://github.com/itubrainlab/AntiCheatPT)
  - Official implementation; code patterns for data handling, model training
  - DataExtraction, DataConversion, DataAugmentation modules

- **Hugging Face: CS2CD Dataset** (https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection)
  - 795 labeled matches (317 cheater, 478 clean)
  - 90,707 context windows in Parquet format
  - DOI: 10.57967/hf/5654

### Secondary References
- github.com/yviler/cs2-cheat-detection (aimbot detection with engineered features)
- github.com/yHER0/RapidFire-Cheat-Detection (rapid-fire detection pipeline)

## Expected Impact

- ✅ Improved feature representation aligned with peer-reviewed research
- ✅ Class imbalance addressed via AntiCheatPT augmentation (training only, not production)
- ✅ Transformer-based temporal pattern recognition for sequence behavior
- ✅ Modular, fully documented pipeline supporting research transparency and reproducibility
- ✅ Production suspicion remains conservative (Phase 20) while benefiting from advanced ML signals
- ✅ Baseline accuracy target: ≥89% (matching AntiCheatPT unaugmented test set)

## Blocked By
- Phase 21: AntiCheatPT Research and Python Pipeline Guidance (provides implementation reference details)

## Research-Only Boundary (Phase 20 + 22)
- ✅ All outputs framed as analysis signals for human review, never proof
- ✅ Visible suspicion remains player-specific and conservative (Phase 20 gates)
- ✅ No synthetic data touches production pipeline
- ✅ No live cheat detection, memory reading, or enforcement
- ✅ Preserve Symfony/Python boundary (Python owns scoring; Symfony/frontend display)
- ✅ Explicit documentation of thresholds, derivatives, and augmentation strategies (no opaque black-boxes)
- ✅ Reproducible: document seeds, configs, model weights for research transparency
