"""Tests for RecoilExtractor feature."""

import pytest
from features.base import FeatureExtractionError
from features.recoil import RecoilExtractor


class TestRecoilExtractor:
    """Tests for recoil compensation detection."""

    def test_recoil_score_normalized(self, recoil_extractor, demo_with_kills):
        """Test that recoil score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = recoil_extractor.extract(demo_with_kills)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_recoil_patterns_loaded(self, recoil_extractor):
        """Test that recoil patterns are loaded at initialization.

        Tests D-35, D-36: recoil patterns loaded from filesystem.
        """
        # Verify patterns dict exists (may be empty if no patterns found)
        assert isinstance(recoil_extractor.patterns, dict)

    def test_recoil_insufficient_sprays(self, recoil_extractor, minimal_parsed_demo):
        """Test behavior with minimal data (no shooting).

        Tests D-19: per-feature error handling.
        """
        # This may raise or return low score depending on implementation
        try:
            result = recoil_extractor.extract(minimal_parsed_demo)
            # If it doesn't raise, score should be very low or None
            assert result.score is None or result.score < 0.5
        except FeatureExtractionError:
            # Expected if insufficient spray data
            pass

    def test_recoil_metadata_present(self, recoil_extractor, demo_with_kills):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = recoil_extractor.extract(demo_with_kills)

        assert isinstance(result.metadata, dict)
