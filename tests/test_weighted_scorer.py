"""Tests for WeightedScorer: combines feature scores into verdict labels."""

import pytest
from features.base import FeatureResult
from scoring.weighted_scorer import WeightedScorer, ScoringSummary


class TestWeightedScorer:
    """Tests for weighted scoring and threshold mapping."""

    @pytest.fixture
    def scorer(self) -> WeightedScorer:
        """Weighted scorer instance."""
        return WeightedScorer()

    def test_weighted_scoring_produces_valid_label(self, scorer):
        """Test that scorer produces valid label from feature results.

        Tests D-29, D-30: ScoringSummary and threshold mapping.
        """
        # Create feature results with mid-range scores
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.5),
            "TriggerbotExtractor": FeatureResult(score=0.5),
            "WallhackExtractor": FeatureResult(score=0.5),
            "RecoilExtractor": FeatureResult(score=0.5),
            "BhopExtractor": FeatureResult(score=0.5),
            "SessionConsistencyExtractor": FeatureResult(score=0.5),
        }

        result = scorer.score(feature_results)

        assert isinstance(result, ScoringSummary)
        assert result.label in ["clean", "suspicious", "likely_cheating"]
        assert 0.0 <= result.overall_score <= 1.0

    def test_scoring_threshold_clean(self, scorer):
        """Test that low scores map to 'clean' label.

        Tests D-30: clean threshold < 0.3.
        """
        # All features score low
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.1),
            "TriggerbotExtractor": FeatureResult(score=0.1),
            "WallhackExtractor": FeatureResult(score=0.1),
            "RecoilExtractor": FeatureResult(score=0.1),
            "BhopExtractor": FeatureResult(score=0.1),
            "SessionConsistencyExtractor": FeatureResult(score=0.1),
        }

        result = scorer.score(feature_results)

        assert result.label == "clean", f"Expected 'clean', got '{result.label}' for score {result.overall_score}"

    def test_scoring_threshold_suspicious(self, scorer):
        """Test that mid-range scores map to 'suspicious' label.

        Tests D-30: suspicious threshold 0.3-0.7.
        """
        # All features score medium
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.5),
            "TriggerbotExtractor": FeatureResult(score=0.5),
            "WallhackExtractor": FeatureResult(score=0.5),
            "RecoilExtractor": FeatureResult(score=0.5),
            "BhopExtractor": FeatureResult(score=0.5),
            "SessionConsistencyExtractor": FeatureResult(score=0.5),
        }

        result = scorer.score(feature_results)

        assert result.label == "suspicious", f"Expected 'suspicious', got '{result.label}' for score {result.overall_score}"

    def test_scoring_threshold_likely_cheating(self, scorer):
        """Test that high scores map to 'likely_cheating' label.

        Tests D-30: likely_cheating threshold >= 0.7.
        """
        # All features score high
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.9),
            "TriggerbotExtractor": FeatureResult(score=0.9),
            "WallhackExtractor": FeatureResult(score=0.9),
            "RecoilExtractor": FeatureResult(score=0.9),
            "BhopExtractor": FeatureResult(score=0.9),
            "SessionConsistencyExtractor": FeatureResult(score=0.9),
        }

        result = scorer.score(feature_results)

        assert result.label == "likely_cheating", f"Expected 'likely_cheating', got '{result.label}' for score {result.overall_score}"

    def test_scoring_missing_feature(self, scorer):
        """Test that missing features are tracked and skipped.

        Tests D-31: missing feature handling with proportional redistribution.
        """
        # Some features are missing (None)
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.8),
            "TriggerbotExtractor": None,  # Missing
            "WallhackExtractor": FeatureResult(score=0.8),
            "RecoilExtractor": None,  # Missing
            "BhopExtractor": FeatureResult(score=0.8),
            "SessionConsistencyExtractor": FeatureResult(score=0.8),
        }

        result = scorer.score(feature_results)

        assert len(result.missing_features) == 2
        assert "TriggerbotExtractor" in result.missing_features
        assert "RecoilExtractor" in result.missing_features
        assert 0.0 <= result.overall_score <= 1.0

    def test_scoring_per_feature_breakdown(self, scorer):
        """Test that per_feature_scores are captured in result.

        Tests D-29: per-feature breakdown in ScoringSummary.
        """
        scores = {
            "AimbotExtractor": 0.8,
            "TriggerbotExtractor": 0.2,
            "WallhackExtractor": 0.5,
            "RecoilExtractor": 0.6,
            "BhopExtractor": 0.1,
            "SessionConsistencyExtractor": 0.7,
        }

        feature_results = {
            name: FeatureResult(score=score) for name, score in scores.items()
        }

        result = scorer.score(feature_results)

        # Verify per_feature_scores matches input
        for name, score in scores.items():
            assert result.per_feature_scores[name] == score

    def test_scoring_all_features_failed(self, scorer):
        """Test that ValueError is raised if all features failed.

        Tests D-20: all-features-failed error handling.
        """
        # All features are None
        feature_results = {
            "AimbotExtractor": None,
            "TriggerbotExtractor": None,
            "WallhackExtractor": None,
            "RecoilExtractor": None,
            "BhopExtractor": None,
            "SessionConsistencyExtractor": None,
        }

        with pytest.raises(ValueError, match="All features failed"):
            scorer.score(feature_results)

    def test_scoring_strategy_documented(self, scorer):
        """Test that weighting strategy is documented in result.

        Tests D-31: transparency in missing feature handling.
        """
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.5),
            "TriggerbotExtractor": FeatureResult(score=0.5),
            "WallhackExtractor": None,  # Missing
            "RecoilExtractor": FeatureResult(score=0.5),
            "BhopExtractor": FeatureResult(score=0.5),
            "SessionConsistencyExtractor": FeatureResult(score=0.5),
        }

        result = scorer.score(feature_results)

        assert result.weighting_strategy == "proportional_redistribution"
