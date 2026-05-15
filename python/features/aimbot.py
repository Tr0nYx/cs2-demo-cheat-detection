"""Aimbot detection feature extractor."""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class AimbotExtractor(AbstractFeatureExtractor):
    """Detects aimbot using snap ratio, angular velocity, angular jerk, and reaction proximity.

    This extractor analyzes aim behavior around kill events to identify characteristics
    of automated aiming systems:

    - Snap Ratio: Ratio of max aim change to average aim change within kill window.
      Values > 1.5 indicate sudden adjustments (snap).
    - Angular Velocity: Rate of aim change. Humans are limited to ~90 deg/sec.
    - Angular Jerk: Acceleration of aim changes. Mechanical systems show > 2 deg/sec².
    - Reaction Proxy: Time from auditory stimulus to aim adjustment.

    All measurements are normalized to [0.0, 1.0] using sigmoid functions,
    and the final score is the maximum of the normalized sub-scores.
    """

    # Kill window size in ticks before kill_tick
    KILL_WINDOW_TICKS = 10

    # Angular velocity threshold (human physical limit)
    ANGULAR_VELOCITY_THRESHOLD_DEG_PER_TICK = 90

    # Angular jerk threshold (suspicious acceleration)
    ANGULAR_JERK_THRESHOLD_DEG_PER_TICK_SQ = 2

    # Reaction proxy threshold (milliseconds)
    REACTION_PROXY_THRESHOLD_MS = 50

    # Epsilon to avoid division by zero
    EPSILON = 1e-6

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract aimbot signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 1 kill is detected.
        """
        try:
            # a. Kill detection: find all player_death events
            ticks_df = parsed_demo.ticks_df
            events_df = parsed_demo.events_df

            # Filter death events
            death_events = events_df[events_df["event_type"] == "player_death"].copy()

            if len(death_events) == 0:
                raise FeatureExtractionError("insufficient_kills")

            # Extract kill ticks
            kill_ticks = death_events["tick"].values

            # Initialize measurement lists
            snap_ratio_values = []
            angular_velocity_values = []
            angular_jerk_values = []
            reaction_proxy_values = []

            # b-d. Process each kill
            for kill_tick in kill_ticks:
                # Extract kill window
                window_start = max(0, kill_tick - self.KILL_WINDOW_TICKS)
                window_ticks = ticks_df[
                    (ticks_df["tick"] >= window_start) & (ticks_df["tick"] <= kill_tick)
                ].copy()

                if len(window_ticks) < 2:
                    continue

                # Sort by tick to ensure ordering
                window_ticks = window_ticks.sort_values("tick")

                # Get yaw values
                yaw_values = window_ticks["yaw"].values

                # Snap ratio: max(|Δyaw|) / mean(|Δyaw|)
                yaw_deltas = np.abs(np.diff(yaw_values))
                if len(yaw_deltas) > 0 and np.mean(yaw_deltas) > self.EPSILON:
                    snap_ratio = np.max(yaw_deltas) / (
                        np.mean(yaw_deltas) + self.EPSILON
                    )
                    snap_ratio_values.append(snap_ratio)

                # Angular velocity: (max(yaw) - min(yaw)) / window_size_ticks
                yaw_range = np.max(yaw_values) - np.min(yaw_values)
                window_size = len(yaw_values)
                if window_size > 0:
                    angular_velocity = yaw_range / window_size
                    angular_velocity_values.append(angular_velocity)

                # Angular jerk: second derivative of yaw
                if len(yaw_deltas) > 1:
                    velocity_deltas = np.abs(np.diff(yaw_deltas))
                    if len(velocity_deltas) > 0:
                        max_jerk = np.max(velocity_deltas)
                        angular_jerk_values.append(max_jerk)

                # e. Reaction proxy (time from footstep to snap detection)
                # Find footsteps before this kill
                footstep_events = events_df[
                    (events_df["event_type"] == "player_footstep")
                    & (events_df["tick"] < kill_tick)
                ]
                if len(footstep_events) > 0:
                    last_footstep_tick = footstep_events["tick"].max()
                    reaction_ticks = kill_tick - last_footstep_tick
                    reaction_proxy_values.append(reaction_ticks)

            # Validate we have measurements
            if (
                not snap_ratio_values
                and not angular_velocity_values
                and not angular_jerk_values
            ):
                raise FeatureExtractionError("insufficient_measurements")

            # Normalize each sub-feature
            raw_measurements = {
                "kills_detected": len(kill_ticks),
            }

            # Snap ratio normalization
            if snap_ratio_values:
                mean_snap = np.mean(snap_ratio_values)
                norm_snap = self._sigmoid_normalize(mean_snap, inflection_point=1.0, scale=2.0)
                raw_measurements.update({
                    "snap_ratio_values": snap_ratio_values,
                    "mean_snap_ratio": mean_snap,
                    "normalized_snap": norm_snap,
                })
                norm_snap_val = norm_snap
            else:
                norm_snap_val = 0.0
                raw_measurements.update({
                    "snap_ratio_values": [],
                    "mean_snap_ratio": None,
                    "normalized_snap": 0.0,
                })

            # Angular velocity normalization
            if angular_velocity_values:
                mean_av = np.mean(angular_velocity_values)
                norm_av = self._sigmoid_normalize(
                    mean_av, inflection_point=90, scale=1.0 / 45.0
                )
                raw_measurements.update({
                    "angular_velocity_values": angular_velocity_values,
                    "mean_angular_velocity": mean_av,
                    "normalized_av": norm_av,
                })
                norm_av_val = norm_av
            else:
                norm_av_val = 0.0
                raw_measurements.update({
                    "angular_velocity_values": [],
                    "mean_angular_velocity": None,
                    "normalized_av": 0.0,
                })

            # Angular jerk normalization
            if angular_jerk_values:
                max_jerk = np.max(angular_jerk_values)
                norm_jerk = self._sigmoid_normalize(max_jerk, inflection_point=2.0, scale=0.5)
                raw_measurements.update({
                    "angular_jerk_max": max_jerk,
                    "normalized_jerk": norm_jerk,
                })
                norm_jerk_val = norm_jerk
            else:
                norm_jerk_val = 0.0
                raw_measurements.update({
                    "angular_jerk_max": None,
                    "normalized_jerk": 0.0,
                })

            # Reaction proxy normalization
            if reaction_proxy_values:
                reaction_proxy_median = np.median(reaction_proxy_values)
                # Convert ticks to milliseconds (64 ticks/sec)
                reaction_proxy_median_ms = reaction_proxy_median * (1000.0 / 64.0)
                norm_reaction = self._sigmoid_normalize(
                    reaction_proxy_median_ms, inflection_point=50, scale=0.02
                )
                raw_measurements.update({
                    "reaction_proxy_median_ticks": reaction_proxy_median,
                    "reaction_proxy_median_ms": reaction_proxy_median_ms,
                    "normalized_reaction": norm_reaction,
                })
                norm_reaction_val = norm_reaction
            else:
                norm_reaction_val = 0.0
                raw_measurements.update({
                    "reaction_proxy_median_ticks": None,
                    "reaction_proxy_median_ms": None,
                    "normalized_reaction": 0.0,
                })

            # f. Final score: max of all normalized sub-scores
            final_score = max(norm_snap_val, norm_av_val, norm_jerk_val)
            self._validate_score(final_score)

            # g. Return FeatureResult
            metadata = {
                "method": "aimbot_multifeature_sigmoid",
                "version": "1.0",
                "kill_window_ticks": self.KILL_WINDOW_TICKS,
                "angular_velocity_threshold_deg_per_tick": self.ANGULAR_VELOCITY_THRESHOLD_DEG_PER_TICK,
                "angular_jerk_threshold_deg_per_tick_sq": self.ANGULAR_JERK_THRESHOLD_DEG_PER_TICK_SQ,
                "warnings": [],
            }

            return FeatureResult(
                score=final_score,
                raw_measurements=raw_measurements,
                metadata=metadata,
            )

        except FeatureExtractionError:
            raise
        except Exception as e:
            raise FeatureExtractionError(f"aimbot_extraction_failed: {str(e)}")
