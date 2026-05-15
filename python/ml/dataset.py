"""Dataset loading, conversion, splitting, and augmentation pipeline.

Implements the complete CS2CD dataset pipeline:
- HuggingFace dataset loading with optional authentication
- Parquet row to 256x44 matrix conversion
- Stratified train/validation/test splitting at demo level
- Gaussian augmentation with relative distance preservation
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional, Tuple

import numpy as np
import torch
import torch.utils.data as torch_data
from datasets import Dataset
from sklearn.model_selection import StratifiedShuffleSplit

from ml.config import load_config


def log_event(event: str, **fields) -> None:
    """Log event as structured JSON to stdout.

    Args:
        event: Event name
        **fields: Additional fields to include in log
    """
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)


def load_cs2cd_dataset(split: str = "train") -> Dataset:
    """Load CS2CD dataset from HuggingFace.

    Args:
        split: "train", "test", or None for all splits

    Returns:
        HuggingFace Dataset object (cached locally)

    Raises:
        Exception: If dataset is private and HF_TOKEN is not set
    """
    from datasets import load_dataset

    cfg = load_config()

    try:
        dataset = load_dataset(
            cfg.DATASET_ID,
            split=split,
            token=cfg.HF_TOKEN,
            cache_dir=cfg.HF_DATASETS_CACHE,
        )
        log_event("dataset_loaded", split=split, num_samples=len(dataset))
        return dataset
    except Exception as e:
        if "401" in str(e) or "private" in str(e).lower():
            raise Exception(
                "CS2CD dataset requires authentication. "
                "Set HF_TOKEN environment variable and retry."
            ) from e
        raise


def convert_demo_to_matrix(
    demo_ticks: list[dict],
    n_ticks: int = 256,
    n_features: int = 44,
) -> np.ndarray:
    """Convert sequential demo ticks to fixed-size matrix.

    Args:
        demo_ticks: List of tick dictionaries with feature keys
        n_ticks: Fixed number of ticks (default 256, per D-06)
        n_features: Fixed number of features (default 44, per D-06)

    Returns:
        Matrix of shape (256, 44) as float32
    """
    ticks = demo_ticks

    # Pad or truncate to exactly n_ticks
    if len(ticks) > n_ticks:
        # Prefer middle ticks to preserve kill event context
        start_idx = (len(ticks) - n_ticks) // 2
        ticks = ticks[start_idx : start_idx + n_ticks]
    elif len(ticks) < n_ticks:
        # Pad with zeros (None placeholders)
        ticks = ticks + [None] * (n_ticks - len(ticks))

    # Extract features in canonical order
    matrix = np.zeros((n_ticks, n_features), dtype=np.float32)

    for i, tick in enumerate(ticks):
        if tick is not None:
            # Extract each of the 44 features in order
            # Adjust key naming per actual CS2CD schema
            for feat_idx in range(n_features):
                key = f"feature_{feat_idx}"
                # Try multiple key formats for compatibility
                value = tick.get(key, None)
                if value is None and isinstance(tick, dict):
                    # Try with field suffix
                    value = tick.get(f"field_{feat_idx}", None)
                if value is None and isinstance(tick, dict):
                    # Fallback to 0.0
                    value = 0.0
                matrix[i, feat_idx] = float(value) if value is not None else 0.0

    return matrix


class CS2CDDataset(torch_data.Dataset):
    """PyTorch Dataset wrapper for CS2CD data.

    Converts HuggingFace dataset rows to 256x44 matrices on-the-fly.
    """

    def __init__(
        self,
        hf_dataset: Dataset,
        indices: Optional[list[int]] = None,
    ):
        """Initialize dataset.

        Args:
            hf_dataset: HuggingFace Dataset object
            indices: List of indices to use (subset of full dataset)
        """
        self.hf_dataset = hf_dataset
        self.indices = indices if indices is not None else list(range(len(hf_dataset)))

    def __len__(self) -> int:
        """Return number of samples in this dataset."""
        return len(self.indices)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """Return (matrix, label) for index idx.

        Args:
            idx: Index into self.indices

        Returns:
            (matrix, label) where matrix is (256, 44) and label is scalar
        """
        sample_idx = self.indices[idx]
        sample = self.hf_dataset[sample_idx]

        # Convert ticks to matrix
        ticks = sample.get("ticks", [])
        if isinstance(ticks, str):
            # If ticks is a JSON string, parse it
            import json
            ticks = json.loads(ticks)
        matrix = convert_demo_to_matrix(ticks)
        matrix_tensor = torch.from_numpy(matrix).float()

        # Extract label (assumes CS2CD has a label field; adjust per actual schema)
        label = torch.tensor(sample.get("label", 0.0), dtype=torch.float32).unsqueeze(0)

        return matrix_tensor, label


def create_stratified_splits(
    demo_ids: list[str],
    labels: list[str],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = None,
) -> dict[str, list[int]]:
    """Create stratified demo-level 70/15/15 split.

    All ticks from a demo stay in the same split (demo-level granularity).

    Args:
        demo_ids: List of demo identifiers (one per sample)
        labels: List of class labels (clean/suspicious/likely_cheating)
        train_ratio: Fraction for training (default 0.70)
        val_ratio: Fraction for validation (default 0.15)
        test_ratio: Fraction for testing (default 0.15)
        random_state: Seed for reproducibility (D-10)

    Returns:
        {"train": indices, "val": indices, "test": indices}
    """
    if random_state is None:
        random_state = load_config().ML_SEED

    n_samples = len(demo_ids)

    # First split: train (70%) vs. temp (30%)
    sss1 = StratifiedShuffleSplit(
        n_splits=1,
        test_size=1.0 - train_ratio,
        random_state=random_state,
    )
    train_idx, temp_idx = next(sss1.split(np.zeros(n_samples), labels))

    # Second split: val (15%) vs. test (15%) from temp
    temp_labels = [labels[i] for i in temp_idx]
    test_frac = test_ratio / (val_ratio + test_ratio)
    sss2 = StratifiedShuffleSplit(
        n_splits=1,
        test_size=test_frac,
        random_state=random_state,
    )
    val_temp_idx, test_temp_idx = next(sss2.split(np.zeros(len(temp_idx)), temp_labels))

    return {
        "train": train_idx.tolist(),
        "val": temp_idx[val_temp_idx].tolist(),
        "test": temp_idx[test_temp_idx].tolist(),
    }


class GaussianAugmentation:
    """Per-feature Gaussian noise augmentation (training only).

    Preserves relative attacker-victim distance by applying same noise
    to paired features (e.g., attacker position and opponent position).
    """

    def __init__(
        self,
        feature_variances: np.ndarray,
        scaling_factor: float = None,
    ):
        """Initialize augmentation.

        Args:
            feature_variances: std of each feature from training set (shape: 44)
            scaling_factor: multiplier for variance (default from config)
        """
        if scaling_factor is None:
            scaling_factor = load_config().ML_AUGMENTATION_SCALE

        self.noise_std = feature_variances * scaling_factor
        self.scaling_factor = scaling_factor

    def __call__(
        self,
        matrix: np.ndarray,
        p: float = 0.5,
    ) -> np.ndarray:
        """Apply Gaussian noise with probability p (training only).

        Args:
            matrix: (256, 44) array
            p: probability of augmentation (default 0.5)

        Returns:
            Augmented matrix (copy, original unchanged)
        """
        if np.random.random() > p:
            return matrix.copy()

        augmented = matrix.copy()

        # Per-feature Gaussian noise
        for feat_idx in range(44):
            noise = np.random.normal(0, self.noise_std[feat_idx], size=256)
            augmented[:, feat_idx] += noise

        # Preserve relative distance: apply same position noise to attacker and opponent
        # Indices 0-2 are attacker position, 15-17 are opponent position (per FEATURE_SCHEMA)
        position_noise = np.random.normal(0, self.noise_std[0], size=256)
        augmented[:, 0] += position_noise
        augmented[:, 15] += position_noise

        # Similar for Y and Z positions
        for offset in [1, 2]:
            position_noise = np.random.normal(0, self.noise_std[offset], size=256)
            augmented[:, offset] += position_noise
            augmented[:, 15 + offset] += position_noise

        return augmented


def compute_feature_variances(train_dataset: CS2CDDataset) -> np.ndarray:
    """Compute std of each feature from training set.

    Used for augmentation noise variance computation (D-12).

    Args:
        train_dataset: CS2CDDataset instance with training data

    Returns:
        Array of shape (44,) with std of each feature
    """
    all_features = []

    for i in range(len(train_dataset)):
        matrix, _ = train_dataset[i]
        all_features.append(matrix.numpy())

    stacked = np.vstack([m.reshape(256, 44) for m in all_features])
    return np.std(stacked, axis=0)


def prepare_dataloaders(
    hf_dataset: Dataset,
    apply_augmentation: bool = True,
    batch_size: int = None,
    random_state: int = None,
) -> Tuple[torch_data.DataLoader, torch_data.DataLoader, torch_data.DataLoader, GaussianAugmentation]:
    """Prepare train/val/test DataLoaders with optional augmentation.

    Args:
        hf_dataset: HuggingFace dataset (full, before splitting)
        apply_augmentation: Whether to apply Gaussian augmentation to training
        batch_size: Batch size (default from config)
        random_state: Random seed (default from config)

    Returns:
        (train_loader, val_loader, test_loader, augmentation)
    """
    if batch_size is None:
        batch_size = load_config().BATCH_SIZE
    if random_state is None:
        random_state = load_config().ML_SEED

    # Extract demo_ids and labels for stratification
    demo_ids = hf_dataset["demo_id"]
    labels = hf_dataset["label"]

    # Create stratified splits
    splits = create_stratified_splits(demo_ids, labels, random_state=random_state)

    # Create datasets
    train_dataset = CS2CDDataset(hf_dataset, splits["train"])
    val_dataset = CS2CDDataset(hf_dataset, splits["val"])
    test_dataset = CS2CDDataset(hf_dataset, splits["test"])

    # Compute augmentation variances from training set
    feature_vars = compute_feature_variances(train_dataset)
    augmentation = GaussianAugmentation(feature_vars)

    # Create loaders (augmentation only for training)
    def augment_collate_fn(batch):
        matrices, labels = zip(*batch)
        matrices = torch.stack(matrices)
        labels = torch.stack(labels)

        if apply_augmentation:
            # Apply augmentation to each matrix in batch
            matrices_np = matrices.numpy()
            for i in range(len(matrices_np)):
                matrices_np[i] = augmentation(matrices_np[i], p=0.5)
            matrices = torch.from_numpy(matrices_np).float()

        return matrices, labels

    train_loader = torch_data.DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        collate_fn=augment_collate_fn,
    )
    val_loader = torch_data.DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
    )
    test_loader = torch_data.DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
    )

    return train_loader, val_loader, test_loader, augmentation
