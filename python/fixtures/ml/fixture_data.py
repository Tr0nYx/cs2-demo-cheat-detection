"""Minimal fixture data for ML pipeline testing.

Provides deterministic 256x44 matrices and labels for fast test execution.
"""

import numpy as np
import torch


def get_fixture_matrices(n_samples: int = 10) -> tuple[torch.Tensor, torch.Tensor]:
    """Return minimal fixture data for testing.

    Args:
        n_samples: Number of 256x44 matrices to generate (default 10)

    Returns:
        (X, y) where X is (n_samples, 256, 44) float32 and y is (n_samples, 1) float32
            X: Random matrices representing player-opponent tick sequences
            y: Suspicion scores in [0.0, 1.0]
    """
    # Set fixed seed for reproducibility
    np.random.seed(42)
    torch.manual_seed(42)

    # Generate random matrices (256 ticks x 44 features)
    X = torch.randn(n_samples, 256, 44, dtype=torch.float32)

    # Generate suspicion scores (continuous in [0.0, 1.0])
    y = torch.rand(n_samples, 1, dtype=torch.float32)

    return X, y
