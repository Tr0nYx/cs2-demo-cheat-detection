# Phase 4: ML Dataset and Transformer Prep - Discussion Log

**Gathered:** 2026-05-15
**Participants:** User, Claude

---

## Discussion Summary

Phase 4 context was gathered through four rounds of structured decision-making. All gray areas were addressed, and user choices lock critical implementation details for the dataset loader, model architecture, and training pipeline.

---

## Area 1: Code Organization

**Question:** How should ML code be organized?

**Options Presented:**
- Separate `ml/` top-level directory
- Nested in `python/ml/`
- Distributed across existing modules

**User Selection:** Nested in `python/ml/`

**Rationale:** Keeps ML as a coherent sub-package within the Python monolith, consistent with existing `python/features/`, `python/parser/`, `python/persistence/`, `python/scoring/` structure.

---

## Area 2: Model Architecture

**Question:** How should the transformer model be instantiated?

**Options Presented:**
- Custom nn.Transformer-based model
- Custom transformer from first principles
- Load a HuggingFace pretrained transformer

**User Selection:** Custom nn.Transformer-based model

**Rationale:** Balances simplicity (uses PyTorch's built-in) with control (can customize layers, attention, etc.). Easier to match "AntiCheatPT_256-style" than pre-trained models.

**Follow-up — Architecture Details:**

**Question:** What transformer depth/width?

**Options Presented:**
- Small (2–3 layers, 64 hidden, 4 heads)
- Medium (4–6 layers, 128 hidden, 8 heads)
- Defer to agent judgment

**User Selection:** Defer to agent judgment

**Rationale:** Allow the planner/implementer to choose based on actual CS2CD dataset size and compute constraints discovered during research.

---

## Area 3: Dataset Loading

**Question:** Should the dataset loader download on-demand, use local cache, or expect pre-downloaded files?

**Options Presented:**
- On-demand download with HuggingFace API
- Local cache with fallback
- Pre-downloaded assumption

**User Selection:** On-demand download with HuggingFace API

**Rationale:** Simplest for users (no manual download step); cache is automatic via `datasets` library.

**Follow-up — Authentication:**

**Question:** Should the loader handle authentication (e.g., for private datasets)?

**Options Presented:**
- Assume public; no auth handling
- Support HF_TOKEN from environment
- Require explicit HF login beforehand

**User Selection:** Support HF_TOKEN from environment

**Rationale:** Flexible: works for public datasets (no token needed) and private ones (token optional). Defaults to public access if no token is set.

---

## Area 4: Data Augmentation

**Question:** What noise variance and application strategy for Gaussian augmentation?

**Options Presented:**
- Fixed small variance (σ=0.01), apply to all samples
- Configurable variance, applied conditionally during training
- Per-feature variance tuning based on feature scale

**User Selection:** Per-feature variance tuning based on feature scale

**Rationale:** Data-driven and robust; handles features with different scales (e.g., position in meters vs. health in points).

**Follow-up — Variance Computation:**

**Question:** How should variance values be determined?

**Options Presented:**
- Compute from training set statistics (std per feature)
- Configuration constants (YAML or dict)
- Agent discretion during implementation

**User Selection:** Compute from training set statistics (std per feature)

**Rationale:** Automatic, adapts to actual data distribution, reproducible.

---

## Area 5: Training Loop

**Question:** What validation/checkpoint strategy?

**Options Presented:**
- Fixed validation set, save best model by validation metric
- Fixed validation, save every N epochs
- Early stopping with patience threshold

**User Selection:** Fixed validation set, save best model by validation metric

**Rationale:** Classic, prevents overfitting to fixed splits. Best-model selection is simpler than early stopping and avoids patience tuning.

---

## Area 6: Matrix Format

**Question:** What does 256x44 represent?

**Options Presented:**
- 256 time steps × 44 context features per step
- Different interpretation needed

**User Selection:** 256 time steps × 44 context features per step

**Rationale:** Aligns with typical sequence model format (variable-length sequences, fixed feature count).

---

## Area 7: Model Output

**Question:** Binary, multi-class, or regression output?

**Options Presented:**
- Binary classification (clean vs not-clean)
- Multi-class (clean, suspicious, likely_cheating)
- Regression (continuous [0, 1] score)

**User Selection:** Regression: continuous suspicion score [0, 1]

**Rationale:** Continuous scores align with Phase 3 weighted scorer output and provide richer signal for interpretation. Allows downstream thresholding (Phase 5).

---

## Area 8: Model Artifacts

**Question:** How should trained models be exposed for Phase 5?

**Options Presented:**
- Save to `data/models/`; Phase 5 documents path
- Make targets handle everything
- Defer to Phase 5

**User Selection:** Save checkpoints to `data/models/`; Phase 5 documents path

**Rationale:** Clean separation: Phase 4 produces artifacts, Phase 5 integrates them. Explicit paths make Makefile wiring simple.

---

## Area 9: Testing

**Question:** What level of test coverage?

**Options Presented:**
- Dataset tests only
- Dataset + model smoke tests
- Full train-to-eval test with small fixture data
- Defer testing

**User Selection:** Full train-to-eval test with small fixture data

**Rationale:** Proves end-to-end pipeline works. Small fixtures keep test fast (<5 seconds).

---

## Scope Clarifications

No scope creep was identified. All decisions clarified HOW to implement the locked Phase 4 requirements (ML-01 through ML-06), not WHETHER to add new capabilities.

---

## Deferred Ideas

- Hyperparameter optimization (grid search, Bayesian) — future phase
- Ensemble methods or stacking — future phase
- Experiment tracking (MLflow, W&B) — v2
- Data versioning (DVC) — future phase
- Early stopping with patience — deferred (fixed epoch training)
- Multi-GPU training — deferred
- Transfer learning / pre-training — future enhancement

---

## Claude's Discretion Items

The following are explicitly delegated to the planner/implementer's judgment:

- Exact transformer hyperparameters (layer count, hidden size, num_heads, dropout) as long as nn.Transformer is used.
- Exact loss function and optimizer settings (learning rate, warmup, weight decay) as long as MSE loss + AdamW + StepLR are used.
- Exact augmentation schedule (probability p, per-sample vs. batch) as long as Gaussian noise and relative-distance preservation are maintained.
- Exact evaluation metrics and logging format as long as validation loss is the selection criterion.
- Exact CLI argument parsing and configuration profiles as long as `.env` values are readable.

---

*Discussion Log: Phase 04-ML Dataset and Transformer Prep*
*Completed: 2026-05-15*
