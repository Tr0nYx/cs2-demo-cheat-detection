"""M4A4 recoil pattern data for CS2.

This module defines the M4A4 spray pattern. The pattern is simplified/placeholder
based on CS2 spray mechanics. For v1, this functional pattern is sufficient;
accuracy improvements are planned for v2+.
"""

from python.data.recoil_patterns import RecoilPattern


# M4A4 spray pattern
# Note: This is a simplified/placeholder pattern based on CS2 spray mechanics.
# For v1, a functional pattern is sufficient; accuracy improvements are v2+.

M4A4 = RecoilPattern(
    weapon_id="m4a4",
    name="M4A4",
    game_version="CS2",
    source="CS2 weapon mechanics reference, simplified pattern, 2025",
    calibrated_date="2025-01-15",  # ISO 8601 date
    spray_pattern=[
        # Initial upward recoil (first 8 ticks)
        [0.0, -1.0],
        [0.05, -1.3],
        [0.0, -1.5],
        [-0.1, -1.6],
        [0.1, -1.5],
        [0.0, -1.3],
        [-0.05, -1.0],
        [0.05, -0.8],

        # Transition to spread (9-16 ticks)
        [0.2, -0.5],
        [0.15, -0.2],
        [-0.1, 0.0],
        [0.25, 0.2],
        [0.1, 0.5],
        [-0.2, 0.7],
        [0.3, 0.9],
        [0.05, 1.1],

        # Widening spray (17-24 ticks)
        [-0.3, 1.0],
        [0.4, 0.8],
        [0.15, 0.5],
        [-0.25, 0.3],
        [0.35, 0.0],
        [0.05, -0.3],
        [-0.4, -0.5],
        [0.45, -0.8],
    ],
)

__all__ = ["M4A4"]
