"""Recoil compensation detection feature extractor."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd
from scipy.stats import pearsonr

from .base import AbstractFeatureExtractor, FeatureExtractionError, FeatureResult
from .patterns.movement_sensitivity import apply_movement_sensitivity

if TYPE_CHECKING:
    from parser.types import ParsedDemo

logger = logging.getLogger(__name__)


class RecoilExtractor(AbstractFeatureExtractor):
    """Detects recoil compensation by correlating spray sequences with known weapon patterns.

    This extractor analyzes the consistency and predictability of spray patterns
    to identify automated recoil compensation (common in cheats):

    - Pattern Loading: Loads recoil patterns from data/recoil_patterns/*.json at startup
    - Spray Window: Extracts continuous bursts (max 50 ticks per spray)
    - Pattern Correlation: Uses Pearson correlation against known weapon patterns
      (threshold > 0.7 = suspicious)
    - Consistency Variance: Measures variance of correlations across multiple sprays
      (variance < 0.1 = mechanically consistent bot-like behavior)
    - Spray Velocity Derivatives: First, second, and third-order derivatives (D-02, D-03)
    - Final Score: Combines correlation strength (60%) and consistency (40%)

    All measurements are normalized to [0.0, 1.0] using sigmoid functions.
    """

    # Spray window limit (ticks)
    SPRAY_WINDOW_MAX_TICKS = 50

    # Correlation threshold (> 0.7 is suspicious)
    CORRELATION_THRESHOLD = 0.7

    # Consistency variance threshold (< 0.1 is suspicious)
    CONSISTENCY_VARIANCE_THRESHOLD = 0.1

    # Variance normalization range
    VARIANCE_NORMALIZE_RANGE = 0.3

    # Epsilon to avoid division by zero
    EPSILON = 1e-6

    def __init__(self):
        """Initialize RecoilExtractor by loading recoil patterns from filesystem.

        Patterns are loaded from data/recoil_patterns/*.json at startup.
        If pattern loading fails, logs warning but does not raise (graceful degradation).
        """
        self.patterns = {}
        self._load_patterns()

    def _load_patterns(self) -> None:
        """Load recoil patterns from data/recoil_patterns/ directory.

        Supports both legacy and new pattern formats:

        Legacy format:
        {
            "weapon_name": "AK-47",
            "spray_points": [[x1, y1], [x2, y2], ...],
            "version": "cs2_2025"
        }

        New quantile-based format:
        {
            "weapon_name": "AK-47",
            "quantiles": {
                "q50": {"yaw_offset": float, "pitch_offset": float},
                ...
            },
            "dataset_version": "10.57967/hf/5654"
        }
        """
        patterns_dir = Path(__file__).parent.parent.parent / "data" / "recoil_patterns"

        if not patterns_dir.exists():
            logger.warning(f"Recoil patterns directory not found: {patterns_dir}")
            return

        for json_file in patterns_dir.glob("*.json"):
            try:
                with open(json_file, "r") as f:
                    pattern = json.load(f)

                weapon_name = pattern.get("weapon_name")

                # Try new quantile format first
                if "quantiles" in pattern:
                    # Extract q50 (median) spray points as representative pattern
                    quantiles = pattern.get("quantiles", {})
                    q50 = quantiles.get("q50", {})
                    if q50:
                        # Convert quantile structure to spray points
                        # For now, use q50 as single reference point
                        spray_points = [[
                            q50.get("yaw_offset", 0.0),
                            q50.get("pitch_offset", 0.0)
                        ]]
                        new_points = np.array(spray_points, dtype=float)
                        if weapon_name not in self.patterns or len(new_points) > len(self.patterns[weapon_name]):
                            self.patterns[weapon_name] = new_points
                            logger.info(f"Loaded recoil pattern (quantile): {weapon_name}")
                    else:
                        logger.warning(f"Invalid pattern file {json_file.name}: missing q50 in quantiles")
                        continue
                # Fallback to legacy format
                elif "spray_points" in pattern:
                    spray_points = pattern.get("spray_points", [])
                    if not spray_points:
                        logger.warning(
                            f"Invalid pattern file {json_file.name}: missing spray_points"
                        )
                        continue
                    new_points = np.array(spray_points, dtype=float)
                    if weapon_name not in self.patterns or len(new_points) > len(self.patterns[weapon_name]):
                        self.patterns[weapon_name] = new_points
                        logger.info(f"Loaded recoil pattern (legacy): {weapon_name} ({len(spray_points)} points)")
                else:
                    logger.warning(
                        f"Invalid pattern file {json_file.name}: missing spray_points or quantiles"
                    )
                    continue

            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse pattern file {json_file.name}: {e}")
            except Exception as e:
                logger.warning(f"Error loading pattern {json_file.name}: {e}")

    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract recoil compensation signals from demo data.

        Args:
            parsed_demo: Validated tick and event data.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If fewer than 10 weapon fire events are detected.
        """
        try:
            ticks_df = parsed_demo.ticks_df
            events_df = parsed_demo.events_df

            # a. Weapon fire event extraction
            fire_events = events_df[events_df["event_type"] == "weapon_fire"].copy()

            if len(fire_events) < 10:
                raise FeatureExtractionError("insufficient_sprays")

            # Extract spray sequences
            spray_sequences = []
            weapons_used = set()
            correlation_values = []
            movement_sensitivity_data = []

            # b. Spray sequence extraction per weapon fire event
            for _, fire_event in fire_events.iterrows():
                fire_tick = int(fire_event["tick"])
                weapons_used.add(fire_event.get("weapon_name", "unknown"))

                # Extract ticks around this fire event (continuous shooting burst)
                # Look for ticks where is_shooting == True
                burst_ticks = ticks_df[
                    (ticks_df["tick"] >= fire_tick)
                    & (ticks_df["tick"] <= fire_tick + self.SPRAY_WINDOW_MAX_TICKS)
                    & (ticks_df["is_shooting"] == True)
                ].copy()

                if len(burst_ticks) < 2:
                    continue

                # Sort by tick
                burst_ticks = burst_ticks.sort_values("tick")

                # Extract yaw and pitch deltas (spray coordinates)
                yaws = burst_ticks["yaw"].values
                pitches = burst_ticks["pitch"].values

                # Spray coordinate conversion: delta * sensitivity_px_per_deg
                # Assume sensitivity = 1.0 px/degree
                yaw_deltas = np.diff(yaws)
                pitch_deltas = np.diff(pitches)

                # Build spray as [x, y] coordinates
                spray = np.column_stack((yaw_deltas, pitch_deltas))
                if len(spray) == 0:
                    continue

                # Extract player velocity at fire tick for movement sensitivity
                player_state = ticks_df[ticks_df["tick"] == fire_tick]
                velocity_x = 0.0
                velocity_y = 0.0
                movement_sensitivity_available = True

                if not player_state.empty:
                    if "velocity_x" in ticks_df.columns:
                        velocity_x = float(player_state["velocity_x"].values[0])
                    if "velocity_y" in ticks_df.columns:
                        velocity_y = float(player_state["velocity_y"].values[0])
                else:
                    movement_sensitivity_available = False
                    logger.debug(f"Player velocity data not available at tick {fire_tick}")

                # Apply movement sensitivity adjustment if velocity data available
                velocity_vector = (velocity_x, velocity_y)
                velocity_magnitude = np.sqrt(velocity_x**2 + velocity_y**2)
                spray_adjusted = apply_movement_sensitivity(spray, velocity_vector)

                spray_sequences.append(spray_adjusted)

                # Spray velocity derivatives: per D-02, D-03 (temporal spray compensation patterns)
                spray_magnitudes = np.linalg.norm(spray_adjusted, axis=1) if len(spray_adjusted) > 0 else np.array([])
                if len(spray_magnitudes) > 0:
                    spray_deriv = self._compute_derivatives(spray_magnitudes)
                else:
                    spray_deriv = self._compute_derivatives(np.array([0.0]))

                movement_sensitivity_data.append({
                    "velocity_x": velocity_x,
                    "velocity_y": velocity_y,
                    "velocity_magnitude": velocity_magnitude,
                    "jitter_factor": min(velocity_magnitude / 400.0, 1.0),
                    "available": movement_sensitivity_available,
                    **{f"spray_velocity_{k}": v for k, v in spray_deriv.items()},
                })

            # Validate we have sprays to analyze
            if not spray_sequences:
                raise FeatureExtractionError("insufficient_spray_data")

            # c. Pattern correlation
            if self.patterns:
                for spray in spray_sequences:
                    best_correlation = 0.0

                    # Try correlation with each loaded pattern
                    for weapon_name, pattern in self.patterns.items():
                        # Normalize to same length for correlation
                        min_len = min(len(spray), len(pattern))
                        if min_len < 2:
                            continue

                        spray_normalized = spray[:min_len]
                        pattern_normalized = pattern[:min_len]

                        # Flatten for Pearson correlation
                        spray_flat = spray_normalized.flatten()
                        pattern_flat = pattern_normalized.flatten()

                        # Compute Pearson correlation
                        try:
                            corr, _ = pearsonr(spray_flat, pattern_flat)
                            # Clamp correlation to [0, 1] range
                            corr = np.clip(corr, 0.0, 1.0)
                            best_correlation = max(best_correlation, corr)
                        except Exception:
                            # Skip if correlation computation fails
                            continue

                    correlation_values.append(best_correlation)
            else:
                correlation_values = [0.0]

            # d. Consistency analysis
            if len(correlation_values) < 1:
                raise FeatureExtractionError("correlation_computation_failed")

            mean_correlation = np.mean(correlation_values)
            consistency_variance = np.var(correlation_values)

            # e. Score combination
            # Normalize correlation using sigmoid
            correlation_sigmoid = self._sigmoid_normalize(
                mean_correlation, inflection_point=0.5, scale=2.0
            )

            # Normalize consistency variance
            consistency_score = 1.0 - np.clip(
                consistency_variance / self.VARIANCE_NORMALIZE_RANGE, 0.0, 1.0
            )

            # Final score: 0.6 * correlation + 0.4 * consistency
            final_score = 0.6 * correlation_sigmoid + 0.4 * consistency_score
            
            # Apply player-specific evidence gates and score caps
            score_cap_applied = False
            score_cap_reason = ""
            warnings_list = []
            
            spray_count = len(spray_sequences)
            patterns_available = len(self.patterns) > 0
            
            if not patterns_available:
                final_score = 0.0
                score_cap_applied = True
                score_cap_reason = "no_recoil_patterns_loaded"
                warnings_list.append("No recoil patterns loaded, scoring disabled")
                confidence = "low"
                evidence_strength = "weak"
            elif any(w == "unknown" for w in weapons_used) or not weapons_used:
                final_score = min(0.49, final_score)
                score_cap_applied = True
                score_cap_reason = "unknown_weapon"
                warnings_list.append("Unknown weapon used, capping recoil score")
                confidence = "low"
                evidence_strength = "weak"
            elif spray_count < 5:
                final_score = min(0.49, final_score)
                score_cap_applied = True
                score_cap_reason = f"insufficient_sprays ({spray_count})"
                warnings_list.append(f"Insufficient sprays ({spray_count}), capping recoil score")
                confidence = "low"
                evidence_strength = "weak"
            elif final_score >= 0.49:
                if spray_count < 8:  # Medium count cap
                    final_score = min(0.49, final_score)
                    score_cap_applied = True
                    score_cap_reason = f"insufficient_sprays_for_high_score ({spray_count})"
                    warnings_list.append(f"Insufficient sprays for high score ({spray_count}), capping recoil score")
                    confidence = "medium"
                    evidence_strength = "medium"
                else:
                    confidence = "high" if spray_count >= 10 else "medium"
                    evidence_strength = "strong" if final_score >= 0.7 else "medium"
            else:
                confidence = "high" if spray_count >= 10 else "medium"
                evidence_strength = "medium" if final_score >= 0.3 else "weak"

            self._validate_score(final_score)

            # f. Return FeatureResult
            # Calculate average movement sensitivity statistics
            avg_velocity_magnitude = np.mean([m["velocity_magnitude"] for m in movement_sensitivity_data]) if movement_sensitivity_data else 0.0
            avg_jitter_factor = np.mean([m["jitter_factor"] for m in movement_sensitivity_data]) if movement_sensitivity_data else 0.0
            movement_sensitivity_available = any(m["available"] for m in movement_sensitivity_data)

            raw_measurements = {
                "sprays_detected": len(spray_sequences),
                "spray_window_max_ticks": self.SPRAY_WINDOW_MAX_TICKS,
                "mean_correlation": float(mean_correlation),
                "correlation_values": [float(c) for c in correlation_values],
                "correlation_threshold": self.CORRELATION_THRESHOLD,
                "consistency_variance": float(consistency_variance),
                "consistency_normalized": float(consistency_score),
                "weapons_used": list(weapons_used),
                "sensitivity_px_per_deg": 1.0,
                "correlation_sigmoid_normalized": float(correlation_sigmoid),
                "movement_sensitivity": {
                    "velocity_magnitude_avg": float(avg_velocity_magnitude),
                    "jitter_factor_avg": float(avg_jitter_factor),
                    "available": movement_sensitivity_available,
                    "max_velocity_threshold_ms": 400.0,
                },
            }

            metadata = {
                "method": "recoil_correlation_sigmoid",
                "version": "2.0",  # Updated version to reflect movement sensitivity
                "patterns_loaded": list(self.patterns.keys()),
                "correlation_formula": "scipy.stats.pearsonr(extracted_spray, pattern)",
                "movement_sensitivity_enabled": True,
                "movement_sensitivity_available": movement_sensitivity_available,
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
            raise FeatureExtractionError(f"recoil_extraction_failed: {str(e)}")
