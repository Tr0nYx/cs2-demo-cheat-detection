"""Tests for AimbotExtractor feature."""

import pytest
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
