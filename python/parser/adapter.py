"""DemoParserAdapter: wraps demoparser2 with validation and error handling."""

from __future__ import annotations

import pandas as pd
from demoparser2 import DemoParser

from .types import DemoParseError, ParsedDemo


class DemoParserAdapter:
    """Adapter wrapping demoparser2 to parse and validate CS2 demo files.

    Provides a clean boundary between demoparser2 quirks and feature extractor
    assumptions. Validates tick/event structure and surfaces clear parsing
    errors. All exceptions are converted to DemoParseError (all-or-nothing
    error handling per D-05).
    """

    # Required tick properties to extract from each tick
    REQUIRED_TICK_COLS = [
        "tick",
        "steamid",
        "X",
        "Y",
        "Z",
        "pitch",
        "yaw",
        "velocity_X",
        "velocity_Y",
        "velocity_Z",
        "health",
        "armor_value",
        "is_shooting",
        "is_scoped",
        "is_airborne",
        "active_weapon_name",
        "ping",
    ]

    # Required event types to extract from the demo
    REQUIRED_EVENT_TYPES = [
        "player_death",
        "weapon_fire",
        "player_footstep",
        "player_jump",
        "player_land",
        "round_start",
        "round_end",
    ]

    def parse_demo(self, file_path: str) -> ParsedDemo:
        """Parse a CS2 demo file and return validated tick/event data.

        Extracts all required tick properties and gameplay events from the demo
        file. Validates that ticks are ordered sequentially, required columns
        are present, and at least some events are extracted. If any validation
        fails, raises DemoParseError with clear context.

        Args:
            file_path: Path to the .dem file to parse

        Returns:
            ParsedDemo containing validated ticks_df and events_df DataFrames

        Raises:
            DemoParseError: If file not found, parser fails, ticks/events are
                          empty, required columns missing, or ticks unordered
        """
        # Attempt to initialize parser
        try:
            parser = DemoParser(file_path)
        except FileNotFoundError as e:
            raise DemoParseError(f"Demo file not found: {file_path}") from e
        except Exception as e:
            raise DemoParseError(f"Failed to initialize parser: {e}") from e

        # Parse ticks with requested properties
        try:
            ticks_df = parser.parse_ticks(self.REQUIRED_TICK_COLS)
        except Exception as e:
            raise DemoParseError(f"Failed to parse ticks: {e}") from e

        # Validate ticks DataFrame is not empty
        if ticks_df is None or ticks_df.empty:
            raise DemoParseError("Parser returned empty ticks DataFrame")

        # Validate all required columns are present
        missing_cols = [col for col in self.REQUIRED_TICK_COLS
                       if col not in ticks_df.columns]
        if missing_cols:
            raise DemoParseError(
                f"Missing tick columns: {missing_cols}"
            )

        # Validate tick ordering: all differences should be positive
        # (ticks should increase monotonically by tick_number)
        tick_diffs = ticks_df["tick"].diff().dropna()
        if not (tick_diffs > 0).all():
            raise DemoParseError("Ticks are not ordered by tick_number")

        # Parse events: iterate over required event types and collect
        events_list = []
        for event_type in self.REQUIRED_EVENT_TYPES:
            try:
                event_df = parser.parse_event(event_type)
                # Only include non-empty events
                if event_df is not None and not event_df.empty:
                    # Add event_type column for identification
                    event_df = event_df.copy()
                    event_df["event_type"] = event_type
                    events_list.append(event_df)
            except Exception:
                # Non-fatal: some events may not exist in a demo
                # (e.g., if no kills, no player_death events)
                pass

        # Validate at least some events were extracted
        if not events_list:
            raise DemoParseError("No gameplay events extracted from demo")

        # Concatenate all event DataFrames
        events_df = pd.concat(events_list, ignore_index=True)

        return ParsedDemo(ticks_df=ticks_df, events_df=events_df)
