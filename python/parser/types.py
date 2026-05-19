"""Type definitions for demo parsing and validation."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class ParsedDemo:
    """Validated tick and event data from a CS2 demo.

    Attributes:
        ticks_df: DataFrame containing tick-by-tick player state with columns:
                  tick, steamid, X, Y, Z, pitch, yaw, velocity_X, velocity_Y,
                  velocity_Z, health, armor_value, is_shooting, is_scoped,
                  is_airborne, active_weapon_name, ping
        events_df: DataFrame containing gameplay events with columns:
                   tick, event_type, and event-specific fields
        map_name: Optional name of the map parsed from the demo header
    """

    ticks_df: pd.DataFrame
    events_df: pd.DataFrame
    map_name: str | None = None


class DemoParseError(Exception):
    """Raised when demo file cannot be parsed or is invalid.

    This exception indicates a structural issue with the demo file,
    such as file not found, corrupt data, missing required columns,
    or no valid events extracted. It is used to signal all-or-nothing
    parsing failures to the worker.
    """

    pass
