"""Movement sensitivity integration for recoil pattern analysis.

Accounts for player movement (strafing/AD spam) affecting spray accuracy.
Higher velocity combined with consistent spray patterns is suspicious
(indicates automated aim + movement coordination).
"""

import numpy as np


def apply_movement_sensitivity(
    spray: np.ndarray,
    velocity_vector: tuple[float, float],
    max_velocity: float = 400.0,
) -> np.ndarray:
    """Apply velocity-based jitter adjustment to spray pattern.

    Models how player movement affects spray accuracy. High velocity
    combined with perfect spray consistency is suspicious (bot-like behavior).

    Args:
        spray: Array of shape (N, 2) with [yaw_delta, pitch_delta]
        velocity_vector: Tuple of (vx, vy) player velocity in m/s
        max_velocity: Maximum velocity threshold (default: 400 m/s = max CS2 run speed)

    Returns:
        Adjusted spray array with same shape as input, with velocity-induced jitter
    """
    # Validate input
    if spray is None or len(spray) == 0:
        return spray

    if spray.shape[1] != 2:
        raise ValueError(f"spray must have shape (N, 2), got {spray.shape}")

    # Extract velocity magnitude
    vx, vy = velocity_vector
    velocity_magnitude = np.sqrt(vx**2 + vy**2)

    # Clamp velocity to [0, max_velocity] range
    # Velocity above max_velocity still gets max jitter (1.0)
    jitter_factor = min(velocity_magnitude / max_velocity, 1.0)

    # Apply jitter: spray deviation = ±10% per unit jitter_factor
    # jitter_factor = 0 (stationary) → 0% deviation
    # jitter_factor = 1 (full speed) → 10% deviation
    if jitter_factor > 0.0:
        # Generate random jitter per spray point
        jitter_magnitude = jitter_factor * 0.1
        jitter = np.random.normal(
            0.0, jitter_magnitude, spray.shape
        )
        adjusted_spray = spray * (1.0 + jitter)
    else:
        # Zero velocity → no adjustment
        adjusted_spray = spray.copy()

    return adjusted_spray
