"""AntiCheatTransformer model for CS2CD cheat detection.

Implements a PyTorch nn.Transformer-based architecture that accepts 256x44 context
matrices and outputs continuous suspicion scores in [0.0, 1.0].

Architecture:
1. Embedding layer: projects 44 features to d_model
2. Transformer encoder: processes sequence with multi-head self-attention
3. Global average pooling: reduce sequence to single vector
4. Output head: maps to single continuous score with sigmoid

Hyperparameters are configurable via python/ml/config.py and environment variables.
"""

import random
from typing import Optional

import torch
import torch.nn as nn
import numpy as np

from python.ml.config import load_config


class AntiCheatTransformer(nn.Module):
    """Transformer-based cheat detection model for CS2CD data.

    Input: (batch_size, 256, 44) - sequence of 256 ticks with 44 features each
    Output: (batch_size, 1) - continuous suspicion score in [0.0, 1.0]

    Architecture:
    1. Embedding layer: projects 44 features to d_model
    2. Transformer encoder: processes sequence with multi-head self-attention
    3. Global average pooling: reduce sequence to single vector
    4. Output head: maps to single continuous score with sigmoid

    Hyperparameters are loaded from config (python/ml/config.py).

    **Design Notes:**

    - **No Positional Encoding:** Per D-16, temporal order is implicit in sequence position
      (tick 0 -> 255). Transformer attention learns relative positions naturally without
      explicit positional encoding. If positional encoding is desired in future, uncomment
      the PositionalEncoding class below.

    - **Dropout Behavior:** Per D-18, dropout is applied during training and disabled during
      evaluation. This is handled automatically by nn.Module.train() and nn.Module.eval(),
      ensuring reproducibility with fixed seeds.

    - **Output Bounds:** Sigmoid activation ensures output is bounded to [0.0, 1.0],
      representing a continuous suspicion score.

    **Example positional encoding (commented out for now):**

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
    """

    def __init__(
        self,
        num_features: int = 44,
        d_model: int = None,
        nhead: int = None,
        num_encoder_layers: int = None,
        dim_feedforward: int = None,
        dropout: float = None,
    ):
        """Initialize transformer model.

        Per D-15, hyperparameters default to config.py but can be overridden for testing.

        Args:
            num_features: Number of input features (default 44, per D-06)
            d_model: Hidden size (default from config). Must be divisible by nhead.
            nhead: Number of attention heads (default from config).
            num_encoder_layers: Number of encoder layers (default from config).
            dim_feedforward: Feedforward dimension in encoder (default 4 * d_model).
            dropout: Dropout rate (default from config). Applied during training only.

        Raises:
            ValueError: If d_model is not divisible by nhead.
        """
        super().__init__()

        # Load config for defaults
        cfg = load_config()
        d_model = d_model or cfg.D_MODEL
        nhead = nhead or cfg.NHEAD
        num_encoder_layers = num_encoder_layers or cfg.NUM_ENCODER_LAYERS
        dim_feedforward = dim_feedforward or (4 * d_model)
        dropout = dropout or cfg.DROPOUT

        # Validate hyperparameters
        if d_model % nhead != 0:
            raise ValueError(f"d_model ({d_model}) must be divisible by nhead ({nhead})")

        self.num_features = num_features
        self.d_model = d_model
        self.nhead = nhead
        self.num_encoder_layers = num_encoder_layers

        # Feature embedding: project 44 features to d_model
        # Per D-16: embedding layer projects input features to hidden_size
        self.embedding = nn.Linear(num_features, d_model)

        # Transformer encoder (no decoder needed for classification)
        # Per D-16: Transformer encoder processes the sequence
        # Per D-18: dropout is applied during training, disabled during evaluation
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,  # Input: (batch, seq_len, d_model)
            activation="relu",
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_encoder_layers,
        )

        # Output head: reduce to single continuous score in [0.0, 1.0]
        # Per D-17: output layer maps hidden_size to 1 with sigmoid
        self.output_head = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),  # Bound output to [0.0, 1.0]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through transformer.

        Args:
            x: (batch_size, 256, 44) - raw tick matrices

        Returns:
            (batch_size, 1) - suspicion scores in [0.0, 1.0]
        """
        # Embed features: (batch, 256, 44) -> (batch, 256, d_model)
        x = self.embedding(x)

        # Transformer encoder: (batch, 256, d_model) -> (batch, 256, d_model)
        x = self.transformer_encoder(x)

        # Global average pooling: (batch, 256, d_model) -> (batch, d_model)
        x = x.mean(dim=1)

        # Output head: (batch, d_model) -> (batch, 1)
        out = self.output_head(x)

        return out

    def set_training_mode(self, training: bool) -> None:
        """Set dropout on/off based on training mode (D-18).

        Per D-18: dropout is applied during training, disabled during evaluation.
        This is handled automatically by nn.Module.train() and nn.Module.eval(),
        but we provide an explicit method for clarity.

        Args:
            training: If True, enable training mode (dropout on). If False, eval mode.
        """
        if training:
            self.train()
        else:
            self.eval()


def create_model(
    num_features: int = 44,
    d_model: int = None,
    nhead: int = None,
    num_encoder_layers: int = None,
    dropout: float = None,
) -> AntiCheatTransformer:
    """Factory function to create a transformer model.

    Per D-15, defaults are loaded from config.py but can be overridden for testing.

    Args:
        num_features: Number of input features (default 44)
        d_model: Hidden size (default from config)
        nhead: Number of attention heads (default from config)
        num_encoder_layers: Number of encoder layers (default from config)
        dropout: Dropout rate (default from config)

    Returns:
        AntiCheatTransformer instance ready for forward pass or training.
    """
    return AntiCheatTransformer(
        num_features=num_features,
        d_model=d_model,
        nhead=nhead,
        num_encoder_layers=num_encoder_layers,
        dropout=dropout,
    )


def init_model(device: torch.device = None) -> AntiCheatTransformer:
    """Initialize model on specified device.

    Per D-18, model is deterministic given a fixed seed. This function
    creates a model and moves it to the specified device (CPU or CUDA).

    Args:
        device: torch device (default cuda if available, else cpu)

    Returns:
        AntiCheatTransformer on specified device
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = create_model()
    model.to(device)
    return model


def set_seed(seed: int = 42) -> None:
    """Set seeds for reproducibility (D-18).

    Per D-18, model is deterministic with seeding. This function sets
    seeds for random, numpy, and torch to ensure reproducible behavior
    across runs.

    Args:
        seed: Random seed (default 42)
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
