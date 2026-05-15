"""Test scaffold for ML pipeline.

Covers all 6 requirements (ML-01 through ML-06) with placeholder implementations
to be filled in by later tasks. All tests skip with descriptive messages until
the corresponding module is implemented.
"""

import pytest
import torch
import numpy as np
from torch.utils.data import DataLoader, TensorDataset


# Import patterns to be filled in by later tasks
# from ml.dataset import load_cs2cd_dataset, convert_to_matrix, create_stratified_splits, GaussianAugmentation
# from ml.model import AntiCheatTransformer
# from ml.train import train_with_checkpoint


@pytest.fixture
def fixture_data():
    """Minimal 256x44 matrices and labels for fast testing."""
    from fixtures.ml.fixture_data import get_fixture_matrices
    return get_fixture_matrices(n_samples=10)


def test_dataset_load_hf():
    """ML-01: Dataset loader downloads or opens CS2CD from HuggingFace.

    This test will verify:
    - Dataset can be loaded with optional HF_TOKEN
    - Dataset has expected schema (columns/format)
    - Clear error if dataset is private and HF_TOKEN is missing
    """
    pytest.skip("Implementation in Wave 2 (dataset.py)")


def test_matrix_conversion():
    """ML-02: Parquet rows convert to 256x44 matrices.

    This test will verify:
    - Conversion function pads/truncates to exactly 256 ticks
    - Output shape is (n_samples, 256, 44)
    - Zero-padding is used for short demos
    - Middle ticks are used for long demos
    """
    pytest.skip("Implementation in Wave 2 (dataset.py)")


def test_stratified_split():
    """ML-03: Dataset creates stratified 70/15/15 splits at demo level.

    This test will verify:
    - Train/val/test split is deterministic (same seed = same split)
    - All indices are unique and cover entire dataset
    - Class distribution is maintained across splits
    - Split is at demo granularity (all ticks from same demo in same split)
    """
    pytest.skip("Implementation in Wave 2 (dataset.py)")


def test_augmentation_no_corruption(fixture_data):
    """ML-04: Gaussian augmentation preserves structure and relative distances.

    This test will verify:
    - Augmentation maintains shape (256, 44)
    - Output contains no NaN or inf values
    - Augmentation is applied only during training (not validation/test)
    - Relative attacker-victim distance is preserved (same noise vector)
    """
    pytest.skip("Implementation in Wave 2 (dataset.py)")


def test_model_forward_pass(fixture_data):
    """ML-05: Transformer accepts 256x44 input, outputs continuous [0.0, 1.0] scores.

    This test will verify:
    - Model can be instantiated
    - Forward pass accepts (batch_size, 256, 44) tensors
    - Output shape is (batch_size, 1)
    - Output values are in [0.0, 1.0]
    """
    pytest.skip("Implementation in Wave 3 (model.py)")


def test_training_step(fixture_data):
    """ML-06: Training loop runs with MSE loss, AdamW, StepLR, batch size 128.

    This test will verify:
    - Training loop initializes without errors
    - One epoch completes without NaN loss
    - Validation loss is computed
    - Best model checkpoint is saved
    - Learning rate scheduler steps correctly
    """
    pytest.skip("Implementation in Wave 4 (train.py)")
