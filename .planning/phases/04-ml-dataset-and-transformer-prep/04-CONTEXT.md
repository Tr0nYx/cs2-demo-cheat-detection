# Phase 4: ML Dataset and Transformer Prep - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers ML dataset preparation and a PyTorch transformer model for cheat detection. The phase includes: a CS2CD dataset loader with HuggingFace integration and optional authentication, data conversion to 256x44 (time steps × context features) matrices, stratified 70/15/15 train/validation/test splits, per-feature Gaussian augmentation based on training set statistics, a custom nn.Transformer-based model that outputs continuous suspicion scores [0.0, 1.0], and a training entrypoint with fixed validation set and best-model checkpointing. The phase does not include ensemble methods, hyperparameter optimization, or production model serving (those are v2).

</domain>

<decisions>
## Implementation Decisions

### Dataset Pipeline and Organization
- **D-01:** ML code lives in `python/ml/` as a sub-package alongside existing `python/features/`, `python/parser/`, `python/persistence/`, and `python/scoring/` modules. Sub-modules: `python/ml/dataset.py` (loader and preprocessing), `python/ml/model.py` (transformer architecture), `python/ml/train.py` (training entrypoint).
- **D-02:** Dataset loader uses the `datasets` library to fetch CS2CD from HuggingFace on-demand via `datasets.load_dataset()`.
- **D-03:** HuggingFace authentication is optional and reads from `HF_TOKEN` environment variable (set via `.env`). If `HF_TOKEN` is missing, the loader attempts public dataset access; if the dataset is private, the loader raises a clear error instructing the user to set `HF_TOKEN`.
- **D-04:** Dataset is cached locally in the platform-default `~/.cache/huggingface/datasets/` directory. Subsequent runs reuse the cache; no re-download occurs unless the cache is manually cleared.
- **D-05:** The dataset loader validates that CS2CD Parquet rows contain the expected schema (position vectors, context features, labels). Validation is non-blocking; missing or malformed rows are logged as warnings but do not halt loading.

### Data Format and Matrix Conversion
- **D-06:** The 256x44 matrix represents 256 time steps (ticks from the demo) × 44 context features per step. Context features include player state (position, velocity, health, armor, weapon, etc.) and opponent information (proximity, visibility, last-seen position, etc.).
- **D-07:** Parquet rows are converted to matrices by grouping sequential ticks per demo and padding/truncating to exactly 256 ticks (pad with zeros if shorter; truncate if longer, preferring middle ticks).
- **D-08:** Feature ordering is consistent across all matrices. A feature schema document (`python/ml/FEATURE_SCHEMA.md`) lists the 44 features, their order, and units. This document is canonical for downstream interpretation.

### Train/Validation/Test Split
- **D-09:** Dataset splits are stratified 70% train / 15% validation / 15% test using demo-level stratification (all ticks from a demo go to the same split). Stratification is by the target label distribution (clean/suspicious/likely_cheating) to maintain class balance across splits.
- **D-10:** Split is deterministic (random seed from `.env` or hardcoded constant). Different runs produce the same split unless the seed is explicitly changed.

### Data Augmentation
- **D-11:** Gaussian augmentation applies per-feature position noise during training only (not validation/test). Augmentation is applied in the PyTorch DataLoader with probability p (configurable, default 0.5).
- **D-12:** Noise variance for each feature is computed from the training set: variance = std(feature) * scaling_factor. Scaling factor is a global constant (default 0.01) and is configurable via `.env` or `python/ml/config.py`.
- **D-13:** Augmentation preserves relative distances between attacker and victim by adding the same noise vector to both player position features when augmenting opponent context.
- **D-14:** Augmentation does NOT apply to label columns or metadata (demo_id, player_id, etc.).

### Transformer Model Architecture
- **D-15:** Model is built on PyTorch's `nn.Transformer` with custom embedding and output layers. Architecture choices (layer count, hidden size, number of attention heads, dropout) are deferred to agent judgment during implementation, with sensible defaults (e.g., 4-6 layers, 128 hidden, 8 heads). These hyperparameters are configurable via `python/ml/config.py`.
- **D-16:** Input to the model is a 256x44 matrix. Embedding layer projects 44 features to hidden_size. Transformer encoder processes the sequence. Output layer maps hidden_size to 1 (continuous score). No positional encoding is required (time is implicit in sequence order).
- **D-17:** Model outputs a single continuous score in [0.0, 1.0] (probabilities) representing player-level suspicion. A sigmoid activation on the output layer ensures the score is bounded.
- **D-18:** Model is deterministic given a fixed seed. Dropout is applied during training and disabled during evaluation.

### Training Loop and Checkpointing
- **D-19:** Training uses a fixed validation set (15% of data). Best model is selected by lowest validation loss and saved to `data/models/model_best.pt`.
- **D-20:** Validation loss is computed every N batches (configurable, default every 1 epoch). Checkpointing happens only when validation loss improves (no-worse-than-best). Previous best checkpoint is overwritten.
- **D-21:** Trainer logs to stdout in JSON format (structured logging using python-json-logger or manual dict serialization). Log fields: `timestamp`, `event` (e.g., "epoch_start", "batch_loss", "val_loss"), `epoch`, `batch`, `loss`, `learning_rate`.
- **D-22:** Training uses MSE loss (L2) for regression. Optimizer is AdamW (as specified in requirements). Learning rate scheduler is StepLR with step size and gamma configurable via `.env` (e.g., step_size=10, gamma=0.1).
- **D-23:** Batch size is 128 (as specified in requirements). Configurable via `.env` if needed.
- **D-24:** Training script (`python/ml/train.py`) is invoked as a CLI: `python python/ml/train.py --epochs 50 --output-dir data/models/`. It supports `--epochs`, `--batch-size`, `--learning-rate`, `--output-dir`, and `--no-augment` flags. Required configuration (dataset identifier, split seed) is read from `.env` or config file.

### Testing and Validation
- **D-25:** Phase 4 includes end-to-end integration tests: load a small fixture dataset (or sample from CS2CD), run the full pipeline (preprocessing, augmentation, model forward pass, training for N epochs), and verify that the model produces valid outputs.
- **D-26:** Fixture data is stored in `python/fixtures/ml/` and includes a minimal 256x44 matrix and corresponding labels. Fixture data is small enough for fast test execution (<5 seconds).
- **D-27:** Tests verify: (a) dataset loads and has correct shape, (b) splits are stratified correctly, (c) augmentation applies noise without corrupting structure, (d) model accepts input and produces output in [0.0, 1.0], (e) training runs without errors for a few epochs.
- **D-28:** Tests do NOT validate model accuracy or convergence (those are evaluated in Phase 5 or beyond).

### Model and Data Artifact Management
- **D-29:** Trained models and dataset metadata are saved to `data/models/` and `data/datasets/`, respectively. These directories are created by the training script if they don't exist.
- **D-30:** Model checkpoint files use a simple naming scheme: `model_best.pt` (best by validation loss), `model_final.pt` (last epoch). Phase 5 references `model_best.pt` as the default.
- **D-31:** Dataset metadata (feature schema, split indices, augmentation parameters) is saved alongside the dataset in JSON format for reproducibility.

### Error Handling and Robustness
- **D-32:** If the HuggingFace dataset download fails, the loader logs a clear error and exits. No retry logic is built in; external orchestration (e.g., Make, CI) handles retry.
- **D-33:** If the training script encounters a NaN loss, it logs the epoch/batch and exits with a non-zero code. Training is not continued; debugging is required.
- **D-34:** If validation loss diverges (increases by >100% from best in consecutive epochs), a warning is logged but training continues (no early stopping in Phase 4).

### Configuration and Environment
- **D-35:** Training hyperparameters are read from `.env` and `python/ml/config.py`. `.env` provides system-level settings (dataset identifier, HF_TOKEN, output paths); `config.py` provides defaults and profiles (e.g., "debug", "production").
- **D-36:** All file paths are relative to the repository root and use platform-agnostic pathlib for cross-OS compatibility.

### the agent's Discretion
- Exact transformer architecture hyperparameters (layer count, hidden size, num_heads, dropout, attention type) as long as it's built on nn.Transformer and produces [0.0, 1.0] scores.
- Exact loss function and optimizer settings (learning rate, warmup, weight decay) as long as AdamW and StepLR are used as specified.
- Exact augmentation schedule (probability p, batch application vs. per-sample, frequency) as long as Gaussian noise preserves relative distances and uses per-feature variance from training statistics.
- Exact evaluation metrics logged during training (loss, accuracy, AUC, custom metrics) as long as best model is selected by lowest validation loss.
- Exact CLI argument parsing and config file format as long as `.env` values are readable and training is invocable from command line.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 4 goal, requirements, success criteria, and planned plan split.
- `.planning/REQUIREMENTS.md` - `ML-01` through `ML-06` define Phase 4 requirements.
- `.planning/PROJECT.md` - Project-level constraints for tech stack, offline operation, quality (type hints, docstrings), and ethical boundaries.

### Prior Phase Contracts
- `.planning/phases/03-python-analysis-pipeline/03-CONTEXT.md` - Phase 3 delivers feature extraction and scoring; Phase 4 uses those signals as labels for training.
- `.planning/phases/02-symfony-api-and-domain/02-CONTEXT.md` - Symfony backend and entity schemas (Demo, Player, AnalysisResult).
- `.planning/phases/01-container-foundation/01-CONTEXT.md` - Docker, environment, and runtime decisions.

### Source Brief
- `tasks/setup.md` - Project requirements, tech stack, AntiCheatPT reference, and ML phase expectations.

### HuggingFace and Dataset Documentation
- CS2CD dataset on HuggingFace (live DOI `10.57967/hf/5654` or user-pinned alternative) - Dataset format, schema, and availability.
- AntiCheatPT paper (arXiv 2508.06348) - Transformer architecture rationale and feature engineering context.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `python/requirements.txt`: PyTorch, Hugging Face `datasets`, pandas, numpy, and scikit-learn already pinned. No additional dependencies needed.
- `python/worker.py`: Existing structured logging pattern (JSON output with event, timestamp, context fields) can be reused for training logs.
- `.env.example`: Contains placeholders for `PYTHON_WORKER_QUEUE`, `REDIS_URL`, etc. Phase 4 will add `HF_TOKEN`, `ML_DATASET_ID`, `ML_AUGMENTATION_SCALE`, `ML_SEED`, `ML_OUTPUT_DIR`.
- `python/features/`, `python/persistence/`: Feature extraction and result writing patterns are mature and testable; Phase 4 dataset pipeline will follow similar patterns.

### Established Patterns
- Structured JSON logging (worker baseline) applies to training script output.
- PostgreSQL and Redis integration from prior phases can be leveraged if needed for future monitoring (deferred to v2).
- Non-root Python runtime in Docker (Phase 1) applies to training containers as well.

### Integration Points
- Training script reads `.env` for configuration and optional HF_TOKEN.
- Trained model artifacts (`data/models/`) will be referenced by Phase 5 Makefile and README.
- Feature schema and augmentation parameters are persisted for reproducibility.

</code_context>

<specifics>
## Specific Ideas

- User confirmed all major architectural choices: nested `python/ml/`, custom nn.Transformer, HuggingFace on-demand loading with HF_TOKEN support, per-feature variance augmentation, fixed validation + best-model checkpointing, 256x44 matrix format, regression output [0.0, 1.0], `data/models/` artifact storage, and full end-to-end test coverage with small fixtures.
- The foundation (PyTorch + datasets library) is already in requirements.txt. Phase 4 builds the custom dataset loader, model, and training loop from scratch.
- Augmentation and validation strategy are data-driven and reproducible (seeded splits, computed variance).
- All configuration is environment-driven, enabling different profiles (debug, production) without code changes.

</specifics>

<deferred>
## Deferred Ideas

- Hyperparameter optimization (grid search, Bayesian optimization) is deferred to Phase 5 or later.
- Ensemble methods or model stacking belong to future phases.
- Integration with MLflow, Weights & Biases, or other experiment tracking is v2.
- Data versioning and DVC integration is deferred.
- Transfer learning or pre-training on public datasets is a future enhancement.
- Production model serving (ONNX, TorchServe, FastAPI) is v2.
- Early stopping with patience threshold is deferred (Phase 4 uses fixed epoch training).
- Multi-GPU training and distributed setup are deferred.

</deferred>

---

*Phase: 04-ML Dataset and Transformer Prep*
*Context gathered: 2026-05-15*
