"""Base class and types for feature extractors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional, TYPE_CHECKING, TypedDict, List

import numpy as np
from scipy import special as sp_special

if TYPE_CHECKING:
    from parser.types import ParsedDemo


class FeatureExtractionError(Exception):
    """Raised when feature extraction fails due to insufficient or invalid data.

    This exception indicates a structural issue with the demo data,
    such as insufficient kills for aimbot extraction, no reaction times
    for triggerbot, or lack of footsteps for wallhack detection.
    """

    pass


class CalibrationMetadata(TypedDict, total=False):
    """Typed contract for calibration and evidence-gate metadata.

    Attributes:
        confidence: "low", "medium", or "high" confidence in the score.
        evidence_strength: "weak", "medium", or "strong" evidence.
        score_cap_applied: True if the score was capped due to weak evidence or low samples.
        score_cap_reason: Explanation of why the score was capped.
        independent_signals: List of independent signals found (e.g., ["snap", "jerk"]).
        sample_count: Number of samples or events used for extraction.
        warnings: List of warning strings/anomalies (e.g., "low_sample_count").
        method: Name of the extraction method/algorithm.
        version: Version of the extractor logic.
    """
    confidence: str
    evidence_strength: str
    score_cap_applied: bool
    score_cap_reason: str
    independent_signals: List[str]
    sample_count: int
    warnings: List[str]
    method: str
    version: str


@dataclass
class FeatureResult:
    """Output of a feature extractor: normalized score + raw data for explainability.

    Attributes:
        score: Normalized suspicion score in [0.0, 1.0], or None if extraction failed.
        raw_measurements: Dictionary of intermediate computation values (snap ratio,
                         angular velocity, reaction times, etc.) for explainability
                         and debugging.
        metadata: CalibrationMetadata or dict containing method details, confidence,
                 warnings, independent signals, etc.
    """

    score: Optional[float]
    raw_measurements: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class AbstractFeatureExtractor(ABC):
    """Base class for feature extractors.

    Enforces the extract() interface and provides normalization utilities.
    All concrete extractors (AimbotExtractor, TriggerbotExtractor, etc.) must
    inherit from this class and implement extract().

    Feature extractors are stateless: each call to extract() is independent
    and deterministic. No instance state is persisted between calls.
    """

    @abstractmethod
    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract feature from parsed demo.

        Args:
            parsed_demo: Validated tick and event data from a CS2 demo.

        Returns:
            FeatureResult with normalized score [0.0, 1.0] and raw measurements.

        Raises:
            FeatureExtractionError: If data is insufficient for meaningful extraction
                                   (e.g., no kills for aimbot, no reactions for triggerbot).
        """
        pass

    @staticmethod
    def _sigmoid_normalize(
        value: float,
        inflection_point: float = 0.5,
        scale: float = 2.0,
    ) -> float:
        """Apply sigmoid normalization to map unbounded value to [0.0, 1.0].

        Uses scipy.special.expit (logistic sigmoid) for stable computation.
        Formula: sigmoid((value - inflection_point) * scale)

        The inflection point is where sigmoid = 0.5. The scale controls the
        steepness of the curve. Larger scale = sharper transition.

        Args:
            value: Raw unbounded value to normalize.
            inflection_point: Value at which sigmoid = 0.5 (default 0.5).
            scale: Steepness of sigmoid curve (default 2.0).

        Returns:
            Normalized float in [0.0, 1.0].
        """
        shifted = (value - inflection_point) * scale
        return float(sp_special.expit(shifted))

    @staticmethod
    def _clip_normalize(
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """Apply linear normalization to map bounded value to [0.0, 1.0].

        For values naturally bounded by a known range, linear scaling is more
        interpretable than sigmoid. Formula: clip((value - min) / (max - min), 0, 1)

        Args:
            value: Raw bounded value to normalize.
            min_val: Minimum of the expected range.
            max_val: Maximum of the expected range.

        Returns:
            Normalized float in [0.0, 1.0], clipped to bounds.
        """
        if max_val <= min_val:
            raise ValueError("max_val must be greater than min_val")
        normalized = (value - min_val) / (max_val - min_val)
        return float(np.clip(normalized, 0.0, 1.0))

    @staticmethod
    def _validate_score(score: float) -> None:
        """Validate that a normalized score is in [0.0, 1.0].

        Raises ValueError if score is outside the valid range. This guard
        catches bugs in feature extraction normalization early.

        Args:
            score: Score to validate.

        Raises:
            ValueError: If score is not in [0.0, 1.0].
        """
        if not (0.0 <= score <= 1.0):
            raise ValueError(
                f"Feature score must be in [0.0, 1.0], got {score}"
            )

    @staticmethod
    def _compute_derivatives(values: np.ndarray) -> dict:
        """Compute first, second, third-order derivatives of a value sequence.

        Per D-02 and D-03: captures rate of change, acceleration, and jerk.
        Used by temporal extractors (aimbot, wallhack, triggerbot, recoil, bhop).

        Args:
            values: Array of measurements over time (e.g., angles, velocities).

        Returns:
            Dictionary with first/second/third-order derivative statistics.
        """
        if len(values) < 3:
            return {
                "first_order_max": 0.0,
                "first_order_mean": 0.0,
                "second_order_max": 0.0,
                "second_order_mean": 0.0,
                "third_order_max": 0.0,
                "third_order_mean": 0.0,
            }

        first = np.gradient(values)
        second = np.gradient(first)
        third = np.gradient(second)

        return {
            "first_order_max": float(np.max(np.abs(first))),
            "first_order_mean": float(np.mean(np.abs(first))),
            "second_order_max": float(np.max(np.abs(second))),
            "second_order_mean": float(np.mean(np.abs(second))),
            "third_order_max": float(np.max(np.abs(third))),
            "third_order_mean": float(np.mean(np.abs(third))),
        }
