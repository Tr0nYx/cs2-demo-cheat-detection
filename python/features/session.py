"""Session consistency detection feature extractor."""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class SessionConsistencyExtractor(AbstractFeatureExtractor):
    """Detects cheating by analyzing consistency across rounds and warmup patterns.

    This extractor analyzes player performance stability across rounds to identify
    characteristics of automated aiming (perfect consistency) vs. human players
    (warmup phase, variable performance):

    - Per-Round Segmentation: Divides demo into rounds using round_start/round_end events
    - Per-Round Snap Ratio: Computes aim snap metrics within each round
    - Consistency Variance: Measures variance of snap ratios across rounds
      (variance < 0.05 = suspiciously consistent bot-like behavior)
    - Warmup Curve: Analyzes correlation of round number with performance
      (positive correlation = human-like improvement; no trend = suspicious)
    - Final Score: Combines consistency (60%) and warmup trend (40%)

    All measurements are normalized to [0.0, 1.0] using sigmoid functions.
    """

    # Variance threshold (< 0.05 = suspicious)
    CONSISTENCY_VARIANCE_THRESHOLD = 0.05

    # Warmup trend threshold (< 0.0 = no improvement)
    WARMUP_TREND_THRESHOLD = 0.0

    # Epsilon to avoid division by zero
    EPSILON = 1e-6

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract session consistency signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 3 rounds are detected.
        """
        try:
            ticks_df = parsed_demo.ticks_df
            events_df = parsed_demo.events_df

            # a. Per-round segmentation
            round_start_events = events_df[events_df["event_type"] == "round_start"].copy()
            round_end_events = events_df[events_df["event_type"] == "round_end"].copy()

            if len(round_start_events) < 3 or len(round_end_events) < 3:
                raise FeatureExtractionError("insufficient_rounds")

            # Sort by tick
            round_start_events = round_start_events.sort_values("tick")
            round_end_events = round_end_events.sort_values("tick")

            # Extract tick boundaries
            round_starts = round_start_events["tick"].values
            round_ends = round_end_events["tick"].values

            # Build round windows: match starts and ends
            rounds = []
            for start_tick in round_starts:
                # Find the next end tick after this start
                next_ends = round_ends[round_ends > start_tick]
                if len(next_ends) > 0:
                    end_tick = next_ends[0]
                    rounds.append((start_tick, end_tick))

            if len(rounds) < 3:
                raise FeatureExtractionError("insufficient_valid_rounds")

            # b. Per-round snap ratio computation
            snap_ratio_per_round = []

            for round_num, (start_tick, end_tick) in enumerate(rounds, start=1):
                # Extract ticks for this round
                round_ticks = ticks_df[
                    (ticks_df["tick"] >= start_tick) & (ticks_df["tick"] <= end_tick)
                ].copy()

                if len(round_ticks) < 2:
                    # If round has insufficient data, use neutral score
                    snap_ratio_per_round.append(0.5)
                    continue

                # Sort by tick
                round_ticks = round_ticks.sort_values("tick")

                # Compute snap ratio: max(|Δyaw|) / mean(|Δyaw|)
                yaw_values = round_ticks["yaw"].values
                yaw_deltas = np.abs(np.diff(yaw_values))

                if len(yaw_deltas) == 0 or np.mean(yaw_deltas) < self.EPSILON:
                    snap_ratio = 0.5  # Neutral score if no aim changes
                else:
                    snap_ratio = np.max(yaw_deltas) / (np.mean(yaw_deltas) + self.EPSILON)
                    # Normalize snap ratio to [0, 1]
                    snap_ratio = np.clip(snap_ratio / 2.0, 0.0, 1.0)

                snap_ratio_per_round.append(snap_ratio)

            # c. Consistency variance analysis
            snap_ratio_array = np.array(snap_ratio_per_round)
            consistency_variance = np.var(snap_ratio_array)

            # Normalize consistency variance using sigmoid
            norm_consistency = 1.0 - self._sigmoid_normalize(
                consistency_variance, inflection_point=0.05, scale=50.0
            )

            # d. Warmup curve detection
            # Correlation of round number with snap ratio
            round_numbers = np.arange(1, len(snap_ratio_per_round) + 1, dtype=float)

            if len(round_numbers) > 1 and np.std(snap_ratio_array) > 1e-9:
                # Compute Pearson correlation
                correlation_coef = np.corrcoef(round_numbers, snap_ratio_array)[0, 1]

                # Handle NaN case
                if np.isnan(correlation_coef):
                    correlation_coef = 0.0
            else:
                correlation_coef = 0.0

            # Normalize warmup trend using sigmoid
            # Absence of learning (correlation near 0 or negative) = suspicious
            norm_warmup = 1.0 - self._sigmoid_normalize(
                correlation_coef, inflection_point=0.2, scale=5.0
            )

            # e. Score combination
            # final_score = 0.6 * consistency + 0.4 * warmup
            final_score = 0.6 * norm_consistency + 0.4 * norm_warmup
            
            # Apply player-specific evidence gates and score caps
            score_cap_applied = False
            score_cap_reason = ""
            warnings_list = []
            
            round_count = len(rounds)
            
            # Count rounds with sufficient ticks
            sufficient_ticks_rounds = 0
            for start_tick, end_tick in rounds:
                round_ticks = ticks_df[
                    (ticks_df["tick"] >= start_tick) & (ticks_df["tick"] <= end_tick)
                ]
                if len(round_ticks) >= 2:
                    sufficient_ticks_rounds += 1
            
            if round_count < 5:
                final_score = min(0.49, final_score)
                score_cap_applied = True
                score_cap_reason = f"insufficient_rounds ({round_count})"
                warnings_list.append(f"Low round count ({round_count}), capping session consistency score")
                confidence = "low"
                evidence_strength = "weak"
            elif sufficient_ticks_rounds < 3:
                final_score = min(0.49, final_score)
                score_cap_applied = True
                score_cap_reason = f"insufficient_round_measurements ({sufficient_ticks_rounds})"
                warnings_list.append(f"Low valid round measurements ({sufficient_ticks_rounds}), capping session consistency score")
                confidence = "low"
                evidence_strength = "weak"
            elif final_score >= 0.49:
                confidence = "high" if round_count >= 8 else "medium"
                evidence_strength = "strong" if final_score >= 0.7 else "medium"
            else:
                confidence = "high" if round_count >= 8 else "medium"
                evidence_strength = "medium" if final_score >= 0.3 else "weak"

            self._validate_score(final_score)

            # f. Return FeatureResult
            raw_measurements = {
                "rounds_analyzed": len(rounds),
                "sufficient_ticks_rounds": sufficient_ticks_rounds,
                "per_round_scores": [float(s) for s in snap_ratio_per_round],
                "consistency_variance": float(consistency_variance),
                "variance_threshold": self.CONSISTENCY_VARIANCE_THRESHOLD,
                "consistency_normalized": float(norm_consistency),
                "warmup_trend_correlation": float(correlation_coef),
                "warmup_trend_threshold": self.WARMUP_TREND_THRESHOLD,
                "warmup_trend_normalized": float(norm_warmup),
                "round_numbers": [int(r) for r in round_numbers],
            }

            metadata = {
                "method": "session_variance_warmup_sigmoid",
                "version": "1.0",
                "warnings": warnings_list,
                "score_cap_applied": score_cap_applied,
                "score_cap_reason": score_cap_reason,
                "confidence": confidence,
                "evidence_strength": evidence_strength,
            }

            return FeatureResult(
                score=final_score,
                raw_measurements=raw_measurements,
                metadata=metadata,
            )

        except FeatureExtractionError:
            raise
        except Exception as e:
            raise FeatureExtractionError(f"session_extraction_failed: {str(e)}")
