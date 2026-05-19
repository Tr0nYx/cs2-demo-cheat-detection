"""Tests for AimbotExtractor feature."""

import pytest
import pandas as pd
from parser.types import ParsedDemo
from features.base import FeatureExtractionError
from features.aimbot import AimbotExtractor


class TestAimbotExtractor:
    """Tests for aimbot detection."""

    def test_aimbot_score_normalized(self, aimbot_extractor, demo_with_kills):
        """Test that aimbot score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = aimbot_extractor.extract(demo_with_kills)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_aimbot_raw_measurements_populated(self, aimbot_extractor, demo_with_kills):
        """Test that raw_measurements contains expected keys.

        Tests D-14: raw measurements for explainability.
        """
        result = aimbot_extractor.extract(demo_with_kills)

        # Verify raw_measurements dict is populated
        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

        # Verify key measurements are present
        expected_keys = {
            "kills_detected",
            "snap_ratio_values",
            "mean_snap_ratio",
            "normalized_snap",
        }
        for key in expected_keys:
            assert key in result.raw_measurements, f"Missing measurement: {key}"

    def test_aimbot_insufficient_kills(self, aimbot_extractor, minimal_parsed_demo):
        """Test that FeatureExtractionError is raised with no kills.

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError, match="insufficient"):
            aimbot_extractor.extract(minimal_parsed_demo)

    def test_aimbot_metadata_present(self, aimbot_extractor, demo_with_kills):
        """Test that metadata dict is populated with extraction info.

        Tests D-07: metadata field in FeatureResult.
        """
        result = aimbot_extractor.extract(demo_with_kills)

        assert isinstance(result.metadata, dict)

    def test_aimbot_kills_detected(self, aimbot_extractor, demo_with_kills):
        """Test that kills are correctly detected in the demo.

        Tests D-19: feature extraction with valid data.
        """
        result = aimbot_extractor.extract(demo_with_kills)

        # Verify kills were detected
        assert result.raw_measurements.get("kills_detected", 0) > 0

    def test_aimbot_calibration_metadata_fields(self, aimbot_extractor, demo_with_kills):
        """Test that detailed calibration metadata keys are present."""
        result = aimbot_extractor.extract(demo_with_kills)
        metadata = result.metadata

        assert "confidence" in metadata
        assert "evidence_strength" in metadata
        assert "score_cap_applied" in metadata
        assert "score_cap_reason" in metadata
        assert "independent_signals" in metadata
        assert "sample_count" in metadata

    def test_aimbot_score_capping_triggers(self, aimbot_extractor, minimal_tick_df):
        """Test that aimbot scores are capped if kill windows or signals are insufficient."""
        # Create a parsed demo with exactly 1 kill having extreme snap
        extended_ticks = []
        for i in range(15):
            row = minimal_tick_df.iloc[0].copy()
            row["tick"] = i
            row["X"] = 100.0 + i
            # Simulate a massive single-frame snap in yaw at tick 8
            if i == 8:
                row["yaw"] = 300.0
            else:
                row["yaw"] = 0.0
            if i in [7, 8]:
                row["is_shooting"] = True
            extended_ticks.append(row)

        ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

        events_data = {
            "tick": [8],
            "event_type": ["player_death"],
            "attacker_steamid": [1],
            "victim_steamid": [2],
        }
        events_df = pd.DataFrame(events_data)
        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df)

        result = aimbot_extractor.extract(demo)
        
        # Extremely high snap ratio should naturally give high score (>= 0.7)
        # But since we only have 1 kill window and 1 independent signal (snap), it MUST be capped to <= 0.49
        assert result.score <= 0.49
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_kill_windows" in result.metadata["score_cap_reason"]
        assert result.metadata["confidence"] in ["low", "medium"]
        assert result.metadata["evidence_strength"] in ["weak", "medium"]
