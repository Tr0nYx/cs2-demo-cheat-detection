"""Configuration management for ML pipeline.

Reads from .env and provides sensible defaults for all hyperparameters,
dataset identifiers, and artifact paths.
"""

import os
from pathlib import Path
from dataclasses import dataclass


@dataclass
class Config:
    """ML pipeline configuration."""

    # Dataset and HuggingFace
    DATASET_ID: str
    HF_TOKEN: str | None
    HF_DATASETS_CACHE: str

    # Reproducibility
    ML_SEED: int
    ML_AUGMENTATION_SCALE: float

    # Artifact storage
    ML_OUTPUT_DIR: str

    # Training hyperparameters
    BATCH_SIZE: int
    LEARNING_RATE: float
    STEP_SIZE: int
    GAMMA: float
    NUM_EPOCHS: int

    # Model architecture (transformer)
    D_MODEL: int
    NHEAD: int
    NUM_ENCODER_LAYERS: int
    DROPOUT: float

    # Augmentation (training only, per D-08, D-10)
    AUGMENTATION_SEED: int
    SMOTE_RATIO: float
    NOISE_SCALE: float
    TEMPORAL_SHIFT_BOUNDS: tuple[int, int]
    FEATURE_SCALING_VARIANCE: float


def load_config() -> Config:
    """Load configuration from .env and defaults.

    Returns:
        Config: Configuration object with all ML pipeline parameters.
    """
    # Determine HF datasets cache directory
    hf_cache = os.getenv(
        "HF_DATASETS_CACHE",
        str(Path.home() / ".cache" / "huggingface" / "datasets")
    )

    config = Config(
        # Dataset and HuggingFace
        DATASET_ID=os.getenv("DATASET_ID", "itubrainlab/CS2CD"),
        HF_TOKEN=os.getenv("HF_TOKEN"),
        HF_DATASETS_CACHE=hf_cache,
        # Reproducibility
        ML_SEED=int(os.getenv("ML_SEED", "42")),
        ML_AUGMENTATION_SCALE=float(os.getenv("ML_AUGMENTATION_SCALE", "0.01")),
        # Artifact storage
        ML_OUTPUT_DIR=os.getenv("ML_OUTPUT_DIR", "data/models"),
        # Training hyperparameters
        BATCH_SIZE=int(os.getenv("BATCH_SIZE", "128")),
        LEARNING_RATE=float(os.getenv("LEARNING_RATE", "1e-4")),
        STEP_SIZE=int(os.getenv("STEP_SIZE", "10")),
        GAMMA=float(os.getenv("GAMMA", "0.1")),
        NUM_EPOCHS=int(os.getenv("NUM_EPOCHS", "50")),
        # Model architecture
        D_MODEL=int(os.getenv("D_MODEL", "128")),
        NHEAD=int(os.getenv("NHEAD", "8")),
        NUM_ENCODER_LAYERS=int(os.getenv("NUM_ENCODER_LAYERS", "4")),
        DROPOUT=float(os.getenv("DROPOUT", "0.1")),
        # Augmentation (training only, per D-08, D-10)
        AUGMENTATION_SEED=int(os.getenv("AUGMENTATION_SEED", "42")),
        SMOTE_RATIO=float(os.getenv("SMOTE_RATIO", "1.0")),
        NOISE_SCALE=float(os.getenv("NOISE_SCALE", "0.002")),
        TEMPORAL_SHIFT_BOUNDS=(int(os.getenv("TEMPORAL_SHIFT_MIN", "-5")), int(os.getenv("TEMPORAL_SHIFT_MAX", "5"))),
        FEATURE_SCALING_VARIANCE=float(os.getenv("FEATURE_SCALING_VARIANCE", "0.10")),
    )

    return config


if __name__ == "__main__":
    cfg = load_config()
    print(f"ML Configuration loaded:")
    print(f"  Dataset ID: {cfg.DATASET_ID}")
    print(f"  HF Token: {'SET' if cfg.HF_TOKEN else 'NOT SET'}")
    print(f"  ML Seed: {cfg.ML_SEED}")
    print(f"  Batch Size: {cfg.BATCH_SIZE}")
    print(f"  Output Dir: {cfg.ML_OUTPUT_DIR}")
    print(f"  Model D_Model: {cfg.D_MODEL}")
    print(f"  Model Layers: {cfg.NUM_ENCODER_LAYERS}")
    print(f"  Model Heads: {cfg.NHEAD}")
