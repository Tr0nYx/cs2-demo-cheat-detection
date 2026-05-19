"""Triggerbot detection feature extractor."""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class TriggerbotExtractor(AbstractFeatureExtractor):
    """Detects triggerbot using reaction times, bimodality coefficient, and instant-kill ratio.

    This extractor analyzes the timing between firing events and kills to identify
    characteristics of automated trigger systems:

    - Reaction Time: Time from weapon fire to kill. Collected across all kills.
    - Bimodality Coefficient: Statistical measure of dual-mode behavior (human vs bot).
      Formula: (skewness² + 1) / (kurtosis + 3 * (n-1)² / ((n-2)(n-3)))
      BC > 0.555 indicates bimodal distribution.
    - Instant-Kill Ratio: Percentage of kills within 2 ticks (human-impossible timing).

    Final score combines bimodality (60%) and instant-kill ratio (40%).
    """

    # Instant-kill threshold in ticks (< 2 ticks indicates impossible human timing)
    INSTANT_KILL_THRESHOLD_TICKS = 2

    # Bimodality coefficient threshold (indicates dual-process behavior)
    BIMODALITY_THRESHOLD = 0.555

    # Minimum reaction times for statistical analysis
    MIN_REACTION_TIMES = 3

    # Ticks per second in CS2 (for conversion to milliseconds)
    TICKS_PER_SECOND = 64

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract triggerbot signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 3 reaction times are detected.
        """
        try:
            events_df = parsed_demo.events_df

            # a. Reaction time collection
            # Align weapon_fire events with subsequent player_death events
            death_events = events_df[events_df["event_type"] == "player_death"].copy()
            fire_events = events_df[events_df["event_type"] == "weapon_fire"].copy()

            if len(death_events) == 0 or len(fire_events) == 0:
                raise FeatureExtractionError("insufficient_reactions")

            reaction_times_ticks = []

            # For each death, find the most recent fire event before it
            for _, death_row in death_events.iterrows():
                death_tick = death_row["tick"]

                # Find fires before this death
                fires_before = fire_events[fire_events["tick"] < death_tick]
                if len(fires_before) > 0:
                    last_fire_tick = fires_before["tick"].max()
                    reaction_time_ticks = death_tick - last_fire_tick
                    reaction_times_ticks.append(reaction_time_ticks)

            if len(reaction_times_ticks) < self.MIN_REACTION_TIMES:
                raise FeatureExtractionError("insufficient_reactions")

            # Convert to milliseconds
            reaction_times_ticks_array = np.array(reaction_times_ticks)
            reaction_times_ms = reaction_times_ticks_array * (1000.0 / self.TICKS_PER_SECOND)

            # b. Bimodality coefficient calculation
            # Formula: BC = (skewness² + 1) / (kurtosis + 3 * (n-1)² / ((n-2)(n-3)))
            n = len(reaction_times_ms)
            skewness = sp_stats.skew(reaction_times_ms)
            kurtosis = sp_stats.kurtosis(reaction_times_ms)

            # Avoid division by zero when n <= 3
            if n <= 3:
                bc_value = 0.0
            else:
                numerator = skewness ** 2 + 1.0
                denominator_base = kurtosis + 3.0 * ((n - 1) ** 2) / (
                    (n - 2) * (n - 3)
                )
                if abs(denominator_base) < 1e-10:
                    bc_value = 0.0
                else:
                    bc_value = numerator / denominator_base

            # Normalize bimodality coefficient
            # BC > 0.555 is suspicious, sigmoid with inflection=0.555, scale=5.0
            norm_bc = self._sigmoid_normalize(
                bc_value, inflection_point=self.BIMODALITY_THRESHOLD, scale=5.0
            )

            # c. Instant-kill ratio
            instant_kills = np.sum(
                reaction_times_ticks_array < self.INSTANT_KILL_THRESHOLD_TICKS
            )
            instant_kill_ratio = float(instant_kills) / len(reaction_times_ticks_array)

            # d. Score combination
            final_score = 0.6 * norm_bc + 0.4 * instant_kill_ratio
            self._validate_score(final_score)

            # Apply player-specific evidence gates and score caps
            independent_signals = []
            if norm_bc >= 0.7:
                independent_signals.append("bimodality")
            if instant_kill_ratio >= 0.3:
                independent_signals.append("instant_kill")

            sample_count = len(reaction_times_ms)
            score_cap_applied = False
            score_cap_reason = ""

            if final_score >= 0.49:
                if instant_kills < 2:
                    final_score = 0.49
                    score_cap_applied = True
                    score_cap_reason = f"insufficient_instant_kills ({instant_kills})"
                    confidence = "medium" if instant_kills >= 1 else "low"
                    evidence_strength = "medium" if instant_kills >= 1 else "weak"
                else:
                    confidence = "high" if sample_count >= 10 else ("medium" if sample_count >= 5 else "low")
                    evidence_strength = "strong" if final_score >= 0.7 else "medium"
            else:
                confidence = "high" if sample_count >= 10 else ("medium" if sample_count >= 5 else "low")
                evidence_strength = "medium" if final_score >= 0.3 else "weak"

            # e. Return FeatureResult
            raw_measurements = {
                "reactions_count": len(reaction_times_ms),
                "reaction_times_ticks": reaction_times_ticks,
                "reaction_times_ms": reaction_times_ms.tolist(),
                "mean_reaction_ms": float(np.mean(reaction_times_ms)),
                "median_reaction_ms": float(np.median(reaction_times_ms)),
                "bimodality_coefficient": float(bc_value),
                "bc_formula": "(skew² + 1) / (kurtosis + 3*(n-1)²/((n-2)(n-3)))",
                "normalized_bc": norm_bc,
                "instant_kill_ratio": instant_kill_ratio,
                "instant_kills_within_2_ticks": int(instant_kills),
                "skewness": float(skewness),
                "kurtosis": float(kurtosis),
            }

            metadata = {
                "method": "triggerbot_bimodality_sigmoid",
                "version": "1.1",
                "bimodality_threshold": self.BIMODALITY_THRESHOLD,
                "instant_kill_threshold_ticks": self.INSTANT_KILL_THRESHOLD_TICKS,
                "bc_weight": 0.6,
                "instant_kill_weight": 0.4,
                "warnings": (
                    ["low_sample_size"] if len(reaction_times_ms) < 5 else []
                ),
                "confidence": confidence,
                "evidence_strength": evidence_strength,
                "score_cap_applied": score_cap_applied,
                "score_cap_reason": score_cap_reason,
                "independent_signals": independent_signals,
                "sample_count": sample_count,
            }
            if score_cap_applied:
                metadata["warnings"].append("score_capped")

            return FeatureResult(
                score=final_score,
                raw_measurements=raw_measurements,
                metadata=metadata,
            )

        except FeatureExtractionError:
            raise
        except Exception as e:
            raise FeatureExtractionError(f"triggerbot_extraction_failed: {str(e)}")
