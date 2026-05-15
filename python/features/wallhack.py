"""Wallhack detection feature extractor."""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class WallhackExtractor(AbstractFeatureExtractor):
    """Detects wallhack using sound timeline, pre-aim detection, and crosshair delta analysis.

    This extractor analyzes aim behavior relative to information availability
    (sound events, visual peeks) to identify characteristics of vision-enhanced aiming:

    - Sound Timeline: Detects pre-aim (aim change before footstep) vs post-aim.
      Pre-aim ratio > 0.3 is suspicious.
    - Pre-Aim Detection: Yaw delta > 10 degrees/tick occurring 10+ ticks before
      a footstep event indicates aiming without auditory confirmation.
    - Crosshair Delta: Average angle offset between aim and opponent at peek.
      < 5 degrees indicates instant-on alignment (wallhack characteristic).

    Final score combines: 0.4 * norm_preAim + 0.3 * norm_sound + 0.3 * norm_delta
    """

    # Pre-aim detection thresholds
    PRE_AIM_YAW_DELTA_THRESHOLD_DEG = 10
    PRE_AIM_TICKS_BEFORE_FOOTSTEP = 10
    PRE_AIM_SUSPICIOUS_RATIO_THRESHOLD = 0.3

    # Crosshair delta threshold (degrees at peek)
    CROSSHAIR_DELTA_THRESHOLD_DEG = 5

    # Minimum peeks required for extraction
    MIN_PEEKS = 3

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract wallhack signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 3 peeks or insufficient footsteps detected.
        """
        try:
            ticks_df = parsed_demo.ticks_df
            events_df = parsed_demo.events_df

            # Get death events (represent successful peeks)
            death_events = events_df[events_df["event_type"] == "player_death"].copy()
            footstep_events = events_df[
                events_df["event_type"] == "player_footstep"
            ].copy()

            if len(death_events) < self.MIN_PEEKS:
                raise FeatureExtractionError("insufficient_peeks")

            if len(footstep_events) == 0:
                raise FeatureExtractionError("insufficient_data_for_wallhack")

            # a. Sound timeline analysis: pre-aim detection
            suspicious_preAim_count = 0
            total_aim_transitions = 0

            # Get all yaw changes in the demo
            ticks_df = ticks_df.sort_values("tick")
            yaw_values = ticks_df["yaw"].values
            yaw_deltas = np.abs(np.diff(yaw_values))

            if len(yaw_deltas) > 0:
                # Count large yaw transitions (> 10 degrees)
                large_yaw_transitions = yaw_deltas > self.PRE_AIM_YAW_DELTA_THRESHOLD_DEG
                total_aim_transitions = np.sum(large_yaw_transitions)

                # For each large yaw transition, check if it occurs before a footstep
                transition_indices = np.where(large_yaw_transitions)[0]

                for transition_idx in transition_indices:
                    transition_tick = ticks_df.iloc[transition_idx + 1]["tick"]

                    # Find footsteps after this transition
                    footsteps_after = footstep_events[
                        footstep_events["tick"] > transition_tick
                    ]

                    if len(footsteps_after) > 0:
                        next_footstep_tick = footsteps_after["tick"].min()
                        ticks_until_footstep = next_footstep_tick - transition_tick

                        # If large yaw change occurs >= 10 ticks before footstep, it's suspicious
                        if ticks_until_footstep >= self.PRE_AIM_TICKS_BEFORE_FOOTSTEP:
                            suspicious_preAim_count += 1

            # Calculate pre-aim ratio
            if total_aim_transitions > 0:
                preAim_ratio = suspicious_preAim_count / total_aim_transitions
            else:
                preAim_ratio = 0.0

            # Normalize pre-aim ratio
            norm_preAim = self._sigmoid_normalize(
                preAim_ratio, inflection_point=self.PRE_AIM_SUSPICIOUS_RATIO_THRESHOLD,
                scale=5.0
            )

            # b. Sound timeline: count suspicious pre-aim as percentage
            suspicious_ratio = preAim_ratio
            norm_sound = self._sigmoid_normalize(
                suspicious_ratio, inflection_point=self.PRE_AIM_SUSPICIOUS_RATIO_THRESHOLD,
                scale=5.0
            )

            # c. Crosshair-on-peek delta analysis
            # For each death (peek), measure crosshair alignment
            crosshair_deltas = []

            for _, death_row in death_events.iterrows():
                death_tick = death_row["tick"]

                # Get tick state at death
                death_tick_data = ticks_df[ticks_df["tick"] == death_tick]
                if len(death_tick_data) == 0:
                    continue

                # Get yaw at death (crosshair position as proxy)
                yaw_at_death = death_tick_data["yaw"].iloc[0]

                # Estimate opponent position (simplified: use average yaw of prior ticks as "expected" position)
                prior_ticks = ticks_df[ticks_df["tick"] < death_tick].tail(10)
                if len(prior_ticks) > 0:
                    expected_yaw = np.mean(prior_ticks["yaw"].values)
                    crosshair_delta = abs(yaw_at_death - expected_yaw)
                    crosshair_deltas.append(crosshair_delta)

            if len(crosshair_deltas) > 0:
                crosshair_delta_avg = np.mean(crosshair_deltas)
            else:
                crosshair_delta_avg = 0.0

            # Normalize crosshair delta
            # < 5 degrees = instant-on (suspicious)
            norm_delta = self._sigmoid_normalize(
                crosshair_delta_avg, inflection_point=self.CROSSHAIR_DELTA_THRESHOLD_DEG,
                scale=0.2
            )

            # d. Score combination
            final_score = 0.4 * norm_preAim + 0.3 * norm_sound + 0.3 * norm_delta
            self._validate_score(final_score)

            # e. Return FeatureResult
            raw_measurements = {
                "pre_aim_count": int(suspicious_preAim_count),
                "total_aim_transitions": int(total_aim_transitions),
                "pre_aim_ratio": float(preAim_ratio),
                "pre_aim_normalized": norm_preAim,
                "sound_timeline_suspicious_count": int(suspicious_preAim_count),
                "sound_timeline_suspicious_ratio": float(suspicious_ratio),
                "sound_timeline_normalized": norm_sound,
                "crosshair_deltas": crosshair_deltas,
                "crosshair_delta_avg": float(crosshair_delta_avg),
                "crosshair_delta_threshold_deg": self.CROSSHAIR_DELTA_THRESHOLD_DEG,
                "crosshair_delta_normalized": norm_delta,
                "peeks_analyzed": len(death_events),
            }

            metadata = {
                "method": "wallhack_preAim_sound_delta_sigmoid",
                "version": "1.0",
                "pre_aim_yaw_threshold_deg": self.PRE_AIM_YAW_DELTA_THRESHOLD_DEG,
                "pre_aim_ticks_before_footstep": self.PRE_AIM_TICKS_BEFORE_FOOTSTEP,
                "pre_aim_weight": 0.4,
                "sound_timeline_weight": 0.3,
                "crosshair_delta_weight": 0.3,
                "warnings": (
                    ["insufficient_peeks"] if len(death_events) < 5 else []
                ),
            }

            return FeatureResult(
                score=final_score,
                raw_measurements=raw_measurements,
                metadata=metadata,
            )

        except FeatureExtractionError:
            raise
        except Exception as e:
            raise FeatureExtractionError(f"wallhack_extraction_failed: {str(e)}")
