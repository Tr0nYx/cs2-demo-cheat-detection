"""Tests for WallhackExtractor feature."""

import pytest
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
