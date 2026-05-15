---
phase: 04-ml-dataset-and-transformer-prep
plan: 04-01
title: ML Package Infrastructure Setup
one_liner: "ML package with configuration management, canonical feature schema, and test scaffold"
subsystem: python/ml
tags: [ml-foundation, configuration, schema, testing]
depends_on: []
provides: [ml-config, feature-schema, test-fixtures]
affects: [04-02, 04-03, 04-04, 04-05]
tech_stack:
  added:
    - python/ml/ package initialization
    - Configuration dataclass with load_config() factory
    - Feature schema documentation (44 features)
    - Test fixtures with deterministic 256x44 matrices
    - Test scaffold with 6 placeholder tests
  patterns:
    - Dataclass-based configuration management
    - Environment variable reading with pathlib for cross-platform paths
    - Deterministic fixture generation with fixed seeds (numpy, torch)
    - Pytest fixtures and skip markers for placeholder tests
duration: 15 minutes
completed_date: 2026-05-15
---

# Phase 04 Plan 01: ML Package Infrastructure Setup - Summary

Successfully created the foundational ML infrastructure for Phase 4. All 2 tasks completed with 2 commits.

## Objective

Set up ML package infrastructure: configuration management, feature schema documentation, test fixtures, and test scaffold. This wave establishes the foundation for dataset loading (Wave 2), augmentation (Wave 2), model architecture (Wave 3), and training (Wave 4).

Purpose: Fast test feedback cycles, deterministic configuration, and shared understanding of the 44-feature schema across all downstream tasks.

## Tasks Completed

### Task 1: Create ML package, config, and feature schema documentation

**Status:** Complete

**Artifacts Created:**
1. `python/ml/__init__.py` — Package initialization with docstring
2. `python/ml/config.py` — Configuration management system
3. `python/ml/FEATURE_SCHEMA.md` — Canonical feature documentation

**Details:**

**python/ml/__init__.py:**
- Created as a proper Python package with comprehensive docstring
- Documents submodules (config, dataset, model, train)
- Exports "config" for downstream use
- Provides version string (__version__ = "0.1.0")

**python/ml/config.py:**
- Implements `Config` dataclass with all required hyperparameters
- Provides `load_config()` factory function that reads from `.env`
- Includes sensible defaults for all 16 configuration parameters:
  - Dataset: DATASET_ID, HF_TOKEN, HF_DATASETS_CACHE
  - Reproducibility: ML_SEED, ML_AUGMENTATION_SCALE
  - Storage: ML_OUTPUT_DIR
  - Training: BATCH_SIZE, LEARNING_RATE, STEP_SIZE, GAMMA, NUM_EPOCHS
  - Model: D_MODEL, NHEAD, NUM_ENCODER_LAYERS, DROPOUT
- Uses pathlib.Path for cross-platform path handling
- Reads HF_DATASETS_CACHE from environment or defaults to `~/.cache/huggingface/datasets`

**python/ml/FEATURE_SCHEMA.md:**
- Comprehensive documentation of all 44 features in canonical order
- Organized into 4 sections:
  - Player State (0-9): Position, orientation, health, armor
  - Weapon and Movement (10-14): Shooting, scope, airborne, weapon, ping
  - Opponent Context (15-29): Mirror of player state for nearest opponent
  - Additional Spatial Features (30-43): Distance metrics, visibility, time features
- Includes 5 critical invariants (fixed order, immutable, zero-padding, augmentation)
- Documents integration points and future versioning strategy

**Verification:**
- ✓ `python -c "from python.ml.config import load_config; cfg = load_config(); assert cfg.BATCH_SIZE == 128"` exits 0
- ✓ File exists: python/ml/__init__.py (non-empty with imports)
- ✓ File exists: python/ml/config.py with load_config() function
- ✓ File exists: python/ml/FEATURE_SCHEMA.md
- ✓ `grep -c "^- [0-9]" python/ml/FEATURE_SCHEMA.md` returns 44
- ✓ Commit: 5749e31 feat(04-01): create ML package, config, and feature schema documentation

### Task 2: Create test fixtures and test scaffold

**Status:** Complete

**Artifacts Created:**
1. `python/fixtures/ml/__init__.py` — Fixtures package initialization
2. `python/fixtures/ml/fixture_data.py` — Deterministic fixture generation
3. `python/tests/test_ml_pipeline.py` — Test scaffold with 6 placeholders

**Details:**

**python/fixtures/ml/__init__.py:**
- Created as a proper Python package for ML test fixtures
- Includes docstring describing purpose and module organization
- Empty __all__ for future exports

**python/fixtures/ml/fixture_data.py:**
- Implements `get_fixture_matrices(n_samples: int = 10)` function
- Returns tuple of (X, y) where:
  - X: torch.Tensor of shape (10, 256, 44) with float32 dtype
  - y: torch.Tensor of shape (10, 1) with float32 suspicion scores in [0.0, 1.0]
- Uses fixed seeds (np.random.seed(42), torch.manual_seed(42)) for deterministic reproduction
- Generates 10 samples by default but parameterizable via n_samples
- Execution time <5 seconds (requirement met)

**python/tests/test_ml_pipeline.py:**
- Implements 6 test functions covering all Phase 4 requirements:
  1. test_dataset_load_hf() — ML-01: HuggingFace dataset loading
  2. test_matrix_conversion() — ML-02: Parquet to 256x44 conversion
  3. test_stratified_split() — ML-03: Stratified 70/15/15 splits
  4. test_augmentation_no_corruption() — ML-04: Gaussian augmentation
  5. test_model_forward_pass() — ML-05: Transformer model architecture
  6. test_training_step() — ML-06: Training loop with MSE/AdamW/StepLR
- All tests use pytest.skip() with descriptive messages
- Includes a fixture_data fixture for test parameterization
- Comprehensive docstrings explaining what each test verifies

**Verification:**
- ✓ File exists: python/fixtures/ml/__init__.py
- ✓ File exists: python/fixtures/ml/fixture_data.py with get_fixture_matrices() function
- ✓ File exists: python/tests/test_ml_pipeline.py with 6 test functions
- ✓ `grep -c "def test_" python/tests/test_ml_pipeline.py` returns 6
- ✓ Files are properly structured and importable
- ✓ Commit: e5e5553 feat(04-01): create test fixtures and test scaffold

## Verification of Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All tasks executed | ✓ PASS | 2 tasks completed with 2 commits |
| Each task committed individually | ✓ PASS | Commit 5749e31 (Task 1), Commit e5e5553 (Task 2) |
| SUMMARY.md created | ✓ PASS | This file created in plan directory |
| ML module imports successfully | ✓ PASS | Config loads without errors |
| Configuration loads without .env | ✓ PASS | Uses all defaults, BATCH_SIZE=128 verified |
| Feature schema with 44 features | ✓ PASS | 44 features documented with units |
| Test file runs (all tests skip gracefully) | ✓ PASS | 6 tests with pytest.skip() markers |
| Fixture data is deterministic | ✓ PASS | Fixed numpy/torch seeds (42) for reproducibility |

## Key Design Decisions

1. **Configuration via Dataclass:** Used Python dataclass for type safety and IDE support
2. **Environment-First Design:** All configuration reads from .env with sensible hardcoded defaults
3. **Cross-Platform Paths:** Pathlib.Path used throughout for Windows/Linux compatibility
4. **Feature Schema Versioning:** Documented approach for versioning if actual CS2CD schema differs
5. **Test Skip Markers:** pytest.skip() used instead of raising NotImplementedError for cleaner test reporting
6. **Deterministic Fixtures:** Fixed numpy/torch seeds ensure reproducibility across runs

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs and Placeholders

The following are intentional placeholders to be filled in by later waves:

| Location | Type | Reason | Future Wave |
|----------|------|--------|-------------|
| python/ml/FEATURE_SCHEMA.md lines 45-48 | Feature schema | Features 30-43 are placeholder mappings for spatial features; exact definitions will be finalized when CS2CD dataset is loaded | Wave 2 (dataset loading) |
| python/tests/test_ml_pipeline.py | Test implementations | 6 test functions use pytest.skip() pending implementation of dataset.py (ML-01-04) and model.py/train.py (ML-05-06) | Waves 2, 3, 4 |
| python/ml/__init__.py lines 11-12 | Module exports | __all__ references "config" only; other modules will be added as implemented | Waves 2, 3, 4 |

## Threat Surface Scan

**New threat surfaces introduced by this task:**

| Threat | File | Mitigation |
|--------|------|-----------|
| HF_TOKEN in environment | config.py | Token read via os.getenv() and never logged (non-secret) — deferred to training phase where token is actually used |
| .env file with credentials | (not created yet) | Must add to .gitignore in Phase 5; template will be in .env.example |

All threats align with plan's threat model (T-04-01 through T-04-05). No new surfaces beyond what was anticipated.

## Integration Points

- **config.py** will be imported by:
  - dataset.py (Wave 2) — for HF_TOKEN, DATASET_ID, HF_DATASETS_CACHE
  - train.py (Wave 4) — for BATCH_SIZE, LEARNING_RATE, NUM_EPOCHS, D_MODEL, etc.
  - augmentation.py (Wave 2) — for ML_AUGMENTATION_SCALE
  
- **FEATURE_SCHEMA.md** is referenced by:
  - dataset.py (Wave 2) — canonical feature ordering
  - model.py (Wave 3) — input embedding layer expects 44 features
  - augmentation.py (Wave 2) — per-feature variance calculation

- **fixture_data.py** will be used by:
  - All tests in test_ml_pipeline.py (this wave and future waves)
  - Integration tests that verify shape contracts without external dependencies

## Next Steps

Wave 2 (04-02): Dataset loading
- Implement python/ml/dataset.py with load_cs2cd_dataset(), convert_to_matrix(), create_stratified_splits()
- Implement python/ml/augmentation.py with GaussianAugmentation class
- Replace ML-01 through ML-04 test placeholders with actual test implementations
- Verify CS2CD schema matches FEATURE_SCHEMA.md; update if needed

Wave 3 (04-03): Model architecture
- Implement python/ml/model.py with AntiCheatTransformer class
- Replace ML-05 test placeholder with actual test
- Verify model accepts (batch_size, 256, 44) and outputs (batch_size, 1) with sigmoid

Wave 4 (04-04): Training loop
- Implement python/ml/train.py with training entrypoint
- Replace ML-06 test placeholder with actual test
- Verify MSE loss, AdamW optimizer, StepLR scheduler, best-model checkpointing

---

**Summary by:** Claude Haiku 4.5
**Date:** 2026-05-15
**Plan execution time:** 15 minutes
**Commits:** 2 (5749e31, e5e5553)
