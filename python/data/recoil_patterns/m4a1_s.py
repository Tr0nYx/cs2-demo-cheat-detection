"""M4A1-S recoil pattern data for CS2.

This module defines the M4A1-S spray pattern. The pattern is simplified/placeholder
based on CS2 spray mechanics. M4A1-S has slightly different spray characteristics
than M4A4 (slightly tighter recoil). For v1, this functional pattern is sufficient;
accuracy improvements are planned for v2+.
"""

from python.data.recoil_patterns import RecoilPattern


# M4A1-S spray pattern
# Note: This is a simplified/placeholder pattern. M4A1-S has slightly different spray characteristics than M4A4.
# For v1, a functional pattern is sufficient; accuracy improvements are v2+.

M4A1S = RecoilPattern(
    weapon_id="m4a1_s",
    name="M4A1-S",
    game_version="CS2",
    source="CS2 weapon mechanics reference, simplified pattern, 2025",
    calibrated_date="2025-01-15",  # ISO 8601 date
    spray_pattern=[
        # Initial upward recoil (first 8 ticks) - similar to M4A4 but slightly tighter
        [0.0, -0.95],
        [0.04, -1.25],
        [0.0, -1.45],
        [-0.08, -1.55],
        [0.08, -1.45],
        [0.0, -1.25],
        [-0.04, -0.95],
        [0.04, -0.75],

        # Transition to spread (9-16 ticks)
        [0.18, -0.45],
        [0.12, -0.15],
        [-0.08, 0.05],
        [0.22, 0.25],
        [0.08, 0.55],
        [-0.18, 0.75],
        [0.28, 0.95],
        [0.04, 1.15],

        # Widening spray (17-24 ticks)
        [-0.28, 1.05],
        [0.38, 0.85],
        [0.12, 0.55],
        [-0.22, 0.35],
        [0.32, 0.05],
        [0.04, -0.25],
        [-0.38, -0.45],
        [0.42, -0.75],
    ],
)

__all__ = ["M4A1S"]
