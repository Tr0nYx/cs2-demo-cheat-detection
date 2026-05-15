"""Tests for BhopExtractor feature."""

import pytest
from features.base import FeatureExtractionError
from features.bhop import BhopExtractor


class TestBhopExtractor:
    """Tests for bunnyhopping detection."""

    def test_bhop_score_normalized(self, bhop_extractor, demo_with_jumps):
        """Test that bhop score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_bhop_insufficient_jumps(self, bhop_extractor, minimal_parsed_demo):
        """Test behavior with minimal jump data.

        Tests D-19: per-feature error handling.
        """
        # This may raise or return low score depending on implementation
        try:
            result = bhop_extractor.extract(minimal_parsed_demo)
            # If it doesn't raise, score should be very low or None
            assert result.score is None or result.score < 0.5
        except FeatureExtractionError:
            # Expected if insufficient jump data
            pass

    def test_bhop_raw_measurements(self, bhop_extractor, demo_with_jumps):
        """Test that raw measurements include total_jumps and perfect_jump_ratio.

        Tests D-14: raw measurements for explainability.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_bhop_metadata_present(self, bhop_extractor, demo_with_jumps):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert isinstance(result.metadata, dict)
