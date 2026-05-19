"""Integration tests for WeightedScorer with Phase 22 transformer per D-16, D-15, D-17.

Tests verify:
- TransformerSequenceExtractor integrated as weighted feature (not override)
- Phase 20 evidence gates remain in effect
- Single high score (including transformer) cannot trigger High review alone (Pitfall 3)
- Backward compatibility preserved
"""

import pytest

from features.base import FeatureResult
from scoring.weighted_scorer import WeightedScorer, ScoringSummary


class TestTransformerIntegration:
    """Test transformer integration as weighted feature alongside traditional extractors."""

    def test_transformer_included_in_weights(self):
        """Verify transformer is in scorer weights."""
        scorer = WeightedScorer()
        assert "transformer" in scorer.weights
        assert scorer.weights["transformer"] == 0.05

    def test_transformer_in_feature_aliases(self):
        """Verify TransformerSequenceExtractor aliased as transformer."""
        scorer = WeightedScorer()
        assert "TransformerSequenceExtractor" in scorer.feature_aliases
        assert scorer.feature_aliases["TransformerSequenceExtractor"] == "transformer"

    def test_weights_sum_to_one_with_transformer(self):
        """Verify transformer addition doesn't break weight normalization."""
        scorer = WeightedScorer()
        total = sum(scorer.weights.values())
        assert abs(total - 1.0) < 0.001, f"Weights sum to {total}, expected 1.0"

    def test_score_with_transformer_feature(self):
        """Test scoring with transformer alongside traditional features."""
        scorer = WeightedScorer()

        # Create mock results with transformer
        aimbot_result = FeatureResult(
            score=0.6,
            raw_measurements={},
            metadata={"confidence": "medium"}
        )
        transformer_result = FeatureResult(
            score=0.5,
            raw_measurements={},
            metadata={"confidence": "medium", "method": "transformer_sequence"}
        )

        feature_results = {
            "AimbotExtractor": aimbot_result,
            "TransformerSequenceExtractor": transformer_result,
        }

        summary = scorer.score(feature_results)

        assert isinstance(summary, ScoringSummary)
        assert 0.0 <= summary.overall_score <= 1.0
        assert summary.label in ("clean", "suspicious", "likely_cheating")
        assert "transformer" in summary.per_feature_scores
        assert summary.per_feature_scores["transformer"] == 0.5


class TestPhase20EvidenceGatesWithTransformer:
    """Test Phase 20 evidence gates with transformer per D-15, D-16, D-17 and Pitfall 3.

    CRITICAL: Single high feature (including transformer) should not trigger High label alone.
    """

    def test_transformer_alone_high_score_capped_to_suspicious(self):
        """Test that high transformer score alone doesn't trigger High review (Pitfall 3).

        Per D-16: A single high feature should usually produce at most Review signal.
        TransformerSequenceExtractor is one feature, so high transformer score alone
        should be capped to suspicious (0.69 or below).
        """
        scorer = WeightedScorer()

        # Transformer with very high score, all others missing/low
        transformer_result = FeatureResult(
            score=0.95,  # Very high
            raw_measurements={},
            metadata={"confidence": "high"}
        )

        feature_results = {
            "TransformerSequenceExtractor": transformer_result,
            "AimbotExtractor": None,
            "WallhackExtractor": None,
            "TriggerbotExtractor": None,
        }

        summary = scorer.score(feature_results)

        # High transformer score alone should be capped
        assert summary.overall_score <= 0.69, f"High transformer alone should cap to 0.69, got {summary.overall_score}"
        assert summary.label == "suspicious", f"High transformer alone should be suspicious, got {summary.label}"

    def test_transformer_plus_aimbot_high_passes_gates(self):
        """Test that two strong signals (transformer + aimbot) pass evidence gates."""
        scorer = WeightedScorer()

        # Two strong signals
        aimbot_result = FeatureResult(
            score=0.75,
            raw_measurements={},
            metadata={"confidence": "high", "evidence_strength": "strong"}
        )
        transformer_result = FeatureResult(
            score=0.72,
            raw_measurements={},
            metadata={"confidence": "medium"}
        )

        feature_results = {
            "AimbotExtractor": aimbot_result,
            "TransformerSequenceExtractor": transformer_result,
        }

        summary = scorer.score(feature_results)

        # Two strong signals should allow High review
        assert summary.overall_score > 0.65
        # May not reach likely_cheating threshold, but gates shouldn't prevent it
        assert summary.label in ("suspicious", "likely_cheating")

    def test_evidence_gates_method_requires_strong_signals(self):
        """Test _passes_evidence_gates implementation."""
        scorer = WeightedScorer()

        # Case 1: No strong signals
        weak_result = FeatureResult(
            score=0.5,
            raw_measurements={},
            metadata={"confidence": "low"}
        )
        assert not scorer._passes_evidence_gates({"AimbotExtractor": weak_result})

        # Case 2: One strong signal
        strong_result = FeatureResult(
            score=0.75,
            raw_measurements={},
            metadata={"confidence": "high"}
        )
        assert not scorer._passes_evidence_gates({"AimbotExtractor": strong_result})

        # Case 3: Two strong signals
        results_two_strong = {
            "AimbotExtractor": strong_result,
            "TransformerSequenceExtractor": FeatureResult(
                score=0.70,
                raw_measurements={},
                metadata={"confidence": "high"}
            )
        }
        assert scorer._passes_evidence_gates(results_two_strong)

    def test_evidence_gates_exceptional_single_feature(self):
        """Test evidence gates allow exceptional single feature (score > 0.85, high confidence, 10+ samples)."""
        scorer = WeightedScorer()

        exceptional_result = FeatureResult(
            score=0.90,
            raw_measurements={},
            metadata={
                "confidence": "high",
                "sample_count": 15,  # 10+ supporting samples
                "evidence_strength": "strong"
            }
        )

        # Single exceptional feature should pass gates
        assert scorer._passes_evidence_gates({"AimbotExtractor": exceptional_result})


class TestBackwardCompatibility:
    """Test that Phase 22 changes don't break existing functionality."""

    def test_traditional_features_still_work(self):
        """Test scoring with only traditional features (no transformer)."""
        scorer = WeightedScorer()

        # Traditional feature results without transformer
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.6, raw_measurements={}, metadata={}),
            "WallhackExtractor": FeatureResult(score=0.7, raw_measurements={}, metadata={}),
            "TriggerbotExtractor": FeatureResult(score=0.4, raw_measurements={}, metadata={}),
            "RecoilExtractor": FeatureResult(score=0.5, raw_measurements={}, metadata={}),
            "BhopExtractor": FeatureResult(score=0.3, raw_measurements={}, metadata={}),
        }

        summary = scorer.score(feature_results)

        assert isinstance(summary, ScoringSummary)
        assert 0.0 <= summary.overall_score <= 1.0
        assert summary.label in ("clean", "suspicious", "likely_cheating")
        # Transformer should not be in per_feature_scores if not provided
        assert "transformer" not in summary.per_feature_scores

    def test_missing_transformer_graceful_handling(self):
        """Test that missing transformer is handled gracefully."""
        scorer = WeightedScorer()

        # Only aimbot provided, transformer missing
        feature_results = {
            "AimbotExtractor": FeatureResult(score=0.75, raw_measurements={}, metadata={}),
        }

        # Should not raise, should compute score without transformer
        summary = scorer.score(feature_results)
        assert isinstance(summary, ScoringSummary)
        assert "transformer" not in summary.per_feature_scores
        assert "AimbotExtractor" not in summary.missing_features  # Only aimbot provided

    def test_label_thresholds_unchanged(self):
        """Test that label thresholds (clean < 0.3, suspicious 0.3-0.7, likely_cheating >= 0.7) unchanged."""
        scorer = WeightedScorer()

        # Low score → clean
        low_result = FeatureResult(score=0.2, raw_measurements={}, metadata={})
        summary = scorer.score({"AimbotExtractor": low_result})
        assert summary.label == "clean"

        # Medium score → suspicious
        medium_result = FeatureResult(score=0.5, raw_measurements={}, metadata={})
        summary = scorer.score({"AimbotExtractor": medium_result})
        assert summary.label == "suspicious"

        # High score with multiple signals → likely_cheating
        high_result1 = FeatureResult(score=0.8, raw_measurements={}, metadata={"confidence": "high"})
        high_result2 = FeatureResult(score=0.75, raw_measurements={}, metadata={"confidence": "high"})
        summary = scorer.score({"AimbotExtractor": high_result1, "WallhackExtractor": high_result2})
        assert summary.overall_score >= 0.7


class TestPitfall3Mitigation:
    """Test Pitfall 3 mitigation: single feature cannot override evidence gates."""

    def test_single_transformer_cannot_create_high_review(self):
        """CRITICAL: Transformer alone, no matter how high, cannot create High review signal."""
        scorer = WeightedScorer()

        # Transformer with maximum score (1.0)
        max_transformer = FeatureResult(
            score=1.0,
            raw_measurements={"confidence": "very_high"},
            metadata={"confidence": "high", "window_count": 100}
        )

        summary = scorer.score({"TransformerSequenceExtractor": max_transformer})

        # Even 1.0 transformer alone should not reach likely_cheating
        assert summary.overall_score <= 0.69, f"Max transformer alone should cap, got {summary.overall_score}"
        assert summary.label == "suspicious"

    def test_all_features_high_passes_gates(self):
        """All features with high scores should pass gates and allow likely_cheating."""
        scorer = WeightedScorer()

        high_results = {
            "AimbotExtractor": FeatureResult(score=0.85, raw_measurements={}, metadata={"confidence": "high"}),
            "WallhackExtractor": FeatureResult(score=0.80, raw_measurements={}, metadata={"confidence": "high"}),
            "TransformerSequenceExtractor": FeatureResult(score=0.75, raw_measurements={}, metadata={"confidence": "high"}),
        }

        summary = scorer.score(high_results)

        # Multiple strong signals should allow High review
        assert summary.label == "likely_cheating" or summary.overall_score > 0.65
