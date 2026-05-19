"""Tests for WallhackExtractor feature."""

import pytest
import pandas as pd
from parser.types import ParsedDemo
from features.base import FeatureExtractionError
from features.wallhack import WallhackExtractor


class TestWallhackExtractor:
    """Tests for wallhack detection."""

    def test_wallhack_score_normalized(self, wallhack_extractor, demo_with_footsteps):
        """Test that wallhack score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = wallhack_extractor.extract(demo_with_footsteps)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_wallhack_insufficient_data(
        self, wallhack_extractor, minimal_parsed_demo
    ):
        """Test behavior with minimal data (no footsteps).

        Tests D-19: per-feature error handling.
        """
        # This may raise or return low score depending on implementation
        try:
            result = wallhack_extractor.extract(minimal_parsed_demo)
            # If it doesn't raise, score should be very low
            assert result.score is None or result.score < 0.5
        except FeatureExtractionError:
            # Expected if insufficient data
            pass

    def test_wallhack_metadata_present(self, wallhack_extractor, demo_with_footsteps):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = wallhack_extractor.extract(demo_with_footsteps)

        assert isinstance(result.metadata, dict)

    def test_wallhack_raw_measurements(self, wallhack_extractor, demo_with_footsteps):
        """Test that raw measurements are collected.

        Tests D-14: raw measurements for explainability.
        """
        result = wallhack_extractor.extract(demo_with_footsteps)

        assert isinstance(result.raw_measurements, dict)

    def test_wallhack_calibration_metadata_fields(self, wallhack_extractor, demo_with_footsteps):
        """Test that detailed calibration metadata keys are present."""
        result = wallhack_extractor.extract(demo_with_footsteps)
        metadata = result.metadata

        assert "confidence" in metadata
        assert "evidence_strength" in metadata
        assert "score_cap_applied" in metadata
        assert "score_cap_reason" in metadata
        assert "independent_signals" in metadata
        assert "sample_count" in metadata

    def test_wallhack_proxy_only_cap_triggers(self, wallhack_extractor, minimal_tick_df):
        """Test that wallhack scores are capped to 0.49 if proxy signals are strong but visual confirmation is missing."""
        extended_ticks = []
        for i in range(50):
            row = minimal_tick_df.iloc[0].copy()
            row["tick"] = i
            row["X"] = 100.0 + i
            # Large yaw transition before footstep at ticks 5, 15, 25, 35
            if i in [5, 15, 25, 35]:
                row["yaw"] = 90.0
            else:
                row["yaw"] = 0.0
            extended_ticks.append(row)

        ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

        events_data = {
            "tick": [15, 25, 35, 45, 10, 20, 30, 40],
            "event_type": ["player_footstep"] * 4 + ["player_death"] * 4,
            "steamid": [2, 2, 2, 2, 1, 1, 1, 1],
        }
        events_df = pd.DataFrame(events_data)
        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df)

        result = wallhack_extractor.extract(demo)
        
        # Pre-aim ratio should be high, but crosshair deltas should be huge (not <= 5 deg alignment)
        # Therefore, visual_alignment is not in independent_signals, triggering the cap.
        assert result.metadata["score_cap_applied"] is True
        assert result.metadata["score_cap_reason"] == "proxy_only_no_visual_confirmation"
        assert result.score <= 0.49
