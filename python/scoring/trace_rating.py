"""TRACE Rating System: Core calculation engine for player impact scoring.

TRACE (Tactical Round Action & Contribution Evaluation) provides a transparent
player impact rating independent of suspicion verdicts. It combines five components
(eKILL, AIM, KAST, UTIL, CLUTCH) with a Trust multiplier adjusted by suspicion analysis.

The rating has three visible values:
- trace_base: weighted player impact and skill score
- trust_multiplier: dampening from existing suspicion score (1.0 - suspicion * 0.30)
- trace_adjusted: base score adjusted by trust multiplier
- trace_normalized: adjusted rating normalized by calibration global average

This module implements the core TRACE calculation engine with locked component weights
and Trust multiplier formula per TRACE.md specification.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, Optional
from datetime import datetime, timezone


# Weapon values for economy-adjusted kill calculations per TRACE.md
WEAPON_VALUES = {
    "glock": 300,
    "usp_silencer": 300,
    "hkp2000": 300,
    "p250": 700,
    "cz75a": 500,
    "tec9": 500,
    "fiveseven": 500,
    "deagle": 700,
    "revolver": 600,
    "mac10": 1050,
    "mp9": 1250,
    "mp7": 1500,
    "mp5sd": 1500,
    "ump45": 1200,
    "p90": 2350,
    "bizon": 1400,
    "galil": 1800,
    "famas": 2050,
    "ak47": 2700,
    "m4a1_silencer": 2900,
    "m4a4": 3100,
    "sg556": 3000,
    "aug": 3300,
    "ssg08": 1700,
    "awp": 4750,
    "g3sg1": 5000,
    "scar20": 5000,
    "nova": 1050,
    "xm1014": 2000,
    "mag7": 1300,
    "sawedoff": 1100,
    "m249": 5200,
    "negev": 1700,
    "knife": 0,
    "knife_t": 0,
}


@dataclass
class TraceComponents:
    """Raw component scores for TRACE calculation.

    Each component is normalized to approximately [0.3, 2.0] before weighting.

    Attributes:
        ekill: Economy-adjusted kill value. Higher when kills are against better-equipped opponents.
        aim: Mechanical skill score. Reuses existing aimbot feature outputs (cpq, csq, ttd, scs).
        kast: Round participation percentage. Kill OR Assist OR Survived OR Traded within 5s.
        util: Team utility impact. Flashes, grenades, damage, minus friendly fire penalties.
        clutch: High-value round wins. Multipliers increase from 1v1 (1.0x) to 1v5 (2.1x).
    """

    ekill: float
    aim: float
    kast: float
    util: float
    clutch: float


@dataclass
class TraceResult:
    """Output of TRACE calculation with all scores and metadata.

    Attributes:
        trace_base: Weighted component average before trust adjustment.
                   = ekill*0.30 + aim*0.25 + kast*0.20 + util*0.15 + clutch*0.10
        trace_adjusted: Base score adjusted by trust multiplier.
                       = trace_base * trust_multiplier
        trace_normalized: Adjusted rating normalized by calibration global average.
                         = trace_adjusted / calibration.global_average (fallback 1.0)
        trust_multiplier: Dampening from suspicion score.
                         = clamp(1.0 - suspicion_score*0.30, 0.73, 1.00)
        components: Clamped component scores after normalization.
        raw_components: Original component scores before clamping.
        calculated_at: ISO timestamp when calculation occurred.
    """

    trace_base: float
    trace_adjusted: float
    trace_normalized: float
    trust_multiplier: float
    components: TraceComponents
    raw_components: TraceComponents
    calculated_at: str


class TraceCalculator:
    """Computes TRACE rating from component scores and suspicion analysis.

    The TraceCalculator applies locked component weights, clamps inputs to safe ranges,
    applies a Trust multiplier from suspicion scoring, and optionally normalizes by
    calibration data.

    Component weights (locked per TRACE.md):
    - eKILL: 0.30 (economy-adjusted kill value)
    - AIM: 0.25 (mechanical skill)
    - KAST: 0.20 (round participation)
    - UTIL: 0.15 (utility impact)
    - CLUTCH: 0.10 (high-value round wins)

    Trust formula (locked per TRACE.md and 09-CONTEXT.md Decision D-06):
    - trust_multiplier = clamp(1.0 - (suspicion_score * 0.30), 0.73, 1.00)
    - At suspicion 0.0 → Trust 1.00 (no adjustment)
    - At suspicion 0.5 → Trust 0.85
    - At suspicion 1.0 → Trust 0.73 (maximum dampening, never hides suspicious behavior)

    Example:
        >>> calculator = TraceCalculator()
        >>> components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        >>> result = calculator.calculate(components, suspicion_score=0.3)
        >>> print(f"Base TRACE: {result.trace_base:.2f}")
        >>> print(f"Trust multiplier: {result.trust_multiplier:.2f}")
        >>> print(f"Adjusted TRACE: {result.trace_adjusted:.2f}")
    """

    def __init__(self) -> None:
        """Initialize TraceCalculator with locked component weights.

        Weights are locked per TRACE.md and must sum to 1.0.
        Raises AssertionError if weights do not sum to approximately 1.0.
        """
        # Locked component weights per TRACE.md and 09-CONTEXT.md Decision D-01
        self.component_weights = {
            "ekill": 0.30,
            "aim": 0.25,
            "kast": 0.20,
            "util": 0.15,
            "clutch": 0.10,
        }

        # Validate weights sum to 1.0
        total = sum(self.component_weights.values())
        assert abs(total - 1.0) < 0.001, f"Component weights sum to {total}, not 1.0"

        # Clamping bounds for all component values
        self.component_min = 0.3
        self.component_max = 2.0

        # Trust multiplier bounds per TRACE.md and Decision D-06
        self.trust_min = 0.73
        self.trust_max = 1.00

    def calculate_trust_multiplier(self, suspicion_score: float) -> float:
        """Calculate Trust multiplier from suspicion score.

        Trust formula: 1.0 - (suspicion_score * 0.30), clamped to [0.73, 1.00]

        This formula ensures:
        - Suspicion 0.0 (clean) → Trust 1.00 (no dampening)
        - Suspicion 0.5 (suspicious) → Trust 0.85
        - Suspicion 1.0 (likely cheating) → Trust 0.73 (max dampening, never hides behavior)

        Args:
            suspicion_score: Overall suspicion score from weighted_scorer, in [0.0, 1.0].

        Returns:
            Trust multiplier in [0.73, 1.00] for dampening TRACE base.

        Raises:
            ValueError: If suspicion_score is not in [0.0, 1.0].
        """
        if not (0.0 <= suspicion_score <= 1.0):
            raise ValueError(
                f"suspicion_score {suspicion_score} not in [0.0, 1.0]; "
                "clamping to boundary"
            )

        # Apply formula: 1.0 - (suspicion * 0.30)
        trust = 1.0 - (suspicion_score * 0.30)

        # Clamp to [0.73, 1.00]
        trust = max(self.trust_min, min(self.trust_max, trust))

        return trust

    def _clamp_components(self, components: TraceComponents) -> TraceComponents:
        """Clamp all component values to [0.3, 2.0].

        Out-of-bounds component values (from extraction errors or outliers) are
        clamped to the safe range before weighting. This prevents single extreme
        values from distorting the overall score.

        Args:
            components: Raw component scores potentially outside [0.3, 2.0].

        Returns:
            New TraceComponents with all values in [0.3, 2.0].
        """
        return TraceComponents(
            ekill=max(self.component_min, min(self.component_max, components.ekill)),
            aim=max(self.component_min, min(self.component_max, components.aim)),
            kast=max(self.component_min, min(self.component_max, components.kast)),
            util=max(self.component_min, min(self.component_max, components.util)),
            clutch=max(self.component_min, min(self.component_max, components.clutch)),
        )

    def calculate(
        self,
        components: TraceComponents,
        suspicion_score: float,
        calibration: Optional[Dict[str, float]] = None,
    ) -> TraceResult:
        """Compute full TRACE rating from components and suspicion.

        Steps:
        1. Clamp all components to [0.3, 2.0]
        2. Calculate trace_base as weighted average of clamped components
        3. Calculate trust_multiplier from suspicion_score
        4. Calculate trace_adjusted = trace_base * trust_multiplier
        5. Calculate trace_normalized = trace_adjusted / calibration.global_average
           (uses 1.0 as fallback if calibration missing or invalid)

        Args:
            components: TraceComponents with raw scores from extractors.
            suspicion_score: Overall suspicion score in [0.0, 1.0] from weighted_scorer.
            calibration: Optional dict with 'global_average' key. If missing or invalid,
                        defaults to 1.0 (no normalization).

        Returns:
            TraceResult with all three scores, trust multiplier, and raw components.

        Raises:
            ValueError: If suspicion_score is invalid.
        """
        # Step 1: Store raw components before clamping
        raw_components = components

        # Step 2: Clamp all components
        clamped_components = self._clamp_components(components)

        # Step 3: Calculate trace_base as weighted average
        trace_base = (
            clamped_components.ekill * self.component_weights["ekill"]
            + clamped_components.aim * self.component_weights["aim"]
            + clamped_components.kast * self.component_weights["kast"]
            + clamped_components.util * self.component_weights["util"]
            + clamped_components.clutch * self.component_weights["clutch"]
        )

        # Step 4: Calculate trust multiplier
        trust_multiplier = self.calculate_trust_multiplier(suspicion_score)

        # Step 5: Calculate trace_adjusted
        trace_adjusted = trace_base * trust_multiplier

        # Step 6: Calculate trace_normalized (with calibration fallback)
        global_average = 1.0  # default fallback
        if calibration and "global_average" in calibration:
            cal_average = calibration["global_average"]
            # Ensure global_average is positive to avoid division issues
            if cal_average > 0:
                global_average = cal_average

        trace_normalized = trace_adjusted / global_average

        # Step 7: Return TraceResult
        return TraceResult(
            trace_base=trace_base,
            trace_adjusted=trace_adjusted,
            trace_normalized=trace_normalized,
            trust_multiplier=trust_multiplier,
            components=clamped_components,
            raw_components=raw_components,
            calculated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )
