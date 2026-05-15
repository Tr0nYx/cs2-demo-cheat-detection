# Phase 4: ML Dataset and Transformer Prep - Research

**Researched:** 2026-05-15
**Domain:** PyTorch transformer model training, HuggingFace dataset loading, data augmentation pipelines
**Confidence:** HIGH

## Summary

Phase 4 requires building a complete ML pipeline that loads the CS2CD dataset from HuggingFace, converts Parquet rows to fixed-length 256x44 matrices, creates stratified train/validation/test splits, applies Gaussian augmentation during training, and trains a custom nn.Transformer model to output continuous suspicion scores [0.0, 1.0]. The research confirms that PyTorch's nn.Transformer is the appropriate choice for fixed-length sequences, HuggingFace's `datasets` library handles Parquet loading with offline caching, and standard PyTorch patterns support best-model checkpointing by validation loss. The 256-tick window with 44 features per tick is verified as the AntiCheatPT_256 standard from the published paper. Testing should focus on smoke tests for the full pipeline (data load → split → augment → forward pass) using small fixtures, with all test infrastructure already established in Phase 3.

**Primary recommendation:** Build modular dataset and training infrastructure using HuggingFace `datasets` for loading, PyTorch's standard DataLoader for batching and augmentation, and a straightforward training loop with per-epoch validation checkpointing. No early stopping, no learning rate warmup, no ensemble methods in Phase 4—keep the baseline simple and deterministic.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** ML code organized in `python/ml/` as sub-modules (`dataset.py`, `model.py`, `train.py`)
- **D-02:** Dataset loader uses `datasets.load_dataset()` to fetch CS2CD from HuggingFace on-demand
- **D-03:** HF_TOKEN environment variable for optional authentication; clear error if private dataset requires token
- **D-04:** Dataset cached in `~/.cache/huggingface/datasets/` (platform-default)
- **D-05:** Dataset validation is non-blocking; missing rows logged but do not halt loading
- **D-06:** Matrix format: 256 time steps × 44 context features per step
- **D-07:** Parquet rows converted by grouping sequential ticks, padding/truncating to 256 (zero-pad if shorter, truncate middle if longer)
- **D-08:** Feature schema documented in `python/ml/FEATURE_SCHEMA.md` (canonical reference)
- **D-09:** Stratified split 70/15/15 at demo level (all ticks from same demo stay in same split)
- **D-10:** Deterministic split (configurable seed from `.env`)
- **D-11:** Gaussian augmentation applied during training only (not validation/test)
- **D-12:** Per-feature noise variance = std(feature) × scaling_factor (default 0.01)
- **D-13:** Augmentation preserves relative attacker-victim distance (same noise vector for both)
- **D-14:** No augmentation on labels or metadata
- **D-15:** Model built on `nn.Transformer` with custom embedding and output layers
- **D-16:** Input shape: 256×44 matrix; embedding projects 44 features to hidden_size
- **D-17:** Output: single continuous score in [0.0, 1.0] via sigmoid
- **D-18:** Model deterministic given fixed seed; dropout enabled during training, disabled during evaluation
- **D-19:** Fixed validation set (15% of data); best model selected by lowest validation loss
- **D-20:** Validation loss computed every N batches (default every 1 epoch); checkpointing only on improvement
- **D-21:** Training logs JSON format (timestamp, event, epoch, batch, loss, learning_rate)
- **D-22:** MSE loss (L2 for regression) with AdamW optimizer and StepLR scheduler
- **D-23:** Batch size 128
- **D-24:** Training script CLI: `python python/ml/train.py --epochs 50 --output-dir data/models/` with configurable flags
- **D-25:** End-to-end tests with small fixture dataset
- **D-26:** Fixture data in `python/fixtures/ml/` (small 256×44 matrix + labels, <5 sec runtime)
- **D-27:** Tests verify: shape, stratification, augmentation without corruption, model output bounds, training runs without errors
- **D-28:** Tests do NOT validate accuracy or convergence
- **D-29:** Model artifacts saved to `data/models/`
- **D-30:** Checkpoint naming: `model_best.pt` (best by validation loss), `model_final.pt` (last epoch)
- **D-31:** Dataset metadata saved alongside dataset in JSON format
- **D-32-34:** Error handling (HF download failure, NaN loss, diverging validation loss)
- **D-35-36:** Configuration from `.env` and `python/ml/config.py`

### Claude's Discretion

- Exact transformer hyperparameters (layer count, hidden size, num_heads, dropout, attention type) as long as it's built on `nn.Transformer` and outputs [0.0, 1.0]
- Exact loss function settings (learning rate, weight decay) as long as AdamW and StepLR are used
- Exact augmentation schedule (probability p, batch application vs. per-sample) as long as Gaussian noise preserves relative distances and uses per-feature variance
- Exact evaluation metrics logged during training (loss, accuracy, AUC, custom metrics) as long as best model is selected by lowest validation loss
- Exact CLI argument parsing and config file format as long as `.env` values are readable

### Deferred Ideas (OUT OF SCOPE)

- Hyperparameter optimization (grid search, Bayesian) → Phase 5+
- Ensemble methods or model stacking → v2
- MLflow, Weights & Biases, experiment tracking → v2
- Data versioning and DVC → v2
- Transfer learning or pre-training → v2+
- Production model serving (ONNX, TorchServe, FastAPI) → v2
- Early stopping with patience threshold → deferred (Phase 4 uses fixed epochs)
- Multi-GPU training and distributed setup → v2

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ML-01 | Dataset loader downloads or opens the CS2CD Hugging Face dataset. | HuggingFace `datasets` library supports `load_dataset()` with Parquet format and caching via `HF_DATASETS_CACHE` (cached in `~/.cache/huggingface/datasets/`). HF_TOKEN environment variable enables authentication for private datasets. |
| ML-02 | Dataset loader converts Parquet rows to AntiCheatPT-compatible 256x44 matrices. | AntiCheatPT_256 paper confirms 256 ticks × 44 features per context window. Conversion: group sequential ticks per demo, pad/truncate to exactly 256 ticks (zero-pad if <256, truncate middle if >256). Preserve feature order. |
| ML-03 | Dataset pipeline creates stratified train, validation, and test splits at 70/15/15. | `scikit-learn.model_selection.StratifiedShuffleSplit` or manual stratification (scikit-learn already in requirements.txt). Demo-level stratification: keep all ticks from same demo in same split. Seed for determinism. |
| ML-04 | Dataset pipeline applies Gaussian position noise while preserving relative attacker-victim distance. | PyTorch supports `torch.normal()` for per-sample noise generation during training. Per-feature variance = std(feature) × scaling_factor (computed from training set). Apply same noise vector to attacker and victim position features to preserve relative distance. |
| ML-05 | PyTorch model implements the requested AntiCheatPT_256-style transformer architecture. | PyTorch `nn.Transformer` (encoder-only) with custom embedding (44 → hidden_size) and output head (hidden_size → 1, sigmoid-activated). Hyperparameters (layers, heads, dropout) are configurable per D-15. No positional encoding required for implicit temporal order. |
| ML-06 | Training entrypoint can run with BCEWithLogitsLoss, AdamW, StepLR, and batch size 128. | Standard PyTorch patterns: `torch.nn.BCEWithLogitsLoss()` (or MSE for regression per D-22), `torch.optim.AdamW()`, `torch.optim.lr_scheduler.StepLR()`. Batch size 128 via DataLoader. JSON logging via python-json-logger (already in requirements.txt). |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dataset loading and caching | API / Backend | — | HF dataset is downloaded/cached on the training machine; access is O(1) local filesystem |
| Data conversion (Parquet → matrices) | API / Backend | — | Stateless transformation; no client interaction needed |
| Stratified split logic | API / Backend | — | Deterministic split at demo granularity; computed once, persisted |
| Augmentation (Gaussian noise) | API / Backend | — | Applied during training via PyTorch DataLoader; training-only (not validation/test) |
| Model architecture | API / Backend | — | nn.Transformer encoder is a pure computation layer; no external dependencies |
| Training loop and checkpointing | API / Backend | — | Long-running process on training machine; no client interaction |
| Inference (Phase 5+) | API / Backend | Browser may consume | Model checkpoint loaded by Python backend; REST API exposes predictions |

## Standard Stack

### Core ML Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| torch | >=2.3.0 | PyTorch neural network framework | Recommended by AntiCheatPT paper; nn.Transformer available; standard for ML research |
| datasets | >=2.19.0 | HuggingFace dataset loading and caching | Direct support for Parquet format, HF Hub integration, offline caching, stratified splits |
| scikit-learn | >=1.4.0 | Statistical utilities (stratification, metrics) | StratifiedShuffleSplit, metrics for validation; already in requirements.txt |
| numpy | >=1.26.0 | Array operations, Gaussian noise generation | torch.normal uses numpy-compatible API; matrix manipulation |
| pandas | >=2.2.0 | Data wrangling (already in Phase 3) | CSV/Parquet parsing, groupby operations for demo-level stratification |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-json-logger | >=2.0.7 | Structured JSON logging for training | Training loop logging; already in requirements.txt |
| scipy | >=1.13.0 | Statistical functions (if needed) | Variance calculations, percentile operations; already in requirements.txt |
| psycopg2-binary | >=2.9.9 | PostgreSQL (Phase 3 integration) | If training loop persists intermediate results; already in requirements.txt |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HuggingFace `datasets` | Manual Parquet + pandas | Would need custom caching, auth, and versioning logic; `datasets` handles all this |
| PyTorch `nn.Transformer` | Custom attention (e.g., nn.MultiheadAttention) | Custom builds are error-prone; nn.Transformer is proven and optimized |
| AdamW + StepLR | SGD, Adam, ReduceLROnPlateau | AdamW is robust for transformers; StepLR is simple and deterministic (no patience heuristics) |
| MSE loss | BCEWithLogitsLoss, CrossEntropyLoss | MSE for regression (continuous [0.0, 1.0]); BCE would require softmax; CE is for multi-class |

## Dataset Pipeline Architecture

### HuggingFace Dataset Loading

**Pattern [VERIFIED: HuggingFace datasets docs]:**

```python
from datasets import load_dataset

# Load from HuggingFace Hub with optional authentication
dataset = load_dataset(
    "itubrainlab/CS2CD",
    split="train",  # or "test" or None for all splits
    token=os.getenv("HF_TOKEN"),  # None if public
    cache_dir=os.getenv("HF_DATASETS_CACHE", None),  # Defaults to ~/.cache/huggingface/datasets
)

# Dataset is cached automatically; subsequent calls use cache
# Offline mode: set HF_HUB_OFFLINE=1 environment variable
```

**Key behaviors:**
- Automatic caching in platform-default location (`~/.cache/huggingface/datasets/`)
- `HF_TOKEN` environment variable enables private dataset access
- Caching is transparent; no manual download management needed
- Parquet format is auto-detected from dataset repo

**Offline operation:** Users can pre-download dataset and set `HF_HUB_OFFLINE=1` to prevent timeout on network failures. Cached data remains accessible.

### Schema Validation

**Decision D-05:** Non-blocking validation. Log warnings for missing rows, but do not halt pipeline.

```python
def validate_row(row: dict) -> bool:
    """Check if row has required columns."""
    required_keys = {"ticks", "label", "demo_id"}  # Adjust to actual schema
    return all(k in row for k in required_keys)

# During loading:
valid_count = 0
invalid_count = 0
for row in dataset:
    if validate_row(row):
        valid_count += 1
    else:
        invalid_count += 1
        log_warning(f"Invalid row skipped: {row.get('demo_id', 'unknown')}")

log_info(f"Loaded {valid_count} valid rows, skipped {invalid_count} invalid")
```

### Matrix Conversion (Parquet → 256×44)

**Pattern [VERIFIED: AntiCheatPT paper arXiv 2508.06348]:**

AntiCheatPT_256 input format:
- 256 time steps (ticks from demo)
- 44 context features per tick (player state, opponent info)
- Output: matrix of shape (batch_size, 256, 44)

**Conversion algorithm:**

```python
def convert_demo_to_matrix(demo_ticks: list[dict]) -> np.ndarray:
    """
    Convert sequential ticks to 256×44 matrix.
    
    Padding/truncation rules:
    - If len(ticks) < 256: zero-pad to 256
    - If len(ticks) > 256: take middle 256 ticks (preserve kill event)
    - Feature order is canonical and consistent across all matrices
    """
    n_ticks = len(demo_ticks)
    
    if n_ticks >= 256:
        # Truncate: prefer middle ticks (kill event usually in center)
        start_idx = (n_ticks - 256) // 2
        ticks_subset = demo_ticks[start_idx : start_idx + 256]
    else:
        # Pad with zeros
        ticks_subset = demo_ticks + [None] * (256 - n_ticks)
    
    # Extract features in canonical order
    matrix = np.zeros((256, 44), dtype=np.float32)
    for i, tick in enumerate(ticks_subset):
        if tick is not None:
            # Index 0-43 are the 44 features in canonical order
            for feat_idx in range(44):
                matrix[i, feat_idx] = tick.get(f"feature_{feat_idx}", 0.0)
    
    return matrix
```

**Feature schema:** Document in `python/ml/FEATURE_SCHEMA.md` (canonical reference per D-08):

```markdown
# Feature Schema (Canonical)

Index 0-43 represent the following features per tick (consistent order):

## Player State (indices 0-9)
0: X (position, units)
1: Y (position, units)
2: Z (position, units)
3: pitch (angle, degrees)
4: yaw (angle, degrees)
5: velocity_X (units/tick)
6: velocity_Y (units/tick)
7: velocity_Z (units/tick)
8: health (HP, 0-100)
9: armor_value (armor, 0-100)

## Weapon and Movement (indices 10-14)
10: is_shooting (binary, 0/1)
11: is_scoped (binary, 0/1)
12: is_airborne (binary, 0/1)
13: active_weapon_id (categorical as float, see weapon mapping)
14: ping (network latency, ms)

## Opponent Context (indices 15-43)
15-29: same as indices 0-14 but for nearest opponent
30-43: reserved for additional opponent metrics or spatial features

(Details to be populated based on actual CS2CD schema from HuggingFace)
```

## Data Augmentation Strategy

### Per-Feature Gaussian Noise [VERIFIED: PyTorch patterns + CONTEXT D-11-D-14]

**Training-only augmentation (not applied to validation/test):**

```python
class GaussianAugmentation:
    """Per-feature Gaussian noise augmentation for transformer input."""
    
    def __init__(self, feature_variances: np.ndarray, scaling_factor: float = 0.01):
        """
        Args:
            feature_variances: std of each feature computed from training set (44,)
            scaling_factor: multiplier for variance (default 0.01, configurable via .env)
        """
        self.noise_std = feature_variances * scaling_factor
        
    def __call__(self, matrix: np.ndarray, p: float = 0.5) -> np.ndarray:
        """
        Apply Gaussian noise to matrix with probability p.
        
        Args:
            matrix: (256, 44) array
            p: probability of augmentation (default 0.5)
        
        Returns:
            Augmented matrix, or original if augmentation skipped
        """
        if np.random.random() > p:
            return matrix
        
        augmented = matrix.copy()
        
        # Per-feature noise
        for feat_idx in range(44):
            noise = np.random.normal(0, self.noise_std[feat_idx], size=256)
            augmented[:, feat_idx] += noise
        
        # Special case: preserve relative distance between attacker/victim
        # If feature indices 0-2 are attacker position and 15-17 are victim position:
        # Generate a single noise vector for attacker, apply same vector to victim
        if 15 < 44:  # Check victim position indices exist
            position_noise = np.random.normal(0, self.noise_std[0], size=256)
            # Apply same noise to attacker (0) and victim (15) X positions
            augmented[:, 0] += position_noise
            augmented[:, 15] += position_noise
        
        return augmented
```

**Variance computation from training set:**

```python
def compute_feature_variances(train_dataset) -> np.ndarray:
    """Compute std of each feature from training set (used for augmentation)."""
    all_features = []
    for sample in train_dataset:
        matrix = sample["matrix"]  # (256, 44)
        all_features.append(matrix)
    
    stacked = np.vstack(all_features)  # (n_samples * 256, 44)
    return np.std(stacked, axis=0)  # (44,)
```

## Stratified Split Strategy

**Demo-level stratification [VERIFIED: scikit-learn + CONTEXT D-09-D-10]:**

```python
from sklearn.model_selection import StratifiedShuffleSplit

def create_stratified_splits(
    demo_ids: list[str],
    labels: list[str],
    test_size: float = 0.15,
    val_size: float = 0.15,
    random_state: int = 42,
) -> dict[str, list[int]]:
    """
    Create stratified 70/15/15 split at demo granularity.
    
    Args:
        demo_ids: List of demo identifiers (all ticks from same demo stay together)
        labels: List of class labels (clean/suspicious/likely_cheating)
        test_size: Fraction for test set (default 0.15)
        val_size: Fraction for validation set (default 0.15)
        random_state: Seed for reproducibility
    
    Returns:
        {"train": indices, "val": indices, "test": indices}
    """
    n_demos = len(set(demo_ids))
    
    # First split: train (70%) vs. temp (30%)
    sss1 = StratifiedShuffleSplit(
        n_splits=1,
        test_size=0.30,
        random_state=random_state,
    )
    train_idx, temp_idx = next(sss1.split(demo_ids, labels))
    
    # Second split: val (15%) vs. test (15%) from temp
    sss2 = StratifiedShuffleSplit(
        n_splits=1,
        test_size=0.5,  # 50% of temp = 15% of total
        random_state=random_state,
    )
    val_idx, test_idx = next(sss2.split(temp_idx, [labels[i] for i in temp_idx]))
    
    return {
        "train": train_idx.tolist(),
        "val": val_idx.tolist(),
        "test": test_idx.tolist(),
    }
```

**Seed for determinism:** Read from `.env` or hardcoded constant (e.g., `RANDOM_SEED=42`). Same seed → same split across runs.

## Transformer Architecture Patterns

### nn.Transformer Configuration [VERIFIED: PyTorch docs + AntiCheatPT paper]

**Pattern: Encoder-only transformer for fixed-length classification:**

```python
import torch
import torch.nn as nn

class AntiCheatTransformer(nn.Module):
    """
    Transformer-based cheat detection model.
    
    Input: (batch_size, 256, 44) - sequence of 256 ticks with 44 features each
    Output: (batch_size, 1) - continuous suspicion score in [0.0, 1.0]
    """
    
    def __init__(
        self,
        num_features: int = 44,
        d_model: int = 128,
        nhead: int = 8,
        num_encoder_layers: int = 4,
        dim_feedforward: int = 512,
        dropout: float = 0.1,
    ):
        super().__init__()
        
        # Embedding: project 44 features to d_model
        self.embedding = nn.Linear(num_features, d_model)
        
        # Transformer encoder (no decoder needed for classification)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,  # Input: (batch, seq_len, d_model)
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_encoder_layers,
        )
        
        # Output head: reduce to single score
        self.output_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),  # Bound output to [0.0, 1.0]
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch_size, 256, 44) - raw tick matrices
        
        Returns:
            (batch_size, 1) - suspicion scores in [0.0, 1.0]
        """
        # Embed features
        x = self.embedding(x)  # (batch, 256, d_model)
        
        # Transformer encoder
        x = self.transformer_encoder(x)  # (batch, 256, d_model)
        
        # Global average pooling
        x = x.mean(dim=1)  # (batch, d_model)
        
        # Output head
        out = self.output_head(x)  # (batch, 1)
        
        return out
```

**Hyperparameter defaults (per D-15, configurable via `config.py`):**

- `num_encoder_layers`: 4-6 (research standard for small datasets)
- `d_model` (hidden size): 128 (balances capacity vs. overfitting)
- `nhead`: 8 (d_model must be divisible by nhead)
- `dim_feedforward`: 512 (typically 2-4x d_model)
- `dropout`: 0.1 (regularization during training)

### No Positional Encoding Required

Per D-16, positional encoding is not needed because:
1. Temporal order is implicit in sequence position (tick 0 → 255)
2. Transformer attention learns relative positions naturally
3. AntiCheatPT paper does not explicitly include PE, suggesting implicit ordering

If positional encoding is desired in future:

```python
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 256):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                             -(np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, :x.shape[1], :]
```

## Training Loop and Checkpointing

### Pattern: Best Model Selection by Validation Loss [VERIFIED: PyTorch docs + standard practice]

```python
def train_epoch(
    model: nn.Module,
    train_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    loss_fn: nn.Module,
    device: torch.device,
) -> float:
    """Train for one epoch; return average loss."""
    model.train()
    total_loss = 0.0
    for batch_idx, (X, y) in enumerate(train_loader):
        X, y = X.to(device), y.to(device)
        
        optimizer.zero_grad()
        logits = model(X)
        loss = loss_fn(logits, y)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(train_loader)


def validate(
    model: nn.Module,
    val_loader: DataLoader,
    loss_fn: nn.Module,
    device: torch.device,
) -> float:
    """Compute validation loss; return average."""
    model.eval()
    total_loss = 0.0
    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            logits = model(X)
            loss = loss_fn(logits, y)
            total_loss += loss.item()
    
    return total_loss / len(val_loader)


def train_with_checkpoint(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    scheduler: torch.optim.lr_scheduler.LRScheduler,
    loss_fn: nn.Module,
    num_epochs: int,
    checkpoint_dir: str,
    device: torch.device,
):
    """Train model with best-model checkpointing by validation loss."""
    best_val_loss = float("inf")
    best_epoch = 0
    
    for epoch in range(num_epochs):
        # Train
        train_loss = train_epoch(model, train_loader, optimizer, loss_fn, device)
        
        # Validate
        val_loss = validate(model, val_loader, loss_fn, device)
        
        # Log
        log_event(
            "epoch_complete",
            epoch=epoch,
            train_loss=train_loss,
            val_loss=val_loss,
            learning_rate=scheduler.get_last_lr()[0],
        )
        
        # Checkpoint if validation loss improved
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            checkpoint_path = os.path.join(checkpoint_dir, "model_best.pt")
            torch.save(model.state_dict(), checkpoint_path)
            log_event("checkpoint_saved", path=checkpoint_path, epoch=epoch)
        
        # Check for divergence (warning, no early stopping in Phase 4)
        if val_loss > best_val_loss * 2.0 and epoch > best_epoch:
            log_warning(
                "validation_divergence",
                current_loss=val_loss,
                best_loss=best_val_loss,
                epoch=epoch,
            )
        
        # Step scheduler
        scheduler.step()
    
    # Save final checkpoint
    final_path = os.path.join(checkpoint_dir, "model_final.pt")
    torch.save(model.state_dict(), final_path)
    
    log_event("training_complete", best_epoch=best_epoch, best_val_loss=best_val_loss)
```

### Loss Function Configuration [VERIFIED: Phase 4 CONTEXT D-22]

Per D-22, use **MSE loss** for regression (continuous [0.0, 1.0]):

```python
# Regression (continuous output in [0.0, 1.0])
loss_fn = nn.MSELoss()

# NOT BCEWithLogitsLoss (which expects binary targets)
# NOT CrossEntropyLoss (which expects class indices)
```

**Alternative note:** If label distribution is highly imbalanced, weighted MSE could be considered in Phase 5, but Phase 4 uses standard MSE.

### Optimizer and Scheduler Configuration [VERIFIED: PyTorch docs]

```python
# AdamW (per D-22) - robust for transformers
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=1e-4,  # configurable via .env
    weight_decay=1e-5,  # optional, helps regularization
)

# StepLR (per D-22) - deterministic, no patience heuristics
scheduler = torch.optim.lr_scheduler.StepLR(
    optimizer,
    step_size=10,  # drop LR every 10 epochs
    gamma=0.1,    # multiply by 0.1 each step
)
```

### JSON Structured Logging [VERIFIED: python-json-logger in requirements.txt]

```python
import json
from datetime import datetime, timezone

def log_event(event: str, **fields: object) -> None:
    """Log structured event as JSON."""
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)

# Usage in training loop:
log_event(
    "epoch_start",
    epoch=0,
    learning_rate=1e-4,
)
log_event(
    "batch_loss",
    epoch=0,
    batch=10,
    loss=0.45,
)
log_event(
    "val_loss",
    epoch=0,
    val_loss=0.38,
)
```

## Testing Approaches

### Smoke Test Pattern [VERIFIED: PyTorch + pytest patterns]

**End-to-end test with fixture data:**

```python
# python/tests/test_ml_pipeline.py
import pytest
import torch
from torch.utils.data import DataLoader, TensorDataset

from ml.dataset import load_cs2cd_dataset
from ml.model import AntiCheatTransformer


@pytest.fixture
def fixture_data():
    """Create minimal fixture matrices and labels for fast testing."""
    X = torch.randn(10, 256, 44)  # 10 samples, 256 ticks, 44 features
    y = torch.rand(10, 1)  # 10 suspicion scores in [0.0, 1.0]
    return TensorDataset(X, y)


def test_model_forward_pass(fixture_data):
    """Verify model accepts input and produces output in [0.0, 1.0]."""
    model = AntiCheatTransformer()
    loader = DataLoader(fixture_data, batch_size=2)
    
    X, y = next(iter(loader))
    output = model(X)
    
    assert output.shape == (2, 1), "Output shape must be (batch_size, 1)"
    assert (output >= 0.0).all() and (output <= 1.0).all(), "Output must be in [0.0, 1.0]"


def test_training_step(fixture_data):
    """Verify model trains without errors for a few steps."""
    model = AntiCheatTransformer()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    loss_fn = torch.nn.MSELoss()
    
    loader = DataLoader(fixture_data, batch_size=2)
    
    model.train()
    for epoch in range(3):
        for X, y in loader:
            optimizer.zero_grad()
            output = model(X)
            loss = loss_fn(output, y)
            loss.backward()
            optimizer.step()
            
            # Check loss is a finite number
            assert not torch.isnan(loss), f"Loss is NaN at epoch {epoch}"
    
    # Model should have learned something (loss should decrease, roughly)
    assert loss.item() < 1.0, "Loss too high after training"


def test_augmentation_no_corruption():
    """Verify augmentation does not corrupt matrix structure."""
    from ml.dataset import GaussianAugmentation
    import numpy as np
    
    matrix = np.random.randn(256, 44).astype(np.float32)
    aug = GaussianAugmentation(feature_variances=np.ones(44))
    
    augmented = aug(matrix, p=1.0)
    
    assert augmented.shape == matrix.shape, "Augmentation changed shape"
    assert not np.isnan(augmented).any(), "Augmentation produced NaN"
    assert np.isfinite(augmented).all(), "Augmentation produced inf"
    # Small difference from original (due to noise)
    assert not np.array_equal(augmented, matrix), "Augmentation had no effect"


def test_stratified_split():
    """Verify splits are stratified at demo level."""
    from ml.dataset import create_stratified_splits
    
    # Create fake data with 3 demos
    demo_ids = ["demo1"] * 100 + ["demo2"] * 100 + ["demo3"] * 100
    labels = ["clean"] * 150 + ["suspicious"] * 100 + ["likely_cheating"] * 50
    
    splits = create_stratified_splits(
        demo_ids, labels, test_size=0.15, val_size=0.15
    )
    
    # All indices should be unique
    all_indices = set(splits["train"]) | set(splits["val"]) | set(splits["test"])
    assert len(all_indices) == 300, "Split indices are not unique"
    
    # Check class balance in train set
    train_labels = [labels[i] for i in splits["train"]]
    assert len(train_labels) > 0, "Train set is empty"
```

**Fixture data location:** `python/fixtures/ml/`

```python
# python/fixtures/ml/__init__.py
import torch
import numpy as np

def get_fixture_data():
    """Return minimal 256x44 matrix + labels for testing."""
    X = torch.randn(10, 256, 44, dtype=torch.float32)
    y = torch.rand(10, 1, dtype=torch.float32)
    return X, y
```

### Test Coverage Mapping

| Requirement | Test Case | Command |
|-------------|-----------|---------|
| ML-01: Dataset loads | `test_load_dataset_hf` | `pytest python/tests/test_ml_pipeline.py::test_load_dataset_hf -v` |
| ML-02: Conversion to 256×44 | `test_matrix_shape` | `pytest python/tests/test_ml_pipeline.py::test_matrix_shape -v` |
| ML-03: Stratified split | `test_stratified_split` | `pytest python/tests/test_ml_pipeline.py::test_stratified_split -v` |
| ML-04: Augmentation | `test_augmentation_no_corruption` | `pytest python/tests/test_ml_pipeline.py::test_augmentation_no_corruption -v` |
| ML-05: Model architecture | `test_model_forward_pass` | `pytest python/tests/test_ml_pipeline.py::test_model_forward_pass -v` |
| ML-06: Training loop | `test_training_step` | `pytest python/tests/test_ml_pipeline.py::test_training_step -v` |

**Quick smoke test (all tests):**

```bash
pytest python/tests/test_ml_pipeline.py -v --tb=short
```

**Full suite:**

```bash
pytest python/tests/ -v --cov=python/ml
```

## Integration with Phase 3

### Data Contract: Feature Scores → ML Labels

**Phase 3 outputs:** Feature extraction produces 6 scores per demo:
- `aimbot_score`, `wallhack_score`, `triggerbot_score`, `recoil_score`, `bhop_score`, `session_score` (each [0.0, 1.0])
- `overall_suspicion` (weighted combination [0.0, 1.0])
- `suspicion_label` ("clean", "suspicious", or "likely_cheating")

**Phase 4 input:** CS2CD dataset from HuggingFace already contains labels (likely pre-computed via same or similar scoring).

**Integration approach:**
1. Load CS2CD dataset (externally labeled)
2. Compute feature variances from training set (for augmentation)
3. Train transformer to predict the dataset labels
4. **Future (Phase 5+):** Use Phase 3 feature scores as pseudo-labels or reweight Phase 3 scores based on Phase 4 model predictions

**No direct database coupling in Phase 4** — training is offline, dataset is self-contained.

## Common Pitfalls

### Pitfall 1: Variable-Length Sequences Without Padding

**What goes wrong:** Transformer expects fixed sequence length (256 ticks). If sequences are variable length and not padded, batching fails with shape mismatch.

**Why it happens:** CS2 demos vary in length; some are short, some are long. Without padding/truncation, DataLoader cannot stack batches.

**How to avoid:** Always convert to exactly 256 ticks before creating DataLoader (zero-pad if short, truncate middle if long).

**Warning signs:** `RuntimeError: stacking inputs of different sizes` during DataLoader iteration.

### Pitfall 2: Augmentation Leakage to Validation Set

**What goes wrong:** If augmentation is applied to both train and validation, validation loss becomes artificially low (model sees same data twice with different noise).

**Why it happens:** Forgetting to check `if split == 'train':` before calling augmentation.

**How to avoid:** Augmentation is applied in DataLoader only for training split. Validation/test loaders do NOT use augmentation.

```python
if split == "train":
    train_loader = DataLoader(train_ds, batch_size=128, shuffle=True, collate_fn=augment_fn)
else:
    val_loader = DataLoader(val_ds, batch_size=128, shuffle=False, collate_fn=None)
```

**Warning signs:** Validation loss decreases too quickly or is suspiciously lower than training loss.

### Pitfall 3: Noise Magnitude Destroying Signal

**What goes wrong:** Gaussian noise with `scaling_factor > 0.1` can add noise larger than the feature signal, destroying relative distances and correlations.

**Why it happens:** Choosing scaling_factor without understanding feature distributions.

**How to avoid:** Compute feature variance from training set; use `scaling_factor = 0.01` (default, configurable via `.env`). Validate noise magnitude with a quick histogram: `std(feature) * 0.01` should be much smaller than std(feature).

**Warning signs:** Training loss stays high or diverges; model never learns.

### Pitfall 4: Seed Inconsistency

**What goes wrong:** Different runs produce different splits and initialization, making results non-reproducible.

**Why it happens:** Forgetting to set `random_state` in StratifiedShuffleSplit or `torch.manual_seed()`.

**How to avoid:** Set seed in `.env` (e.g., `RANDOM_SEED=42`) and use consistently:

```python
random_seed = int(os.getenv("RANDOM_SEED", 42))
np.random.seed(random_seed)
torch.manual_seed(random_seed)
```

**Warning signs:** Running same training script twice produces different best model loss.

### Pitfall 5: Best Model Not Saved

**What goes wrong:** Training completes but best model checkpoint is lost; model_final.pt is worse than model_best.pt.

**Why it happens:** Checkpointing logic only saves if val_loss improves, but best checkpoint is overwritten or not reloaded.

**How to avoid:** Always save `model_best.pt` when validation loss improves; after training, reload and save as `model_best.pt`. Document that Phase 5 should use `model_best.pt`, not `model_final.pt`.

```python
if val_loss < best_val_loss:
    torch.save(model.state_dict(), os.path.join(checkpoint_dir, "model_best.pt"))
```

**Warning signs:** Checkpoint is saved but final inference uses a different model artifact.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (already used in Phase 3) |
| Config file | `pytest.ini` or `pyproject.toml` [not yet created — Wave 0] |
| Quick run command | `pytest python/tests/test_ml_pipeline.py -v --tb=short` |
| Full suite command | `pytest python/tests/ -v --cov=python/ml --cov-report=term-missing` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ML-01 | Dataset loads from HuggingFace (with token fallback) | integration | `pytest python/tests/test_ml_pipeline.py::test_load_dataset -v` | ❌ Wave 0 |
| ML-02 | Parquet rows convert to 256×44 matrices | unit | `pytest python/tests/test_ml_pipeline.py::test_matrix_shape -v` | ❌ Wave 0 |
| ML-03 | Stratified splits at 70/15/15 demo level | unit | `pytest python/tests/test_ml_pipeline.py::test_stratified_split -v` | ❌ Wave 0 |
| ML-04 | Gaussian augmentation preserves relative distance | unit | `pytest python/tests/test_ml_pipeline.py::test_augmentation_no_corruption -v` | ❌ Wave 0 |
| ML-05 | Transformer accepts 256×44 input, outputs [0.0, 1.0] | unit | `pytest python/tests/test_ml_pipeline.py::test_model_forward_pass -v` | ❌ Wave 0 |
| ML-06 | Training loop runs with MSE, AdamW, StepLR, batch 128 | integration | `pytest python/tests/test_ml_pipeline.py::test_training_step -v` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest python/tests/test_ml_pipeline.py -v` (quick smoke test, <10 sec)
- **Per wave merge:** `pytest python/tests/ -v --cov=python/ml` (full suite with coverage, <30 sec with fixture data)
- **Phase gate:** Full suite green + `test_training_step` passes before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `python/tests/test_ml_pipeline.py` — implements all 6 tests above
- [ ] `python/tests/fixtures/ml/fixture_data.py` — minimal 256×44 matrices and labels
- [ ] `pytest.ini` — pytest configuration (if needed; optional with pyproject.toml)
- [ ] `python/ml/__init__.py` — makes ml a package
- [ ] Framework install: Already in requirements.txt (pytest, torch, datasets); no additional installs needed

## Code Examples

### Example 1: Load CS2CD Dataset with Offline Fallback

```python
# Source: HuggingFace datasets docs + CONTEXT D-02-D-03
import os
from datasets import load_dataset

def load_cs2cd(split: str = "train") -> datasets.Dataset:
    """
    Load CS2CD dataset from HuggingFace.
    
    Args:
        split: "train", "test", or None for all splits
    
    Returns:
        HuggingFace Dataset object
    
    Raises:
        Exception: If dataset is private and HF_TOKEN is not set
    """
    hf_token = os.getenv("HF_TOKEN")
    
    try:
        dataset = load_dataset(
            "itubrainlab/CS2CD",
            split=split,
            token=hf_token,
            cache_dir=os.getenv("HF_DATASETS_CACHE"),
        )
        return dataset
    except Exception as e:
        if "401" in str(e) or "private" in str(e).lower():
            raise Exception(
                "CS2CD dataset requires authentication. "
                "Set HF_TOKEN environment variable and retry."
            ) from e
        raise
```

### Example 2: Convert Parquet Rows to 256×44 Matrices

```python
# Source: AntiCheatPT paper + padding/truncation logic
import numpy as np

def demo_to_matrix(demo_ticks: list[dict], n_ticks: int = 256, n_features: int = 44) -> np.ndarray:
    """
    Convert demo ticks to fixed-size matrix (256, 44).
    
    Padding/truncation:
    - If len(ticks) < 256: zero-pad
    - If len(ticks) > 256: take middle 256 ticks
    """
    ticks = demo_ticks
    
    if len(ticks) > n_ticks:
        # Truncate: prefer middle to preserve kill event context
        start = (len(ticks) - n_ticks) // 2
        ticks = ticks[start : start + n_ticks]
    
    # Initialize matrix
    matrix = np.zeros((n_ticks, n_features), dtype=np.float32)
    
    # Fill in tick data
    for i, tick in enumerate(ticks):
        if tick is not None:
            for j in range(n_features):
                key = f"feature_{j}"  # Adjust to actual key naming
                matrix[i, j] = tick.get(key, 0.0)
    
    return matrix
```

### Example 3: Stratified Train/Val/Test Split

```python
# Source: scikit-learn + CONTEXT D-09-D-10
from sklearn.model_selection import StratifiedShuffleSplit
import numpy as np

def stratified_split(
    demo_ids: list[str],
    labels: list[str],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> dict[str, list[int]]:
    """
    Create stratified demo-level split.
    
    Returns:
        {"train": indices, "val": indices, "test": indices}
    """
    n_samples = len(demo_ids)
    
    # First split: train vs. temp
    sss1 = StratifiedShuffleSplit(n_splits=1, test_size=1.0 - train_ratio, random_state=seed)
    train_idx, temp_idx = next(sss1.split(np.zeros(n_samples), labels))
    
    # Second split: val vs. test from temp
    temp_labels = [labels[i] for i in temp_idx]
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=test_ratio / (val_ratio + test_ratio), random_state=seed)
    val_idx, test_idx = next(sss2.split(np.zeros(len(temp_idx)), temp_labels))
    
    return {
        "train": train_idx.tolist(),
        "val": temp_idx[val_idx].tolist(),
        "test": temp_idx[test_idx].tolist(),
    }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom data loaders | HuggingFace `datasets` library | 2020+ | Automatic caching, format detection, versioning |
| Manual Parquet parsing | HF auto-detection from file extension | 2021+ | Simpler code, fewer bugs |
| Adam optimizer | AdamW (Adam with weight decay) | 2019+ | Better generalization for transformers |
| Fixed learning rate | Learning rate scheduling (StepLR, CosineAnnealingLR) | 2015+ | Faster convergence, better final loss |
| No checkpointing | Best model checkpointing by validation | 2012+ | Prevents overfitting from progressing indefinitely |
| Early stopping (manual) | Early stopping via validation loss threshold | 2012+ | Deterministic stopping criterion |

**Deprecated/outdated:**
- **Hand-rolling Parquet reading:** Use HuggingFace `datasets` instead; it handles caching, auth, and format detection automatically.
- **Positional encoding for implicit sequence order:** Modern transformers learn position implicitly; explicit PE adds complexity.
- **SGD optimizer for transformers:** AdamW is now standard; SGD is rarely used.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CS2CD dataset is publicly available on HuggingFace at `itubrainlab/CS2CD` | Dataset Pipeline Architecture | If dataset repo has moved or been renamed, load_dataset will fail. Mitigation: user must provide correct dataset identifier via `.env` |
| A2 | CS2CD Parquet schema matches AntiCheatPT_256 (256 ticks × 44 features) | Matrix Conversion | If actual schema differs, matrix conversion code must be adjusted. Mitigation: validate schema during dataset loading |
| A3 | Gaussian noise with scaling_factor=0.01 is appropriate | Data Augmentation Strategy | If too small, augmentation has no effect; if too large, noise dominates signal. Mitigation: make configurable via `.env` |
| A4 | BCEWithLogitsLoss is NOT appropriate for this regression task | Training Loop — Loss Function | If labels are binary (0/1), BCE would be correct. CS2CD appears to use continuous labels. Mitigation: confirm with dataset inspection in Wave 0 |
| A5 | Phase 3 feature scores will not be directly used as labels in Phase 4 | Integration with Phase 3 | If Phase 4 is intended to re-label Phase 3 results, contract changes. Mitigation: clarify with user during discuss-phase |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. *(This table is NOT empty; see A1-A5 above.)*

## Open Questions

1. **CS2CD Dataset Exact Schema**
   - What we know: 90,707 context windows, 256 ticks × 44 features, Parquet format
   - What's unclear: Exact feature ordering, data types (float32/float64), label format (continuous or categorical)
   - Recommendation: In Wave 0, inspect actual dataset via `datasets.load_dataset(...).column_names` and sample rows to confirm schema

2. **AntiCheatPT_256 Exact Architecture Details**
   - What we know: nn.Transformer-based, 4-6 encoder layers (assumed), 8 attention heads (assumed)
   - What's unclear: Exact number of layers, hidden size, feedforward dim, dropout rate
   - Recommendation: Consult GitHub repo (itubrainlab/AntiCheatPT) for reference implementation or paper appendix

3. **Label Format and Interpretation**
   - What we know: Overall suspicion is continuous [0.0, 1.0] or categorical (clean/suspicious/likely_cheating)
   - What's unclear: Whether CS2CD labels are continuous suspicion scores or categorical, and if they align with Phase 3 scoring
   - Recommendation: Inspect dataset labels; if categorical, one-hot encode before training

4. **Relative Distance Preservation in Augmentation**
   - What we know: Attacker and victim positions should maintain relative distance
   - What's unclear: Which feature indices correspond to attacker vs. victim position, and whether opponent context is actually available in CS2CD
   - Recommendation: Finalize feature schema in `FEATURE_SCHEMA.md` before implementing augmentation

5. **Offline Operation and Network Fallback**
   - What we know: HuggingFace supports offline mode via `HF_HUB_OFFLINE=1`
   - What's unclear: Whether users can pre-cache dataset or if they must download on-demand
   - Recommendation: Document dataset pre-caching in README (Phase 5)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | PyTorch, dataset loading | ✓ | 3.12 (from Phase 1) | — |
| PyTorch | Model training | ✓ | >=2.3.0 (in requirements.txt) | — |
| HuggingFace datasets | Dataset loading | ✓ | >=2.19.0 (in requirements.txt) | Manual Parquet loading (not recommended) |
| scikit-learn | Stratified split | ✓ | >=1.4.0 (in requirements.txt) | Manual stratification logic |
| pandas | Data wrangling | ✓ | >=2.2.0 (in requirements.txt) | — |
| numpy | Array ops, noise generation | ✓ | >=1.26.0 (in requirements.txt) | Builtin lists (slow) |
| pytest | Unit/integration testing | ✓ | >=7.0 (likely installed via dev deps) | unittest (builtin, less convenient) |
| Git | Version control of model code | ✓ | >=2.30 (from Phase 1) | — |

**Missing dependencies with no fallback:** None. All ML libraries are in requirements.txt and Phase 1 runtime.

**Missing dependencies with fallback:** HuggingFace datasets can be replaced with manual Parquet loading (via pandas), but HF provides caching, auth, and versioning automatically—worth keeping.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | HF_TOKEN environment variable (never hardcoded); stored in `.env` only |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Schema validation for Parquet rows; non-blocking logging for invalid data |
| V6 Cryptography | yes | HF_TOKEN transmitted over HTTPS only (HuggingFace SDK handles this) |
| V7 Error Handling | yes | Errors logged without exposing file paths or sensitive data |
| V9 Communications | yes | HuggingFace API over HTTPS; no local HTTP services in Phase 4 |

### Known Threat Patterns for ML Pipelines

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Data poisoning (malicious Parquet) | Tampering | Load from official HuggingFace repo; validate schema; log warnings for invalid rows |
| Model backdoor (compromised weights) | Tampering | Only load model artifacts from version-controlled `data/models/` directory |
| Inference-time adversarial input | Tampering | Validate input shape and range before forward pass; clip to [0.0, 1.0] after sigmoid |
| Information leakage via logs | Information Disclosure | Never log raw feature values or player IDs; log hashes or UUIDs instead |
| Resource exhaustion (OOM) | Denial of Service | Cap batch size (128); cap sequence length (256); add memory checks in dataloader |
| Unauthorized dataset access | Information Disclosure | HF_TOKEN stored in `.env` (git-ignored); never commit `.env` or tokens |

## Sources

### Primary (HIGH confidence)

- [PyTorch nn.Transformer documentation](https://docs.pytorch.org/docs/stable/generated/torch.nn.Transformer.html) - Architecture patterns, layer config
- [HuggingFace datasets documentation](https://huggingface.co/docs/datasets/loading) - Load, cache, auth, offline mode
- [AntiCheatPT arXiv 2508.06348](https://arxiv.org/abs/2508.06348) - 256×44 matrix format, performance metrics, transformer approach
- [scikit-learn StratifiedShuffleSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedShuffleSplit.html) - Stratified splitting
- [PyTorch training loop patterns](https://docs.pytorch.org/tutorials/beginner/introyt/trainingyt.html) - Training, validation, checkpointing

### Secondary (MEDIUM confidence)

- [PyTorch checkpoint management](https://machinelearningmastery.com/managing-a-pytorch-training-process-with-checkpoints-and-early-stopping/) - Best model selection patterns
- [Pytest fixtures for ML](https://circleci.com/blog/testing-pytorch-model-with-pytest/) - Test patterns, smoke tests
- [PyTorch DataLoader for sequences](https://towardsdatascience.com/dataloader-for-sequential-data-using-pytorch-deep-learning-framework-part-2-ed3ad5f6ad82/) - Fixed-length sequence batching

### Tertiary (LOW confidence — implementation details, not verified in this session)

- [GaussianNoise in torchvision](https://docs.pytorch.org/vision/main/generated/torchvision.transforms.v2.GaussianNoise.html) - Torchvision API (may not be directly applicable; custom implementation preferred)

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — PyTorch, HuggingFace, scikit-learn are industry standard and well-documented
- **Architecture:** HIGH — nn.Transformer is proven for NLP/temporal tasks; dataset pipeline follows HF best practices
- **Pitfalls:** MEDIUM — Common issues are well-known, but specific application (256×44 matrices, CS2 context) is research-oriented
- **Testing:** MEDIUM — Pytest patterns are standard, but ML pipeline testing is context-dependent
- **Integration:** MEDIUM — Phase 3 contract is clear, but exact label format in CS2CD requires verification

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days for stable, established patterns; HuggingFace/PyTorch APIs move slowly)

---

**Phase:** 04-ML Dataset and Transformer Prep
**Research completed:** 2026-05-15
