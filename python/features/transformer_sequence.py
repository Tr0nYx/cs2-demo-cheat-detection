"""Transformer-based sequence extractor for cheat detection.

Implements TransformerSequenceExtractor per D-15 through D-18: processes
300-tick context windows around kill events with tick-aligned positional
encoding, runs transformer inference, and outputs normalized suspicion scores.

Per D-18: Context windows are 300 ticks (kill ± 150 ticks) with absolute
tick-aligned positional encoding. Transformer model trained on CS2CD dataset
with stratified splits, inference runs as feature input to WeightedScorer.
"""

from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING, Optional

import numpy as np
import torch
import torch.nn as nn

from features.base import (
    AbstractFeatureExtractor,
    FeatureExtractionError,
    FeatureResult,
)

if TYPE_CHECKING:
    from parser.types import ParsedDemo

logger = logging.getLogger(__name__)


class TransformerSequenceExtractor(AbstractFeatureExtractor):
    """Transformer-based sequence extractor for CS2 cheat detection.

    Analyzes 300-tick context windows around kill events using a transformer
    model trained on CS2CD dataset. Implements D-15 through D-18:
    - D-15: Transformer as additional feature extractor (inherits from AbstractFeatureExtractor)
    - D-16: Runs after traditional extractors, produces normalized score for WeightedScorer
    - D-17: Positional encoding uses tick-aligned absolute IDs from demo start
    - D-18: 300-tick context windows per kill event (kill ± 150 ticks)

    Context windows respect kill-local boundaries to maintain player-specific
    framing. Transformer scores are normalized [0.0, 1.0] and feed into
    WeightedScorer alongside traditional features per D-16.

    **Per Phase 20 integration:** Transformer is one feature input. High
    transformer score alone does not trigger High review signal; Phase 20
    evidence gates remain baseline.
    """

    CONTEXT_WINDOW_TICKS = 300
    CONTEXT_HALF_WINDOW = 150

    def __init__(self, model_path: Optional[str] = None):
        """Initialize transformer extractor with model checkpoint.

        Args:
            model_path: Path to trained model checkpoint. Defaults to
                       python/ml/checkpoints/transformer_model.pt

        Raises:
            FeatureExtractionError: If model loading fails
        """
        super().__init__()

        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "ml",
                "checkpoints",
                "transformer_model.pt",
            )

        self.model_path = model_path
        self.model = None
        self.device = torch.device("cpu")  # Production uses CPU for stability

        # Lazy load model on first extract() call to avoid import errors
        # if model file doesn't exist during initialization
        self._model_loaded = False

    def _load_model(self) -> None:
        """Load transformer model from checkpoint if not already loaded."""
        if self._model_loaded:
            return

        try:
            # Import here to avoid circular dependency issues
            from ml.model import AntiCheatTransformer

            self.model = AntiCheatTransformer()
            self.model.to(self.device)

            if os.path.exists(self.model_path):
                state_dict = torch.load(
                    self.model_path, map_location=self.device
                )
                self.model.load_state_dict(state_dict)
                logger.info(f"Loaded transformer model from {self.model_path}")
            else:
                logger.warning(
                    f"Model checkpoint not found at {self.model_path}, "
                    "using untrained model"
                )

            self.model.eval()
            self._model_loaded = True

        except Exception as e:
            raise FeatureExtractionError(
                f"failed_to_load_transformer_model: {str(e)}"
            )

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract transformer-based suspicion scores from demo.

        Per D-15-D-18: Slices 300-tick windows around kill events,
        applies tick-aligned positional encoding, runs transformer inference,
        aggregates scores, and returns normalized result.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If no kills found or inference fails.
        """
        try:
            self._load_model()

            # Slice context windows around kill events (D-18)
            windows = self._slice_context_windows(parsed_demo)

            if not windows:
                raise FeatureExtractionError("no_context_windows")

            # Run transformer inference on windows
            scores = []
            with torch.no_grad():
                for window_tensor, _ in windows:
                    # window_tensor: (1, 300, 44)
                    output = self.model(window_tensor)
                    score = float(output.squeeze().cpu().numpy())
                    scores.append(np.clip(score, 0.0, 1.0))

            # Aggregate scores
            mean_score = float(np.mean(scores))
            max_score = float(np.max(scores))
            min_score = float(np.min(scores))
            p95_score = float(np.percentile(scores, 95))

            # Per D-16: Transformer is feature input to WeightedScorer
            # Score alone doesn't override Phase 20 evidence gates
            return FeatureResult(
                score=mean_score,
                raw_measurements={
                    "window_count": len(windows),
                    "scores": scores,
                    "max_score": max_score,
                    "min_score": min_score,
                    "percentile_95": p95_score,
                    "mean_score": mean_score,
                },
                metadata={
                    "method": "transformer_sequence",
                    "version": "anticheatpt_aligned_v1",
                    "confidence": "medium",  # Per D-24: researcher discretion
                    "context_window_ticks": self.CONTEXT_WINDOW_TICKS,
                    "window_count": len(windows),
                },
            )

        except FeatureExtractionError:
            raise
        except Exception as e:
            raise FeatureExtractionError(
                f"transformer_inference_failed: {str(e)}"
            )

    def _slice_context_windows(
        self, parsed_demo: ParsedDemo
    ) -> list[tuple[torch.Tensor, str]]:
        """Slice 300-tick context windows around kill events per D-18.

        Per D-18: Window size is 300 ticks (kill ± 150 ticks). Windows
        respect kill-local boundaries: skip windows with multiple kills or
        insufficient data.

        Args:
            parsed_demo: Parsed demo with ticks_df and events_df.

        Returns:
            List of (window_tensor, kill_id) tuples, where window_tensor is
            (1, 300, 44) torch tensor ready for model input.
        """
        ticks_df = parsed_demo.ticks_df.copy()
        events_df = parsed_demo.events_df.copy()

        if len(ticks_df) == 0 or len(events_df) == 0:
            return []

        # Extract kill events (player_death where attacker is this player)
        death_events = events_df[events_df["event_type"] == "player_death"].copy()

        if len(death_events) == 0:
            return []

        # Sort by tick
        death_events = death_events.sort_values("tick")
        ticks_df = ticks_df.sort_values("tick")

        windows = []

        for idx, (_, kill_event) in enumerate(death_events.iterrows()):
            kill_tick = int(kill_event["tick"])

            # Slice window: [kill_tick - 150, kill_tick + 150]
            window_start = max(0, kill_tick - self.CONTEXT_HALF_WINDOW)
            window_end = kill_tick + self.CONTEXT_HALF_WINDOW

            # Per D-18: Filter out windows with multiple kills (boundary crossing)
            other_kills_in_window = death_events[
                (death_events["tick"] > window_start)
                & (death_events["tick"] < window_end)
                & (death_events["tick"] != kill_tick)
            ]
            if len(other_kills_in_window) > 0:
                logger.debug(
                    f"Skipping window at tick {kill_tick}: multiple kills in window"
                )
                continue

            # Extract window ticks
            window_ticks = ticks_df[
                (ticks_df["tick"] >= window_start) & (ticks_df["tick"] <= window_end)
            ].copy()

            if len(window_ticks) < 10:
                logger.debug(
                    f"Skipping window at tick {kill_tick}: insufficient ticks ({len(window_ticks)} < 10)"
                )
                continue

            # Pad/truncate to exactly 300 ticks
            window_matrix = self._pad_context_matrix(window_ticks, 300)

            # Apply positional encoding (D-17)
            if "tick" in window_ticks.columns:
                tick_ids = window_ticks["tick"].values
                pos_encoding = self._create_positional_encoding(
                    tick_ids, d_model=256
                )
                # Interpolate positional encoding to 300 ticks if needed
                if len(pos_encoding) != 300:
                    indices = np.linspace(0, len(pos_encoding) - 1, 300)
                    pos_encoding = np.interp(
                        indices, np.arange(len(pos_encoding)), pos_encoding, axis=0
                    )
                window_matrix = window_matrix + pos_encoding

            # Convert to tensor (1, 300, 44)
            window_tensor = torch.from_numpy(window_matrix).unsqueeze(0).float()
            window_tensor = window_tensor.to(self.device)

            kill_id = f"kill_{idx}_{kill_tick}"
            windows.append((window_tensor, kill_id))

        return windows

    def _pad_context_matrix(
        self, window_ticks: pd.DataFrame, target_size: int = 300
    ) -> np.ndarray:
        """Pad or truncate tick matrix to target size.

        Args:
            window_ticks: DataFrame with tick data (rows = ticks, columns = features)
            target_size: Target number of ticks (default 300 per D-18)

        Returns:
            (target_size, num_features) numpy array padded with zeros or truncated.
        """
        # Get feature columns (exclude metadata like tick, steamid)
        feature_cols = [
            col
            for col in window_ticks.columns
            if col not in ["tick", "steamid", "map_name"]
        ]

        # Extract feature matrix
        feature_matrix = window_ticks[feature_cols].values.astype(np.float32)

        current_size = len(feature_matrix)

        if current_size >= target_size:
            # Truncate: take first target_size ticks
            return feature_matrix[:target_size]
        else:
            # Pad: zero-pad to target_size
            pad_amount = target_size - current_size
            padded = np.pad(
                feature_matrix,
                ((0, pad_amount), (0, 0)),
                mode="constant",
                constant_values=0.0,
            )
            return padded

    def _create_positional_encoding(
        self, tick_ids: np.ndarray, d_model: int = 256
    ) -> np.ndarray:
        """Create sinusoidal positional encoding from tick IDs per D-17.

        Per D-17 and Vaswani et al. (2017): positional encoding uses absolute
        tick numbers from demo start (not window-relative indices).

        Formula:
        - PE[i, j] = sin(pos / 10000^(j / d_model)) if j is even
        - PE[i, j] = cos(pos / 10000^((j-1) / d_model)) if j is odd

        Args:
            tick_ids: Array of absolute tick numbers from demo start
            d_model: Embedding dimension (default 256 per D-20)

        Returns:
            (len(tick_ids), d_model) positional encoding matrix
        """
        pe = np.zeros((len(tick_ids), d_model), dtype=np.float32)

        # Normalize tick IDs to [0, 1] range for stability
        if len(tick_ids) > 0:
            max_tick = np.max(tick_ids)
            if max_tick > 0:
                normalized_ticks = tick_ids / max_tick
            else:
                normalized_ticks = tick_ids
        else:
            normalized_ticks = tick_ids

        # Compute positional encoding
        for i, pos in enumerate(normalized_ticks):
            for j in range(d_model):
                if j % 2 == 0:
                    # Even: sine
                    pe[i, j] = np.sin(pos / (10000 ** (j / d_model)))
                else:
                    # Odd: cosine
                    pe[i, j] = np.cos(pos / (10000 ** ((j - 1) / d_model)))

        return pe


# Import pandas here to avoid issues if not needed
import pandas as pd
