"""Recoil pattern extraction and validation framework.

Provides ML-learned pattern extraction from CS2CD dataset with
quantile-based bounds computation.
"""

from .pattern_extraction import PatternExtractor
from .quantile_bounds import compute_quantile_bounds

__all__ = [
    "PatternExtractor",
    "compute_quantile_bounds",
]
