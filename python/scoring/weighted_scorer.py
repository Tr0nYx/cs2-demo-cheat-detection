"""Weighted scoring: combines feature scores into overall suspicion label."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from features.base import FeatureResult


@dataclass
class ScoringSummary:
    """Output of weighted scoring: overall suspicion label and per-feature breakdown.

    Attributes:
        overall_score: Normalized suspicion score in [0.0, 1.0].
        label: One of "clean", "suspicious", or "likely_cheating".
        per_feature_scores: Dictionary mapping feature names to their normalized scores.
        missing_features: List of feature names that failed or were skipped.
        weighting_strategy: Description of how missing features were handled
                           (e.g., "proportional_redistribution" or "neutral_placeholder").
    """

    overall_score: float
    label: str
    per_feature_scores: Dict[str, float]
    missing_features: List[str]
    weighting_strategy: str


class WeightedScorer:
    """Combines all feature scores into an overall suspicion verdict.

    The scorer applies configurable weights to each feature's normalized score,
    computes a weighted average, and maps the result to a label (clean, suspicious,
    or likely_cheating) based on explicit thresholds.

    Missing features can be handled in two ways:
    1. Proportional weight redistribution: redistribute missing weight to available features
    2. Neutral placeholder: treat missing feature as 0.5 (neutral)

    This implementation uses proportional weight redistribution for transparency.
    """

    def __init__(self) -> None:
        """Initialize WeightedScorer with configurable weights.

        Weights are defined per D-28 and must sum to 1.0.
        Raises AssertionError if weights do not sum to approximately 1.0.
        """
        # Locked weights per D-28
        self.weights = {
            "aimbot": 0.30,
            "wallhack": 0.25,
            "triggerbot": 0.20,
            "recoil": 0.15,
            "bhop": 0.05,
            "session": 0.05,
        }

        # Validate weights sum to 1.0
        total = sum(self.weights.values())
        assert abs(total - 1.0) < 0.001, f"Weights sum to {total}, not 1.0"

    def score(
        self, feature_results: Dict[str, Optional[FeatureResult]]
    ) -> ScoringSummary:
        """Compute overall suspicion score from feature results.

        Performs the following steps:
        1. Extract valid scores from feature results (filter None/failed features)
        2. Apply proportional weight redistribution for missing features
        3. Compute weighted average
        4. Map to label based on thresholds (clean < 0.3, suspicious 0.3-0.7, likely_cheating >= 0.7)
        5. Return ScoringSummary with per-feature breakdown

        Args:
            feature_results: Dictionary mapping feature names to FeatureResult objects.
                           Values can be None if feature extraction failed.

        Returns:
            ScoringSummary with overall_score, label, per_feature_scores, and metadata.

        Raises:
            ValueError: If all features failed (no valid scores to compute).
        """
        # Step 1: Extract valid scores, track missing features
        available_scores = {}
        missing_features = []

        for feature_name, result in feature_results.items():
            if result is None or result.score is None:
                missing_features.append(feature_name)
            else:
                # Validate score is in [0.0, 1.0]
                if not (0.0 <= result.score <= 1.0):
                    raise ValueError(
                        f"Feature {feature_name} score {result.score} not in [0.0, 1.0]"
                    )
                available_scores[feature_name] = result.score

        # If no features succeeded, raise error
        if not available_scores:
            raise ValueError(
                "All features failed; cannot compute overall score"
            )

        # Step 2: Proportional weight redistribution
        # Calculate total weight of available features
        available_weight = sum(
            self.weights.get(f, 0) for f in available_scores.keys()
        )

        # Normalize weights to sum to 1.0 across available features
        normalized_weights = {}
        for feature_name in available_scores.keys():
            original_weight = self.weights.get(feature_name, 0)
            if available_weight > 0:
                normalized_weights[feature_name] = original_weight / available_weight
            else:
                normalized_weights[feature_name] = 0

        # Step 3: Compute weighted average
        overall_score = sum(
            available_scores[f] * normalized_weights.get(f, 0)
            for f in available_scores.keys()
        )

        # Ensure overall_score is in [0.0, 1.0]
        overall_score = max(0.0, min(1.0, overall_score))

        # Step 4: Map to label based on thresholds (D-30)
        if overall_score < 0.3:
            label = "clean"
        elif overall_score < 0.7:
            label = "suspicious"
        else:
            label = "likely_cheating"

        # Step 5: Return ScoringSummary
        return ScoringSummary(
            overall_score=overall_score,
            label=label,
            per_feature_scores=available_scores,
            missing_features=missing_features,
            weighting_strategy="proportional_redistribution",
        )
