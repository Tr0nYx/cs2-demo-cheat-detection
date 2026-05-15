"""Quantile-based recoil pattern bound computation.

Computes 25th/50th/75th percentile bounds from spray trajectories,
suitable for detecting suspicious spray patterns that deviate from
learned weapon-specific behavior.
"""

from datetime import datetime, timezone
from typing import Optional

import numpy as np

from ..base import FeatureExtractionError


def compute_quantile_bounds(
    spray_trajectories: np.ndarray,
    weapon_name: str,
    dataset_version: str = "10.57967/hf/5654",
) -> dict:
    """Compute quantile-based bounds from spray trajectory data.

    Args:
        spray_trajectories: Array of shape (N, 2) with [yaw_delta, pitch_delta] spray points
        weapon_name: Name of the weapon (e.g., "AK-47", "M4A4")
        dataset_version: Dataset version string for reproducibility

    Returns:
        Dictionary with quantile bounds:
        {
            "weapon_name": str,
            "dataset_version": str,
            "num_sprays": int,
            "quantiles": {
                "q25": {"yaw_offset": float, "pitch_offset": float},
                "q50": {"yaw_offset": float, "pitch_offset": float},
                "q75": {"yaw_offset": float, "pitch_offset": float},
            },
            "bounds": {
                "yaw_min": float, "yaw_max": float,
                "pitch_min": float, "pitch_max": float,
            },
            "percentile_90": float,
            "timestamp": "ISO8601",
        }

    Raises:
        FeatureExtractionError: If spray_trajectories is empty or invalid
    """
    # Validate input
    if spray_trajectories is None or len(spray_trajectories) == 0:
        raise FeatureExtractionError(
            f"Empty spray trajectories for {weapon_name}"
        )

    if spray_trajectories.shape[1] != 2:
        raise FeatureExtractionError(
            f"spray_trajectories must have shape (N, 2), got {spray_trajectories.shape}"
        )

    # Remove NaN values
    spray_clean = spray_trajectories[
        ~np.isnan(spray_trajectories).any(axis=1)
    ]

    if len(spray_clean) == 0:
        raise FeatureExtractionError(
            f"No valid spray data after filtering NaNs for {weapon_name}"
        )

    # Extract yaw and pitch columns
    yaw_deltas = spray_clean[:, 0]
    pitch_deltas = spray_clean[:, 1]

    # Compute quantiles for each axis
    q25_yaw = np.percentile(yaw_deltas, 25)
    q50_yaw = np.percentile(yaw_deltas, 50)
    q75_yaw = np.percentile(yaw_deltas, 75)

    q25_pitch = np.percentile(pitch_deltas, 25)
    q50_pitch = np.percentile(pitch_deltas, 50)
    q75_pitch = np.percentile(pitch_deltas, 75)

    # Compute bounds (min/max of all data)
    yaw_min = np.min(yaw_deltas)
    yaw_max = np.max(yaw_deltas)
    pitch_min = np.min(pitch_deltas)
    pitch_max = np.max(pitch_deltas)

    # Compute 90th percentile as outlier threshold
    combined_deltas = np.linalg.norm(
        spray_clean, axis=1
    )  # L2 norm of [yaw, pitch]
    percentile_90 = np.percentile(combined_deltas, 90)

    # Build result dict
    result = {
        "weapon_name": weapon_name,
        "dataset_version": dataset_version,
        "num_sprays": len(spray_clean),
        "quantiles": {
            "q25": {"yaw_offset": float(q25_yaw), "pitch_offset": float(q25_pitch)},
            "q50": {"yaw_offset": float(q50_yaw), "pitch_offset": float(q50_pitch)},
            "q75": {"yaw_offset": float(q75_yaw), "pitch_offset": float(q75_pitch)},
        },
        "bounds": {
            "yaw_min": float(yaw_min),
            "yaw_max": float(yaw_max),
            "pitch_min": float(pitch_min),
            "pitch_max": float(pitch_max),
        },
        "percentile_90": float(percentile_90),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return result
