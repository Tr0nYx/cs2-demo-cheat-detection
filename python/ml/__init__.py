"""ML package for CS2 cheat detection.

This package provides dataset loading, model architecture, and training loops
for the AntiCheatPT_256 transformer model.

Modules:
    config: Configuration management from .env
    dataset: HuggingFace dataset loading and preprocessing
    model: Transformer architecture for suspicion scoring
    train: Training entrypoint with best-model checkpointing
"""

__version__ = "0.1.0"

# Export key classes/functions for downstream use (to be populated as tasks add modules)
__all__ = ["config"]
