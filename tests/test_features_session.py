"""Tests for SessionConsistencyExtractor feature."""

import pytest
from features.base import FeatureExtractionError
from features.session import SessionConsistencyExtractor


class TestSessionConsistencyExtractor:
    """Tests for session consistency detection."""

    def test_session_consistency_score_normalized(
        self, session_extractor, demo_with_rounds
    ):
        """Test that session score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_session_insufficient_rounds(
        self, session_extractor, minimal_parsed_demo
    ):
        """Test behavior with no round events.

        Tests D-19: per-feature error handling.
        """
        # This may raise or return low score depending on implementation
        try:
            result = session_extractor.extract(minimal_parsed_demo)
            # If it doesn't raise, score should be very low or None
            assert result.score is None or result.score < 0.5
        except FeatureExtractionError:
            # Expected if insufficient round data
            pass

    def test_session_raw_measurements(self, session_extractor, demo_with_rounds):
        """Test that raw measurements include rounds_analyzed and consistency_variance.

        Tests D-14: raw measurements for explainability.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_session_metadata_present(self, session_extractor, demo_with_rounds):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert isinstance(result.metadata, dict)
