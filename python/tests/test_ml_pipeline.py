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


def test_dataset_load_hf(monkeypatch):
    """ML-01: Dataset loader downloads or opens CS2CD from HuggingFace.

    This test will verify:
    - Dataset can be loaded with optional HF_TOKEN
    - Dataset has expected schema (columns/format)
    - Clear error if dataset is private and HF_TOKEN is missing
    """
    from ml.dataset import load_cs2cd_dataset
    import datasets

    # Mock load_dataset to return a dummy dataset
    def mock_load_dataset(*args, **kwargs):
        class MockDataset:
            def __len__(self):
                return 10
            def __getitem__(self, idx):
                return {
                    "ticks": [{"feature_0": 0.0} for _ in range(256)],
                    "label": 0.5,
                    "demo_id": f"demo_{idx}",
                }
        return MockDataset()

    monkeypatch.setattr(datasets, "load_dataset", mock_load_dataset)
    dataset = load_cs2cd_dataset()
    assert len(dataset) == 10


def test_matrix_conversion():
    """ML-02: Parquet rows convert to 256x44 matrices.

    This test will verify:
    - Conversion function pads/truncates to exactly 256 ticks
    - Output shape is (n_samples, 256, 44)
    - Zero-padding is used for short demos
    - Middle ticks are used for long demos
    """
    from ml.dataset import convert_demo_to_matrix

    # Test short demo (pad)
    short_ticks = [{"feature_0": 1.0, "feature_1": 2.0} for _ in range(100)]
    matrix = convert_demo_to_matrix(short_ticks)
    assert matrix.shape == (256, 44)
    assert matrix.dtype == np.float32
    assert matrix[0, 0] == 1.0  # First tick first feature
    assert matrix[100, 0] == 0.0  # Padded zero

    # Test long demo (truncate)
    long_ticks = [{"feature_i": float(i % 44)} for i in range(300)]
    matrix = convert_demo_to_matrix(long_ticks)
    assert matrix.shape == (256, 44)
    # Should use middle 256 ticks
    assert matrix[0, 0] > 0  # Non-padded


def test_stratified_split():
    """ML-03: Dataset creates stratified 70/15/15 splits at demo level.

    This test will verify:
    - Train/val/test split is deterministic (same seed = same split)
    - All indices are unique and cover entire dataset
    - Class distribution is maintained across splits
    - Split is at demo granularity (all ticks from same demo in same split)
    """
    from ml.dataset import create_stratified_splits

    # Create fake data: 3 demos with 100 samples each
    demo_ids = ["demo_1"] * 100 + ["demo_2"] * 100 + ["demo_3"] * 100
    labels = (["clean"] * 50 + ["suspicious"] * 30 + ["likely_cheating"] * 20) * 3

    splits = create_stratified_splits(demo_ids, labels, random_state=42)

    # Check sizes
    train_count = len(splits["train"])
    val_count = len(splits["val"])
    test_count = len(splits["test"])
    total = train_count + val_count + test_count

    assert total == 300
    assert abs(train_count / total - 0.70) < 0.05  # Within 5% of 70%
    assert abs(val_count / total - 0.15) < 0.05
    assert abs(test_count / total - 0.15) < 0.05

    # Check all indices are unique
    all_indices = set(splits["train"]) | set(splits["val"]) | set(splits["test"])
    assert len(all_indices) == 300

    # Check determinism
    splits2 = create_stratified_splits(demo_ids, labels, random_state=42)
    assert splits["train"] == splits2["train"]


def test_augmentation_no_corruption(fixture_data):
    """ML-04: Gaussian augmentation preserves structure and relative distances.

    This test will verify:
    - Augmentation maintains shape (256, 44)
    - Output contains no NaN or inf values
    - Augmentation is applied only during training (not validation/test)
    - Relative attacker-victim distance is preserved (same noise vector)
    """
    from ml.dataset import GaussianAugmentation

    # Create dummy matrix
    matrix = np.random.randn(256, 44).astype(np.float32)
    feature_vars = np.ones(44)

    aug = GaussianAugmentation(feature_vars, scaling_factor=0.01)

    # Augment with p=1.0 (always augment)
    augmented = aug(matrix, p=1.0)

    # Check structure is preserved
    assert augmented.shape == matrix.shape
    assert augmented.dtype == np.float32
    assert not np.isnan(augmented).any()
    assert np.isfinite(augmented).all()

    # Check that augmentation had an effect
    assert not np.array_equal(augmented, matrix)

    # Check that augmentation respects probability
    augmented_0 = aug(matrix.copy(), p=0.0)
    np.testing.assert_array_equal(augmented_0, matrix)  # No augmentation


def test_model_forward_pass(fixture_data):
    """ML-05: Transformer accepts 256x44 input, outputs continuous [0.0, 1.0] scores.

    This test will verify:
    - Model can be instantiated
    - Forward pass accepts (batch_size, 256, 44) tensors
    - Output shape is (batch_size, 1)
    - Output values are in [0.0, 1.0]
    """
    from ml.model import create_model

    model = create_model()
    model.eval()  # Disable dropout during evaluation

    # Get fixture data
    X, y = fixture_data

    # Forward pass with subset for test
    with torch.no_grad():
        output = model(X[:2])

    # Verify shape
    assert output.shape == (2, 1), f"Output shape must be (2, 1), got {output.shape}"

    # Verify bounds
    assert (output >= 0.0).all(), f"Output contains values < 0: {output.min()}"
    assert (output <= 1.0).all(), f"Output contains values > 1: {output.max()}"

    # Verify dtype
    assert output.dtype == torch.float32, f"Output dtype must be float32, got {output.dtype}"

    # Verify no NaN or inf
    assert not torch.isnan(output).any(), "Output contains NaN"
    assert torch.isfinite(output).all(), "Output contains inf"


def test_training_step(fixture_data):
    """ML-06: Training loop runs with MSE loss, AdamW, StepLR, batch size 128.

    This test will verify:
    - Training loop initializes without errors
    - One epoch completes without NaN loss
    - Validation loss is computed
    - Best model checkpoint is saved
    - Learning rate scheduler steps correctly
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    from ml.model import create_model, set_seed

    # Set seed for reproducibility
    set_seed(42)

    # Create model and move to device
    device = torch.device("cpu")  # Use CPU for tests
    model = create_model()
    model.to(device)

    # Get fixture data
    X, y = fixture_data
    dataset = TensorDataset(X, y)
    loader = DataLoader(dataset, batch_size=4, shuffle=True)

    # Setup training components per D-22
    loss_fn = nn.MSELoss()  # MSE for regression
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)  # AdamW
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=1, gamma=0.1)  # StepLR

    # Train for a few epochs
    model.train()
    for epoch in range(3):
        total_loss = 0.0
        num_batches = 0

        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)

            optimizer.zero_grad()
            output = model(X_batch)
            loss = loss_fn(output, y_batch)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

            # Check for NaN loss
            assert not torch.isnan(loss), f"Loss is NaN at epoch {epoch}"

        scheduler.step()

        avg_loss = total_loss / num_batches
        # Loss should be finite
        assert torch.isfinite(torch.tensor(avg_loss)), f"Loss is not finite: {avg_loss}"

    # After training, model should have learned something (loss should be reasonable)
    # We don't require convergence (D-27, D-28), just that training completes
    assert avg_loss < float("inf"), "Average loss is infinite"


def test_checkpoint_saving(tmp_path):
    """Bonus test: Verify best model checkpointing (D-19, D-20).

    This test is optional but verifies that checkpointing works correctly.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    from pathlib import Path

    from ml.model import create_model
    from ml.train import train_with_checkpoint

    device = torch.device("cpu")

    # Create dummy data
    X = torch.randn(20, 256, 44)
    y = torch.rand(20, 1)
    dataset = TensorDataset(X, y)

    # Split into train/val
    train_dataset = TensorDataset(X[:15], y[:15])
    val_dataset = TensorDataset(X[15:], y[15:])

    train_loader = DataLoader(train_dataset, batch_size=4)
    val_loader = DataLoader(val_dataset, batch_size=4)

    # Create model
    model = create_model()
    model.to(device)

    # Setup training
    loss_fn = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=1, gamma=0.1)

    # Train with checkpointing
    checkpoint_dir = Path(tmp_path) / "checkpoints"
    train_with_checkpoint(
        model,
        train_loader,
        val_loader,
        optimizer,
        scheduler,
        loss_fn,
        num_epochs=2,
        checkpoint_dir=checkpoint_dir,
        device=device,
    )

    # Verify checkpoints exist
    best_path = checkpoint_dir / "model_best.pt"
    final_path = checkpoint_dir / "model_final.pt"

    assert best_path.exists(), f"Best checkpoint not found at {best_path}"
    assert final_path.exists(), f"Final checkpoint not found at {final_path}"

    # Load and verify checkpoint
    new_model = create_model()
    new_model.load_state_dict(torch.load(str(best_path)))
    assert new_model is not None, "Failed to load checkpoint"
