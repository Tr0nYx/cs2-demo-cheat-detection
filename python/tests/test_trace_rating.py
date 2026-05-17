"""Unit tests for TraceCalculator and TRACE formulas.

Tests validate:
- Trust multiplier formula and clamping
- Component weighting logic
- Adjustment and normalization
- Component clamping
- End-to-end calculation
- Calibration fallback behavior
"""

import pytest
from python.scoring.trace_rating import (
    TraceCalculator,
    TraceComponents,
    TraceResult,
    WEAPON_VALUES,
)


class TestTrustMultiplier:
    """Test Trust multiplier calculation from suspicion score."""

    def test_trust_zero_suspicion(self):
        """Suspicion 0.0 should give Trust 1.00 (no dampening)."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(0.0)
        assert abs(trust - 1.00) < 0.001

    def test_trust_low_suspicion(self):
        """Suspicion 0.3 should give Trust ~0.91."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(0.3)
        assert abs(trust - 0.91) < 0.01

    def test_trust_medium_suspicion(self):
        """Suspicion 0.5 should give Trust 0.85."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(0.5)
        assert abs(trust - 0.85) < 0.001

    def test_trust_high_suspicion(self):
        """Suspicion 0.75 should give Trust ~0.775."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(0.75)
        assert abs(trust - 0.775) < 0.01

    def test_trust_max_suspicion(self):
        """Suspicion 1.0 should give Trust 0.73 (minimum, clamped)."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(1.0)
        assert abs(trust - 0.73) < 0.001

    def test_trust_clamping_below_min(self):
        """Trust formula should never go below 0.73 even with high suspicion."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(1.0)
        assert trust >= 0.73
        assert trust <= 1.0

    def test_trust_clamping_above_max(self):
        """Trust formula should never exceed 1.0."""
        calculator = TraceCalculator()
        trust = calculator.calculate_trust_multiplier(0.0)
        assert trust <= 1.0
        assert trust >= 0.73

    def test_trust_invalid_suspicion_below_zero(self):
        """Should raise ValueError for suspicion < 0.0."""
        calculator = TraceCalculator()
        with pytest.raises(ValueError, match="not in \\[0.0, 1.0\\]"):
            calculator.calculate_trust_multiplier(-0.1)

    def test_trust_invalid_suspicion_above_one(self):
        """Should raise ValueError for suspicion > 1.0."""
        calculator = TraceCalculator()
        with pytest.raises(ValueError, match="not in \\[0.0, 1.0\\]"):
            calculator.calculate_trust_multiplier(1.1)


class TestComponentWeights:
    """Test component weighting logic."""

    def test_component_weights_sum_to_one(self):
        """Component weights must sum to exactly 1.0."""
        calculator = TraceCalculator()
        total = sum(calculator.component_weights.values())
        assert abs(total - 1.0) < 0.001

    def test_component_weights_locked(self):
        """Component weights should match TRACE.md specification."""
        calculator = TraceCalculator()
        assert abs(calculator.component_weights["ekill"] - 0.30) < 0.001
        assert abs(calculator.component_weights["aim"] - 0.25) < 0.001
        assert abs(calculator.component_weights["kast"] - 0.20) < 0.001
        assert abs(calculator.component_weights["util"] - 0.15) < 0.001
        assert abs(calculator.component_weights["clutch"] - 0.10) < 0.001

    def test_component_weights_proportions(self):
        """Verify component weight proportions are correct."""
        calculator = TraceCalculator()
        weights = calculator.component_weights
        # eKILL is 30% of weights
        assert abs(weights["ekill"] / sum(weights.values()) - 0.30) < 0.001
        # AIM is 25% of weights
        assert abs(weights["aim"] / sum(weights.values()) - 0.25) < 0.001


class TestComponentClamping:
    """Test component clamping to [0.3, 2.0]."""

    def test_clamp_below_minimum(self):
        """Components below 0.3 should be clamped to 0.3."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=0.0, aim=0.1, kast=0.2, util=0.25, clutch=0.29
        )
        clamped = calculator._clamp_components(components)
        assert clamped.ekill == 0.3
        assert clamped.aim == 0.3
        assert clamped.kast == 0.3
        assert clamped.util == 0.3
        assert clamped.clutch == 0.3

    def test_clamp_above_maximum(self):
        """Components above 2.0 should be clamped to 2.0."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=2.1, aim=3.0, kast=5.0, util=10.0, clutch=100.0
        )
        clamped = calculator._clamp_components(components)
        assert clamped.ekill == 2.0
        assert clamped.aim == 2.0
        assert clamped.kast == 2.0
        assert clamped.util == 2.0
        assert clamped.clutch == 2.0

    def test_clamp_within_range(self):
        """Components in [0.3, 2.0] should pass through unchanged."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=0.5, aim=1.0, kast=1.5, util=0.75, clutch=1.25
        )
        clamped = calculator._clamp_components(components)
        assert abs(clamped.ekill - 0.5) < 0.001
        assert abs(clamped.aim - 1.0) < 0.001
        assert abs(clamped.kast - 1.5) < 0.001
        assert abs(clamped.util - 0.75) < 0.001
        assert abs(clamped.clutch - 1.25) < 0.001

    def test_clamp_boundary_values(self):
        """Test clamping at exact boundaries."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=0.3, aim=2.0, kast=0.3, util=2.0, clutch=1.0
        )
        clamped = calculator._clamp_components(components)
        assert abs(clamped.ekill - 0.3) < 0.001
        assert abs(clamped.aim - 2.0) < 0.001
        assert abs(clamped.kast - 0.3) < 0.001
        assert abs(clamped.util - 2.0) < 0.001
        assert abs(clamped.clutch - 1.0) < 0.001


class TestWeightingLogic:
    """Test TRACE base calculation with weighted averaging."""

    def test_neutral_components_give_neutral_base(self):
        """All components at 1.0 should give base 1.0."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        assert abs(result.trace_base - 1.0) < 0.001

    def test_high_ekill_weighted_correctly(self):
        """High eKILL should increase base by 0.30."""
        calculator = TraceCalculator()
        # All 1.0, then boost eKILL to 2.0
        components = TraceComponents(
            ekill=2.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        # Base = 2.0*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10
        #      = 0.60 + 0.25 + 0.20 + 0.15 + 0.10 = 1.30
        assert abs(result.trace_base - 1.30) < 0.001

    def test_high_aim_weighted_correctly(self):
        """High AIM should increase base by 0.25."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=2.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        # Base = 1.0*0.30 + 2.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10
        #      = 0.30 + 0.50 + 0.20 + 0.15 + 0.10 = 1.25
        assert abs(result.trace_base - 1.25) < 0.001

    def test_all_minimum_components(self):
        """All components at 0.3 should give base 0.3."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=0.3, aim=0.3, kast=0.3, util=0.3, clutch=0.3
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        assert abs(result.trace_base - 0.3) < 0.001

    def test_all_maximum_components(self):
        """All components at 2.0 should give base 2.0."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=2.0, aim=2.0, kast=2.0, util=2.0, clutch=2.0
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        assert abs(result.trace_base - 2.0) < 0.001


class TestAdjustmentLogic:
    """Test Trust multiplier adjustment of base TRACE."""

    def test_zero_suspicion_no_adjustment(self):
        """Zero suspicion (Trust 1.0) should not adjust base."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.2, aim=0.9, kast=1.1, util=0.8, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        # Trust = 1.0, so adjusted = base * 1.0 = base
        assert abs(result.trace_adjusted - result.trace_base) < 0.001

    def test_full_suspicion_dampens_maximally(self):
        """Full suspicion (Trust 0.73) should dampen base by 27%."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=1.0)
        # Trust = 0.73, so adjusted = 1.0 * 0.73 = 0.73
        assert abs(result.trace_adjusted - 0.73) < 0.001

    def test_medium_suspicion_dampens_moderately(self):
        """Medium suspicion should dampen base moderately."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.5)
        # Trust = 0.85, so adjusted = 1.0 * 0.85 = 0.85
        assert abs(result.trace_adjusted - 0.85) < 0.001


class TestNormalizationLogic:
    """Test normalization by calibration global average."""

    def test_normalization_with_calibration(self):
        """Normalized should be adjusted / global_average."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        calibration = {"global_average": 1.0}
        result = calculator.calculate(
            components, suspicion_score=0.0, calibration=calibration
        )
        # Base=1.0, Trust=1.0, Adjusted=1.0, Normalized=1.0/1.0=1.0
        assert abs(result.trace_normalized - 1.0) < 0.001

    def test_normalization_with_higher_average(self):
        """Normalized should be lower if global_average is high."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        calibration = {"global_average": 1.1}
        result = calculator.calculate(
            components, suspicion_score=0.0, calibration=calibration
        )
        # Adjusted=1.0, Normalized=1.0/1.1≈0.909
        assert abs(result.trace_normalized - (1.0 / 1.1)) < 0.01

    def test_normalization_with_lower_average(self):
        """Normalized should be higher if global_average is low."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        calibration = {"global_average": 0.9}
        result = calculator.calculate(
            components, suspicion_score=0.0, calibration=calibration
        )
        # Adjusted=1.0, Normalized=1.0/0.9≈1.111
        assert abs(result.trace_normalized - (1.0 / 0.9)) < 0.01

    def test_normalization_missing_calibration_fallback(self):
        """Missing calibration should fallback to global_average=1.0."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.0, calibration=None)
        # Normalized = Adjusted / 1.0
        assert abs(result.trace_normalized - result.trace_adjusted) < 0.001

    def test_normalization_invalid_calibration_fallback(self):
        """Invalid calibration (≤0) should fallback to global_average=1.0."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        calibration = {"global_average": 0.0}
        result = calculator.calculate(
            components, suspicion_score=0.0, calibration=calibration
        )
        # Should fallback to 1.0
        assert abs(result.trace_normalized - result.trace_adjusted) < 0.001


class TestEndToEnd:
    """End-to-end TRACE calculation tests."""

    def test_clean_skilled_player(self):
        """Strong, clean player should have high base and high adjusted."""
        calculator = TraceCalculator()
        # Skilled player: all components high
        components = TraceComponents(
            ekill=1.8, aim=1.9, kast=1.6, util=1.5, clutch=1.4
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        # Expected base ≈ 1.8*0.3 + 1.9*0.25 + 1.6*0.2 + 1.5*0.15 + 1.4*0.1
        #               = 0.54 + 0.475 + 0.32 + 0.225 + 0.14 = 1.72
        # Trust = 1.0, so adjusted = 1.72
        assert result.trace_base > 1.6
        assert result.trace_adjusted > 1.6
        assert abs(result.trust_multiplier - 1.0) < 0.001

    def test_weak_player(self):
        """Weak player should have low base and low adjusted."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=0.4, aim=0.5, kast=0.6, util=0.5, clutch=0.3
        )
        result = calculator.calculate(components, suspicion_score=0.0)
        # All components low, so base should be low
        assert result.trace_base < 0.7
        assert result.trace_adjusted < 0.7

    def test_skilled_but_suspected(self):
        """High-skill but suspicious player should have high base but lower adjusted."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.8, aim=1.9, kast=1.6, util=1.5, clutch=1.4
        )
        result = calculator.calculate(components, suspicion_score=1.0)
        # Base should still be high
        assert result.trace_base > 1.6
        # But adjusted should be dampened (multiplied by 0.73)
        assert result.trace_adjusted < result.trace_base
        assert result.trust_multiplier < 0.74  # 0.73 with tolerance

    def test_result_structure(self):
        """TraceResult should have all required fields."""
        calculator = TraceCalculator()
        components = TraceComponents(
            ekill=1.0, aim=1.0, kast=1.0, util=1.0, clutch=1.0
        )
        result = calculator.calculate(components, suspicion_score=0.5)

        # Check all fields exist and are correct type
        assert isinstance(result.trace_base, float)
        assert isinstance(result.trace_adjusted, float)
        assert isinstance(result.trace_normalized, float)
        assert isinstance(result.trust_multiplier, float)
        assert isinstance(result.components, TraceComponents)
        assert isinstance(result.raw_components, TraceComponents)
        assert isinstance(result.calculated_at, str)

        # Check values are reasonable
        assert 0.3 <= result.trace_base <= 2.0
        assert 0.3 <= result.trace_adjusted <= 2.0
        assert 0.73 <= result.trust_multiplier <= 1.0


class TestWeaponValues:
    """Test WEAPON_VALUES constant."""

    def test_weapon_values_exists(self):
        """WEAPON_VALUES should be defined."""
        assert WEAPON_VALUES is not None
        assert isinstance(WEAPON_VALUES, dict)

    def test_weapon_values_includes_rifles(self):
        """WEAPON_VALUES should include major rifles."""
        assert "ak47" in WEAPON_VALUES
        assert "m4a4" in WEAPON_VALUES
        assert "m4a1_silencer" in WEAPON_VALUES
        assert "awp" in WEAPON_VALUES

    def test_weapon_values_includes_pistols(self):
        """WEAPON_VALUES should include pistols."""
        assert "glock" in WEAPON_VALUES
        assert "deagle" in WEAPON_VALUES
        assert "usp_silencer" in WEAPON_VALUES

    def test_weapon_values_includes_knives(self):
        """WEAPON_VALUES should include knife entries."""
        assert "knife" in WEAPON_VALUES
        assert "knife_t" in WEAPON_VALUES
        assert WEAPON_VALUES["knife"] == 0
        assert WEAPON_VALUES["knife_t"] == 0

    def test_weapon_values_ak47_vs_m4(self):
        """AK47 should have more value than M4A4 per CS2 economy."""
        # Actually AK is 2700, M4A4 is 3100, so M4 is more expensive
        assert WEAPON_VALUES["ak47"] == 2700
        assert WEAPON_VALUES["m4a4"] == 3100

    def test_weapon_values_awp_highest(self):
        """AWP should be among the highest value weapons."""
        assert WEAPON_VALUES["awp"] == 4750
        # Only M249 and negev scope weapons should be higher or equal
        assert WEAPON_VALUES["m249"] == 5200
        assert WEAPON_VALUES["g3sg1"] == 5000


class TestTraceCalculatorInitialization:
    """Test TraceCalculator initialization."""

    def test_calculator_instantiation(self):
        """TraceCalculator should instantiate without errors."""
        calculator = TraceCalculator()
        assert calculator is not None

    def test_calculator_has_weights(self):
        """Calculator should have component_weights after init."""
        calculator = TraceCalculator()
        assert hasattr(calculator, "component_weights")
        assert calculator.component_weights is not None

    def test_calculator_has_bounds(self):
        """Calculator should have clamping bounds after init."""
        calculator = TraceCalculator()
        assert hasattr(calculator, "component_min")
        assert hasattr(calculator, "component_max")
        assert calculator.component_min == 0.3
        assert calculator.component_max == 2.0
