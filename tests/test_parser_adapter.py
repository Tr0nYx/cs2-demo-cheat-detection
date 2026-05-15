"""Tests for DemoParserAdapter: tick/event extraction and validation."""

import pytest
import pandas as pd
from parser.adapter import DemoParserAdapter
from parser.types import DemoParseError


class TestDemoParserAdapter:
    """Tests for demo parsing and validation."""

    def test_extract_required_tick_properties(self, minimal_parsed_demo):
        """Verify all 16 required tick properties are present in ticks_df.

        Tests D-02: verify adapter extracts all required tick properties.
        """
        ticks_df = minimal_parsed_demo.ticks_df

        # Verify all required columns are present
        required_cols = [
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
        for col in required_cols:
            assert col in ticks_df.columns, f"Missing tick column: {col}"

        # Verify tick values are ordered
        assert (ticks_df["tick"].diff().dropna() > 0).all(), "Ticks not monotonically increasing"

        # Verify numeric columns have expected types
        assert ticks_df["X"].dtype in [float, "float64", "float32"]
        assert ticks_df["yaw"].dtype in [float, "float64", "float32"]

    def test_extract_required_events(self, demo_with_jumps):
        """Verify events_df contains event_type column with multiple event types.

        Tests D-03: verify adapter extracts required event types.
        """
        events_df = demo_with_jumps.events_df

        # Verify event_type column exists
        assert "event_type" in events_df.columns, "Missing event_type column"

        # Verify events are present
        assert len(events_df) > 0, "No events extracted"

        # Verify multiple event types
        event_types = events_df["event_type"].unique()
        assert len(event_types) >= 2, "Should have at least 2 event types"
        assert "player_jump" in event_types
        assert "player_land" in event_types

    def test_parse_demo_file_not_found(self):
        """Test that DemoParseError is raised when file not found.

        Tests D-05: clear exception for missing files.
        """
        parser = DemoParserAdapter()

        with pytest.raises(DemoParseError, match="not found"):
            parser.parse_demo("/nonexistent/file.dem")

    def test_parse_demo_empty_ticks(self, monkeypatch):
        """Test that DemoParseError is raised when ticks DataFrame is empty.

        Tests D-05: clear exception for invalid data.
        """
        # Mock demoparser2 to return empty DataFrame
        import demoparser2

        def mock_parse_ticks(cols):
            return pd.DataFrame()

        parser = DemoParserAdapter()
        monkeypatch.setattr(
            demoparser2.DemoParser, "parse_ticks", mock_parse_ticks
        )

        with pytest.raises(DemoParseError, match="empty"):
            parser.parse_demo("test.dem")

    def test_ticks_are_ordered(self, minimal_parsed_demo):
        """Verify ticks are ordered by tick number.

        Tests D-04: validation that ticks are ordered.
        """
        ticks_df = minimal_parsed_demo.ticks_df
        tick_values = ticks_df["tick"].values

        # All differences should be positive
        diffs = pd.Series(tick_values).diff().dropna()
        assert (diffs > 0).all(), "Ticks not ordered monotonically"

    def test_multiple_event_types_extracted(self, demo_with_rounds):
        """Verify multiple event types are extracted and identified.

        Tests D-03: extraction of multiple event types.
        """
        events_df = demo_with_rounds.events_df

        # Verify we have round_start and round_end
        event_types = set(events_df["event_type"].unique())
        assert "round_start" in event_types
        assert "round_end" in event_types

        # Verify each type has multiple instances
        assert len(events_df[events_df["event_type"] == "round_start"]) >= 2
        assert len(events_df[events_df["event_type"] == "round_end"]) >= 2
