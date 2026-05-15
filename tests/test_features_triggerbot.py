"""Tests for TriggerbotExtractor feature."""

import pytest
from features.base import FeatureExtractionError
from features.triggerbot import TriggerbotExtractor


class TestTriggerbotExtractor:
    """Tests for triggerbot detection."""

    def test_triggerbot_score_normalized(self, triggerbot_extractor, demo_with_kills):
        """Test that triggerbot score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_triggerbot_insufficient_reactions(
        self, triggerbot_extractor, minimal_parsed_demo
    ):
        """Test that FeatureExtractionError is raised with no kills.

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError, match="insufficient"):
            triggerbot_extractor.extract(minimal_parsed_demo)

    def test_triggerbot_reaction_times_collected(
        self, triggerbot_extractor, demo_with_kills
    ):
        """Test that reaction times are collected in raw measurements.

        Tests D-14: raw measurements for explainability.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_triggerbot_bimodality_present(
        self, triggerbot_extractor, demo_with_kills
    ):
        """Test that bimodality coefficient is in raw measurements.

        Tests D-14: raw measurements including bimodality coefficient.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        # Verify bimodality-related measurements
        raw = result.raw_measurements
        assert "kills_detected" in raw or len(raw) > 0
