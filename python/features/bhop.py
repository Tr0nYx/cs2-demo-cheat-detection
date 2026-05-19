"""Bunnyhopping detection feature extractor."""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class BhopExtractor(AbstractFeatureExtractor):
    """Detects bunnyhopping using jump-land timing and sequence analysis.

    This extractor analyzes the timing and consistency of jumps and landings
    to identify automated bunnyhopping (perfect jump timing is difficult for humans):

    - Jump-Land Pairing: Extracts consecutive jump and land events
    - Flight Time Consistency: Computes coefficient of variation (CV) of flight times
      (CV < 0.2 = suspicious perfect timing)
    - Perfect Jump Ratio: Counts consecutive jumps within 2 ticks of landing
      (ratio > 0.7 = suspicious)
    - Sequence Length: Detects long uninterrupted bunnyhopping sequences
      (length > 10 = suspicious)
    - Jump Timing Derivatives: First, second, and third-order derivatives (D-02, D-03)
    - Final Score: Combines CV (30%), perfect ratio (30%), and sequence (40%)

    All measurements are normalized to [0.0, 1.0] using sigmoid functions.
    """

    # Perfect jump gap threshold (ticks between land and next jump)
    PERFECT_JUMP_GAP_TICKS = 2

    # CV threshold (< 0.2 = suspicious)
    CV_THRESHOLD = 0.2

    # Perfect jump ratio threshold (> 0.7 = suspicious)
    PERFECT_JUMP_RATIO_THRESHOLD = 0.7

    # Sequence length threshold (> 10 = suspicious)
    SEQUENCE_LENGTH_THRESHOLD = 10

    # Epsilon to avoid division by zero
    EPSILON = 1e-6

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract bunnyhopping signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 5 jump sequences are detected.
        """
        try:
            events_df = parsed_demo.events_df

            # a. Jump-land event pairing
            jump_events = events_df[events_df["event_type"] == "player_jump"].copy()
            land_events = events_df[events_df["event_type"] == "player_land"].copy()

            if len(jump_events) < 5 or len(land_events) < 5:
                raise FeatureExtractionError("insufficient_jumps")

            # Sort by tick
            jump_events = jump_events.sort_values("tick")
            land_events = land_events.sort_values("tick")

            # Extract tick values
            jump_ticks = jump_events["tick"].values
            land_ticks = land_events["tick"].values

            # Match jumps and lands: for each jump, find the next land
            flight_times = []

            for jump_tick in jump_ticks:
                # Find the next land tick after this jump
                next_lands = land_ticks[land_ticks > jump_tick]
                if len(next_lands) > 0:
                    land_tick = next_lands[0]
                    flight_time = land_tick - jump_tick
                    flight_times.append(flight_time)

            if len(flight_times) < 5:
                raise FeatureExtractionError("insufficient_jump_pairs")

            flight_times = np.array(flight_times)

            # Jump timing derivatives: per D-02, D-03 (temporal consistency patterns)
            jump_timing_deriv = self._compute_derivatives(flight_times)

            # b. Jump-land timing analysis (CV = std / mean)
            mean_flight = np.mean(flight_times)
            std_flight = np.std(flight_times)

            if mean_flight < self.EPSILON:
                raise FeatureExtractionError("invalid_flight_times")

            cv_value = std_flight / (mean_flight + self.EPSILON)

            # Normalize CV using sigmoid
            norm_cv = self._sigmoid_normalize(cv_value, inflection_point=0.2, scale=20.0)

            # c. Perfect jump ratio analysis
            perfect_jumps = 0
            total_jump_pairs = len(jump_ticks) - 1

            for i in range(len(jump_ticks) - 1):
                current_jump_tick = jump_ticks[i]
                next_jump_tick = jump_ticks[i + 1]

                # Find landing between these jumps
                lands_between = land_ticks[
                    (land_ticks > current_jump_tick) & (land_ticks < next_jump_tick)
                ]

                if len(lands_between) > 0:
                    land_tick = lands_between[-1]  # Last land before next jump
                    gap = next_jump_tick - land_tick

                    # Perfect if next jump within 2 ticks of landing
                    if gap <= self.PERFECT_JUMP_GAP_TICKS:
                        perfect_jumps += 1

            perfect_jump_ratio = (
                perfect_jumps / total_jump_pairs if total_jump_pairs > 0 else 0.0
            )

            # Normalize perfect jump ratio using sigmoid
            norm_perfect = self._sigmoid_normalize(
                perfect_jump_ratio, inflection_point=0.7, scale=5.0
            )

            # d. Sequence length analysis
            # Find maximum consecutive jumps within 2-tick gaps
            max_sequence_length = 1
            current_sequence = 1

            for i in range(len(jump_ticks) - 1):
                current_jump_tick = jump_ticks[i]
                next_jump_tick = jump_ticks[i + 1]

                # Check if there's a landing between
                lands_between = land_ticks[
                    (land_ticks > current_jump_tick) & (land_ticks < next_jump_tick)
                ]

                if len(lands_between) > 0:
                    land_tick = lands_between[-1]
                    gap = next_jump_tick - land_tick

                    # Continue sequence if gap is small
                    if gap <= self.PERFECT_JUMP_GAP_TICKS:
                        current_sequence += 1
                    else:
                        max_sequence_length = max(max_sequence_length, current_sequence)
                        current_sequence = 1
                else:
                    max_sequence_length = max(max_sequence_length, current_sequence)
                    current_sequence = 1

            max_sequence_length = max(max_sequence_length, current_sequence)

            # Normalize sequence length using sigmoid
            norm_sequence = self._sigmoid_normalize(
                max_sequence_length, inflection_point=10, scale=0.2
            )

            # e. Score combination
            # Final score: 0.3 * norm_cv + 0.3 * norm_perfect + 0.4 * norm_sequence
            final_score = 0.3 * norm_cv + 0.3 * norm_perfect + 0.4 * norm_sequence
            
            # Apply player-specific evidence gates and score caps
            score_cap_applied = False
            score_cap_reason = ""
            warnings_list = []
            
            jump_count = len(jump_ticks)
            
            if jump_count < 10:
                final_score = min(0.49, final_score)
                score_cap_applied = True
                score_cap_reason = f"insufficient_jumps ({jump_count})"
                warnings_list.append(f"Low jump count ({jump_count}), capping bhop score")
                confidence = "low"
                evidence_strength = "weak"
            elif final_score >= 0.49:
                if perfect_jumps < 3:
                    final_score = min(0.49, final_score)
                    score_cap_applied = True
                    score_cap_reason = f"insufficient_perfect_jumps ({perfect_jumps})"
                    warnings_list.append(f"Insufficient perfect jumps ({perfect_jumps}), capping bhop score")
                    confidence = "medium"
                    evidence_strength = "medium"
                else:
                    confidence = "high" if jump_count >= 20 else "medium"
                    evidence_strength = "strong" if final_score >= 0.7 else "medium"
            else:
                confidence = "high" if jump_count >= 20 else "medium"
                evidence_strength = "medium" if final_score >= 0.3 else "weak"

            self._validate_score(final_score)

            # f. Return FeatureResult
            raw_measurements = {
                "total_jumps": len(jump_ticks),
                "flight_times_ticks": [float(f) for f in flight_times],
                "flight_time_mean": float(mean_flight),
                "flight_time_std": float(std_flight),
                "timing_consistency_cv": float(cv_value),
                "cv_threshold": self.CV_THRESHOLD,
                "perfect_jump_ratio": float(perfect_jump_ratio),
                "perfect_jump_threshold": self.PERFECT_JUMP_RATIO_THRESHOLD,
                "perfect_jump_count": perfect_jumps,
                "max_sequence_length": max_sequence_length,
                "sequence_threshold": self.SEQUENCE_LENGTH_THRESHOLD,
                "normalized_cv": float(norm_cv),
                "normalized_perfect": float(norm_perfect),
                "normalized_sequence": float(norm_sequence),
            }
            raw_measurements.update({
                f"jump_timing_{k}": v for k, v in jump_timing_deriv.items()
            })

            metadata = {
                "method": "bhop_timing_sequence_sigmoid",
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
            raise FeatureExtractionError(f"bhop_extraction_failed: {str(e)}")
