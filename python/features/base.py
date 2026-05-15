"""Base class and types for feature extractors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional, TYPE_CHECKING

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


@dataclass
class FeatureResult:
    """Output of a feature extractor: normalized score + raw data for explainability.

    Attributes:
        score: Normalized suspicion score in [0.0, 1.0], or None if extraction failed.
        raw_measurements: Dictionary of intermediate computation values (snap ratio,
                         angular velocity, reaction times, etc.) for explainability
                         and debugging.
        metadata: Extraction method name, version, and any warnings or notes
                 (e.g., if data was bimodal, if sample size was small).
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
