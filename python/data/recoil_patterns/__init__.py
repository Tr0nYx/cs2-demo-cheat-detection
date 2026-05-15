"""Recoil pattern data for CS2 weapons.

This module contains weapon-specific recoil patterns represented as RecoilPattern dataclasses.
Each pattern includes metadata (weapon_id, name, game_version, source, calibrated_date) and
a spray_pattern (list of [x, y] pixel displacement vectors per tick).

Recoil patterns are validated on import to ensure consistency and catch errors early.
"""

from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class RecoilPattern:
    """Represents a weapon's recoil spray pattern in CS2.

    Fields:
        weapon_id: Unique identifier for the weapon (e.g., "ak47", "m4a4")
        name: Human-readable weapon name (e.g., "AK-47")
        game_version: Game version (e.g., "CS2", "CS:GO")
        source: Source of the pattern data (e.g., "Community spray tests, 2025")
        calibrated_date: ISO 8601 date when pattern was calibrated
        spray_pattern: List of [x, y] vectors representing recoil displacement per tick
    """
    weapon_id: str
    name: str
    game_version: str
    source: str
    calibrated_date: str  # ISO 8601 format (YYYY-MM-DD)
    spray_pattern: List[Tuple[float, float]]

    def __post_init__(self):
        """Validate pattern on initialization."""
        if not self.weapon_id:
            raise ValueError("weapon_id must not be empty")
        if not isinstance(self.weapon_id, str):
            raise ValueError(f"weapon_id must be str, got {type(self.weapon_id)}")
        if not self.spray_pattern:
            raise ValueError(f"spray_pattern for {self.weapon_id} must not be empty")
        if not isinstance(self.spray_pattern, list):
            raise ValueError(f"spray_pattern must be a list, got {type(self.spray_pattern)}")
        for i, point in enumerate(self.spray_pattern):
            if not isinstance(point, (tuple, list)) or len(point) != 2:
                raise ValueError(f"spray_pattern[{i}] must be [x, y], got {point}")
            try:
                x, y = float(point[0]), float(point[1])
            except (TypeError, ValueError):
                raise ValueError(f"spray_pattern[{i}] values must be numeric, got {point}")


# Import weapon patterns after class definition to avoid circular imports
try:
    from python.data.recoil_patterns.ak47 import AK47
    from python.data.recoil_patterns.m4a4 import M4A4
    from python.data.recoil_patterns.m4a1_s import M4A1S
except ImportError as e:
    raise ImportError(f"Failed to load recoil patterns: {e}")

__all__ = ["RecoilPattern", "AK47", "M4A4", "M4A1S"]
