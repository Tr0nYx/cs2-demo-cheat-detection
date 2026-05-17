"""Unit tests for TRACE component extraction helpers.

Tests validate:
- eKILL calculation with weapon values and modifiers
- AIM reuse of aimbot features
- KAST round participation
- UTIL positive and negative modifiers
- CLUTCH difficulty multipliers
- Factory function extract_all_components
"""

import pytest
from python.scoring.trace_components import (
    extract_ekill,
    extract_aim,
    extract_kast,
    extract_util,
    extract_clutch,
    extract_all_components,
)
from python.scoring.trace_rating import WEAPON_VALUES


class TestExtractEKILL:
    """Test eKILL extraction."""

    def test_zero_kills_returns_neutral(self):
        """Player with zero kills should return neutral 0.73."""
        ekill = extract_ekill([], {})
        assert ekill == 0.73

    def test_empty_kills_list_returns_neutral(self):
        """Empty kills_data should return neutral 0.73."""
        ekill = extract_ekill([], {})
        assert ekill == 0.73

    def test_single_ak_vs_glock_discounted(self):
        """AK kill vs Glock should be discounted (lower value)."""
        # AK (2700) kill vs Glock (300)
        # ratio = 300 / 2700 ≈ 0.111
        # kill_value = min(sqrt(0.111), 2.0) ≈ min(0.333, 2.0) = 0.333
        kills_data = [
            {
                "attacker_weapon": "ak47",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "glock"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should be relatively low (discounted)
        assert 0.3 <= ekill < 0.5

    def test_single_deagle_vs_ak_rewarded(self):
        """Deagle kill vs AK should be rewarded (higher value)."""
        # Deagle (700) kill vs AK (2700)
        # ratio = 2700 / 700 ≈ 3.857
        # kill_value = min(sqrt(3.857), 2.0) ≈ min(1.964, 2.0) = 1.964
        kills_data = [
            {
                "attacker_weapon": "deagle",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should be high (rewarded)
        assert ekill > 1.5

    def test_knife_attacker_no_division_by_zero(self):
        """Knife attacker should not cause division by zero."""
        # Knife (0) kill vs AK (2700)
        # Should treat knife as value 1 to avoid div-by-zero
        # ratio = 2700 / 1 = 2700
        # kill_value = min(sqrt(2700), 2.0) = 2.0 (clamped)
        kills_data = [
            {
                "attacker_weapon": "knife",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should succeed and return a valid value
        assert 0.3 <= ekill <= 2.0
        # Knife vs better-equipped should be high
        assert ekill > 1.0

    def test_knife_t_attacker_safe(self):
        """Knife_t attacker should also work safely."""
        kills_data = [
            {
                "attacker_weapon": "knife_t",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "m4a4"}
        ekill = extract_ekill(kills_data, victim_weapons)
        assert 0.3 <= ekill <= 2.0

    def test_assist_modifier_applied(self):
        """Kill with assist (≥35 damage) should add 0.60 * kill_value."""
        # Single kill with assist
        kills_data = [
            {
                "attacker_weapon": "m4a4",
                "victim_steamid": "player2",
                "assister_damages": [40],  # ≥35, triggers modifier
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should be higher due to assist
        assert ekill > 1.0

    def test_zero_damage_assist_no_modifier(self):
        """Assist with <35 damage should not trigger modifier."""
        kills_data = [
            {
                "attacker_weapon": "m4a4",
                "victim_steamid": "player2",
                "assister_damages": [20],  # <35, no modifier
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        assert 0.3 <= ekill <= 2.0

    def test_multiple_kills_averaged(self):
        """Multiple kills should be averaged."""
        kills_data = [
            {
                "attacker_weapon": "ak47",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            },
            {
                "attacker_weapon": "deagle",
                "victim_steamid": "player3",
                "assister_damages": [],
                "kill_tick": 2000,
            },
        ]
        victim_weapons = {"player2": "glock", "player3": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should be average of discounted (AK vs Glock) and rewarded (Deagle vs AK)
        assert 0.3 <= ekill <= 2.0

    def test_unknown_weapon_uses_default(self):
        """Unknown weapon should use default value 500."""
        kills_data = [
            {
                "attacker_weapon": "unknown_gun",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000,
            }
        ]
        victim_weapons = {"player2": "ak47"}
        ekill = extract_ekill(kills_data, victim_weapons)
        # Should use default (500) and not crash
        assert 0.3 <= ekill <= 2.0

    def test_clamping_to_range(self):
        """eKILL should be clamped to [0.3, 2.0]."""
        # Create extreme cases that would exceed bounds
        # Many kills with high ratios
        kills_data = [
            {
                "attacker_weapon": "deagle",
                "victim_steamid": "player2",
                "assister_damages": [],
                "kill_tick": 1000 + i * 10,
            }
            for i in range(20)
        ]
        victim_weapons = {f"player2": "awp" for _ in range(20)}
        ekill = extract_ekill(kills_data, victim_weapons)
        assert 0.3 <= ekill <= 2.0


class TestExtractAIM:
    """Test AIM extraction from aimbot features."""

    def test_neutral_aim_scores(self):
        """All aim components at 0.5 should give score in middle range."""
        aim = extract_aim(0.5, 0.5, 0.5, 0.5)
        assert 0.3 <= aim <= 2.0
        # Expect roughly mid-range (0.5 → centered value)
        assert abs(aim - 1.15) < 0.1  # 0.3 + 0.5 * 1.7 = 1.15

    def test_zero_aim_scores(self):
        """All aim components at 0.0 should give minimum."""
        aim = extract_aim(0.0, 0.0, 0.0, 0.0)
        assert 0.3 <= aim <= 2.0
        # 0.0 → 0.3 + 0 * 1.7 = 0.3
        assert abs(aim - 0.3) < 0.01

    def test_maximum_aim_scores(self):
        """All aim components at 1.0 should give maximum."""
        aim = extract_aim(1.0, 1.0, 1.0, 1.0)
        assert 0.3 <= aim <= 2.0
        # 1.0 → 0.3 + 1.0 * 1.7 = 2.0
        assert abs(aim - 2.0) < 0.01

    def test_cpq_weights_correctly(self):
        """CPQ should have largest weight (0.35)."""
        # High CPQ, zero others
        # aim_raw = 1.0 * 0.35 = 0.35
        # aim = 0.3 + 0.35 * 1.7 = 0.895
        aim_high_cpq = extract_aim(1.0, 0.0, 0.0, 0.0)
        # Low CPQ, high others
        # aim_raw = 0.0 * 0.35 + 1.0 * 0.20 + 1.0 * 0.25 + 1.0 * 0.20 = 0.65
        # aim = 0.3 + 0.65 * 1.7 = 1.405
        aim_low_cpq = extract_aim(0.0, 1.0, 1.0, 1.0)
        # CPQ weight is only 0.35, but other components together are 0.65, so
        # test that CPQ contributes significantly when others are 0
        assert aim_high_cpq < aim_low_cpq  # Others dominate when CPQ is low
        # And that it has the largest individual weight
        assert extract_aim(1.0, 0.0, 0.0, 0.0) > extract_aim(0.0, 1.0, 0.0, 0.0)

    def test_clamping_input_cpq(self):
        """CPQ >1.0 should be clamped to 1.0."""
        aim_unclamped = extract_aim(1.5, 0.5, 0.5, 0.5)
        aim_clamped = extract_aim(1.0, 0.5, 0.5, 0.5)
        assert abs(aim_unclamped - aim_clamped) < 0.01

    def test_clamping_input_negative(self):
        """Negative scores should be clamped to 0.0."""
        aim_negative = extract_aim(-0.5, 0.5, 0.5, 0.5)
        aim_zero = extract_aim(0.0, 0.5, 0.5, 0.5)
        assert abs(aim_negative - aim_zero) < 0.01

    def test_output_range(self):
        """AIM output should always be in [0.3, 2.0]."""
        for cpq in [0.0, 0.25, 0.5, 0.75, 1.0]:
            for csq in [0.0, 0.5, 1.0]:
                aim = extract_aim(cpq, csq, 0.5, 0.5)
                assert 0.3 <= aim <= 2.0


class TestExtractKAST:
    """Test KAST (round participation) extraction."""

    def test_zero_rounds_returns_neutral(self):
        """Zero rounds played should return neutral 0.73."""
        kast = extract_kast(0, 0, 0, 0, 0)
        assert kast == 0.73

    def test_100_percent_participation(self):
        """All rounds KAST-positive should score high."""
        # 10 rounds, all participated
        kast = extract_kast(10, 0, 0, 0, 10)
        # kast_positive = 10, kast_percentage = 1.0
        # output = 0.3 + 1.0 * 1.7 = 2.0
        assert abs(kast - 2.0) < 0.1

    def test_zero_percent_participation(self):
        """No participation should score low."""
        # 10 rounds, no participation
        kast = extract_kast(0, 0, 0, 0, 10)
        # kast_positive = 0, kast_percentage = 0.0
        # output = 0.3 + 0.0 * 1.7 = 0.3
        assert abs(kast - 0.3) < 0.1

    def test_kills_counted_as_participation(self):
        """Kills should count toward KAST."""
        # 10 rounds, 5 kills
        kast = extract_kast(5, 0, 0, 0, 10)
        # kast_positive = 5, kast_percentage = 0.5
        # output = 0.3 + 0.5 * 1.7 = 1.15
        assert abs(kast - 1.15) < 0.1

    def test_assists_counted_as_participation(self):
        """Assists should count toward KAST."""
        # 10 rounds, 3 assists
        kast = extract_kast(0, 3, 0, 0, 10)
        # kast_positive = 3, kast_percentage = 0.3
        assert abs(kast - (0.3 + 0.3 * 1.7)) < 0.1

    def test_survived_rounds_counted(self):
        """Survived rounds should count toward KAST."""
        # 10 rounds, 7 survived
        kast = extract_kast(0, 0, 7, 0, 10)
        # kast_positive = 7, kast_percentage = 0.7
        assert abs(kast - (0.3 + 0.7 * 1.7)) < 0.1

    def test_traded_within_5s_counted(self):
        """Traded kills should count toward KAST."""
        # 10 rounds, 2 traded
        kast = extract_kast(0, 0, 0, 2, 10)
        # kast_positive = 2, kast_percentage = 0.2
        assert abs(kast - (0.3 + 0.2 * 1.7)) < 0.1

    def test_combined_participation(self):
        """Multiple participation types should sum."""
        # 10 rounds: 3 kills, 2 assists, 4 survived, 1 traded
        # = 10 participation events (but max 10 rounds)
        kast = extract_kast(3, 2, 4, 1, 10)
        # kast_positive = min(10, 10) = 10
        assert kast > 1.5  # High participation

    def test_clamping_kast_positive_to_max_rounds(self):
        """KAST positive should be clamped to total_rounds."""
        # 10 rounds but 20 participation events (impossible, but test clamping)
        kast = extract_kast(10, 10, 10, 10, 10)
        # Should clamp to 10 (100% participation)
        assert abs(kast - 2.0) < 0.1

    def test_output_in_range(self):
        """KAST should always be in [0.3, 2.0]."""
        for kills in [0, 5, 10]:
            for assists in [0, 3, 6]:
                kast = extract_kast(kills, assists, 0, 0, 10)
                assert 0.3 <= kast <= 2.0


class TestExtractUTIL:
    """Test UTIL (utility impact) extraction."""

    def test_zero_utility_baseline(self):
        """No utility usage should give low score."""
        util = extract_util(0, 0, 0, 0, 0, 0)
        # util_raw = 0, output = 0.3 + 0 * 0.5 = 0.3
        assert abs(util - 0.3) < 0.1

    def test_flash_assists_increase_score(self):
        """Flash assists should increase UTIL."""
        util_no_flash = extract_util(0, 0, 0, 0, 0, 0)
        util_with_flash = extract_util(5, 0, 0, 0, 0, 0)
        # 5 flash assists * 2.0 = 10, util = 0.3 + 10 * 0.5 = 5.3, clamped to 2.0
        assert util_with_flash > util_no_flash

    def test_enemy_blind_seconds_increase_score(self):
        """Enemy blind time should increase UTIL."""
        util_no_blind = extract_util(0, 0, 0, 0, 0, 0)
        util_with_blind = extract_util(0, 20, 0, 0, 0, 0)
        # 20 seconds * 0.5 = 10, util = 0.3 + 10 * 0.5 = 5.3, clamped
        assert util_with_blind > util_no_blind

    def test_he_damage_increases_score(self):
        """HE damage should increase UTIL."""
        util_no_he = extract_util(0, 0, 0, 0, 0, 0)
        util_with_he = extract_util(0, 0, 100, 0, 0, 0)
        # 100 * 0.02 = 2, util = 0.3 + 2 * 0.5 = 1.3
        assert util_with_he > util_no_he

    def test_molotov_damage_increases_score(self):
        """Molotov damage should increase UTIL."""
        util_no_molotov = extract_util(0, 0, 0, 0, 0, 0)
        util_with_molotov = extract_util(0, 0, 0, 100, 0, 0)
        # 100 * 0.015 = 1.5, util = 0.3 + 1.5 * 0.5 = 1.05
        assert util_with_molotov > util_no_molotov

    def test_teammate_blind_decreases_score(self):
        """Friendly fire blinds should decrease UTIL (when starting from higher base)."""
        util_no_ff = extract_util(5, 0, 0, 0, 0, 0)  # 5 flash assists
        util_with_ff = extract_util(5, 0, 0, 0, 10, 0)  # Same but with 10s of FF
        # No FF: util_raw = 10, util = 0.3 + 10 * 0.5 = 5.3, clamped to 2.0
        # With FF: util_raw = 10 - 10 = 0, util = 0.3 + 0 * 0.5 = 0.3
        assert util_with_ff < util_no_ff

    def test_unused_utility_decreases_score(self):
        """Unused utility at death should decrease UTIL."""
        util_no_unused = extract_util(0, 0, 0, 0, 0, 0)
        util_with_unused = extract_util(0, 0, 0, 0, 0, 500)
        # 500 * -0.001 = -0.5, util = 0.3 + (-0.5) * 0.5 = 0.05, clamped to 0.3
        assert util_with_unused <= util_no_unused

    def test_positive_and_negative_offset(self):
        """Positive utility should offset negative penalty."""
        util_flash_only = extract_util(5, 0, 0, 0, 0, 0)  # +10 util_raw
        util_with_ff = extract_util(5, 0, 0, 0, 10, 0)  # +10 - 10 = 0 util_raw
        # With FF, score should be lower
        assert util_with_ff < util_flash_only

    def test_output_in_range(self):
        """UTIL should always be in [0.3, 2.0]."""
        test_cases = [
            (0, 0, 0, 0, 0, 0),
            (10, 50, 200, 150, 0, 0),
            (0, 0, 0, 0, 100, 1000),
            (5, 20, 50, 30, 10, 100),
        ]
        for flash, blind, he, mol, ff, unused in test_cases:
            util = extract_util(flash, blind, he, mol, ff, unused)
            assert 0.3 <= util <= 2.0


class TestExtractClutch:
    """Test CLUTCH (high-value round wins) extraction."""

    def test_no_clutches_returns_neutral(self):
        """Player with no clutch situations should return neutral 1.0."""
        clutch = extract_clutch(0, 0, 0, 0, 0)
        assert clutch == 1.0

    def test_1v1_win(self):
        """Single 1v1 win should give 1.0."""
        clutch = extract_clutch(1, 0, 0, 0, 0)
        assert abs(clutch - 1.0) < 0.01

    def test_1v2_win(self):
        """1v2 win should give 1.35."""
        clutch = extract_clutch(0, 1, 0, 0, 0)
        assert abs(clutch - 1.35) < 0.01

    def test_1v3_win(self):
        """1v3 win should give 1.65."""
        clutch = extract_clutch(0, 0, 1, 0, 0)
        assert abs(clutch - 1.65) < 0.01

    def test_1v4_win(self):
        """1v4 win should give 1.90."""
        clutch = extract_clutch(0, 0, 0, 1, 0)
        assert abs(clutch - 1.90) < 0.01

    def test_1v5_win(self):
        """1v5 win should give 2.0 (clamped from 2.10)."""
        clutch = extract_clutch(0, 0, 0, 0, 1)
        # 1v5 multiplier is 2.10, but output is clamped to [0.3, 2.0]
        assert abs(clutch - 2.0) < 0.01

    def test_multiple_1v1_wins_averaged(self):
        """Multiple 1v1 wins should average to 1.0."""
        clutch = extract_clutch(3, 0, 0, 0, 0)
        assert abs(clutch - 1.0) < 0.01

    def test_multiple_1v5_wins_averaged(self):
        """Multiple 1v5 wins should average to 2.0 (clamped from 2.10)."""
        clutch = extract_clutch(0, 0, 0, 0, 2)
        # Average of two 2.10 clutches is 2.10, but clamped to 2.0
        assert abs(clutch - 2.0) < 0.01

    def test_mixed_clutches_weighted_average(self):
        """Mixed clutches should average with correct weights."""
        # 2x 1v1 (1.0 each) + 1x 1v5 (2.1) = (2*1.0 + 2.1) / 3 = 1.37
        clutch = extract_clutch(2, 0, 0, 0, 1)
        expected = (2 * 1.0 + 2.1) / 3
        assert abs(clutch - expected) < 0.01

    def test_single_high_clutch_vs_single_low(self):
        """1v5 should score much higher than 1v1."""
        clutch_1v1 = extract_clutch(1, 0, 0, 0, 0)
        clutch_1v5 = extract_clutch(0, 0, 0, 0, 1)
        assert clutch_1v5 > clutch_1v1

    def test_output_in_range(self):
        """CLUTCH should typically be in [1.0, 2.1], clamped to [0.3, 2.0]."""
        test_cases = [
            (1, 0, 0, 0, 0),  # 1.0
            (0, 1, 0, 0, 0),  # 1.35
            (1, 0, 1, 0, 0),  # (1.0 + 1.65) / 2
            (0, 0, 0, 0, 1),  # 2.1
        ]
        for v1, v2, v3, v4, v5 in test_cases:
            clutch = extract_clutch(v1, v2, v3, v4, v5)
            assert 0.3 <= clutch <= 2.0


class TestExtractAllComponents:
    """Test factory function that combines all extractors."""

    def test_extract_all_components_basic(self):
        """extract_all_components should combine all five components."""
        parser_output = {
            "kills_data": [],
            "victim_weapons": {},
            "kills": 0,
            "assists": 0,
            "survived_rounds": 0,
            "traded_within_5s": 0,
            "total_rounds": 1,
            "flash_assists": 0.0,
            "enemy_blind_seconds": 0.0,
            "he_damage": 0.0,
            "molotov_damage": 0.0,
            "teammate_blind_seconds": 0.0,
            "unused_utility_at_death": 0.0,
            "clutch_1v1_wins": 0,
            "clutch_1v2_wins": 0,
            "clutch_1v3_wins": 0,
            "clutch_1v4_wins": 0,
            "clutch_1v5_wins": 0,
        }
        features_output = {
            "aim_cpq": 0.5,
            "aim_csq": 0.5,
            "aim_ttd": 0.5,
            "aim_scs": 0.5,
        }

        components = extract_all_components(parser_output, features_output)

        # Check all components exist
        assert hasattr(components, "ekill")
        assert hasattr(components, "aim")
        assert hasattr(components, "kast")
        assert hasattr(components, "util")
        assert hasattr(components, "clutch")

    def test_extract_all_missing_keys_use_defaults(self):
        """Missing keys should use safe defaults."""
        parser_output = {}  # Empty, should use all defaults
        features_output = {}  # Empty, should use all defaults

        components = extract_all_components(parser_output, features_output)

        # Should not crash and should return valid ranges
        assert 0.3 <= components.ekill <= 2.0
        assert 0.3 <= components.aim <= 2.0
        assert 0.3 <= components.kast <= 2.0
        assert 0.3 <= components.util <= 2.0
        assert 0.3 <= components.clutch <= 2.0

    def test_extract_all_with_full_data(self):
        """extract_all_components should correctly combine full data."""
        parser_output = {
            "kills_data": [
                {
                    "attacker_weapon": "ak47",
                    "victim_steamid": "victim1",
                    "assister_damages": [40],
                    "kill_tick": 1000,
                }
            ],
            "victim_weapons": {"victim1": "glock"},
            "kills": 5,
            "assists": 2,
            "survived_rounds": 3,
            "traded_within_5s": 1,
            "total_rounds": 10,
            "flash_assists": 3.0,
            "enemy_blind_seconds": 10.0,
            "he_damage": 50.0,
            "molotov_damage": 20.0,
            "teammate_blind_seconds": 2.0,
            "unused_utility_at_death": 100.0,
            "clutch_1v1_wins": 2,
            "clutch_1v2_wins": 1,
            "clutch_1v3_wins": 0,
            "clutch_1v4_wins": 0,
            "clutch_1v5_wins": 0,
        }
        features_output = {
            "aim_cpq": 0.8,
            "aim_csq": 0.7,
            "aim_ttd": 0.6,
            "aim_scs": 0.75,
        }

        components = extract_all_components(parser_output, features_output)

        # All components should be in valid range
        assert 0.3 <= components.ekill <= 2.0
        assert 0.3 <= components.aim <= 2.0
        assert 0.3 <= components.kast <= 2.0
        assert 0.3 <= components.util <= 2.0
        assert 0.3 <= components.clutch <= 2.0

        # Skilled player with good stats should have high aim
        assert components.aim > 1.0  # High aim scores should result in high component

    def test_extract_all_preserves_feature_output(self):
        """extract_all_components should use exact feature output values."""
        parser_output = {
            "kills_data": [],
            "victim_weapons": {},
            "kills": 0,
            "assists": 0,
            "survived_rounds": 0,
            "traded_within_5s": 0,
            "total_rounds": 1,
            "flash_assists": 0.0,
            "enemy_blind_seconds": 0.0,
            "he_damage": 0.0,
            "molotov_damage": 0.0,
            "teammate_blind_seconds": 0.0,
            "unused_utility_at_death": 0.0,
            "clutch_1v1_wins": 0,
            "clutch_1v2_wins": 0,
            "clutch_1v3_wins": 0,
            "clutch_1v4_wins": 0,
            "clutch_1v5_wins": 0,
        }
        # Set specific aim values
        features_output = {
            "aim_cpq": 1.0,
            "aim_csq": 1.0,
            "aim_ttd": 1.0,
            "aim_scs": 1.0,
        }

        components = extract_all_components(parser_output, features_output)

        # Maximum aim input should produce maximum aim component
        assert components.aim > 1.8

    def test_extract_all_handles_zero_rounds(self):
        """extract_all_components should handle zero total_rounds safely."""
        parser_output = {
            "kills_data": [],
            "victim_weapons": {},
            "kills": 5,
            "assists": 2,
            "survived_rounds": 3,
            "traded_within_5s": 1,
            "total_rounds": 0,  # Zero rounds!
            "flash_assists": 0.0,
            "enemy_blind_seconds": 0.0,
            "he_damage": 0.0,
            "molotov_damage": 0.0,
            "teammate_blind_seconds": 0.0,
            "unused_utility_at_death": 0.0,
            "clutch_1v1_wins": 0,
            "clutch_1v2_wins": 0,
            "clutch_1v3_wins": 0,
            "clutch_1v4_wins": 0,
            "clutch_1v5_wins": 0,
        }
        features_output = {
            "aim_cpq": 0.5,
            "aim_csq": 0.5,
            "aim_ttd": 0.5,
            "aim_scs": 0.5,
        }

        components = extract_all_components(parser_output, features_output)

        # KAST should handle zero rounds gracefully (return 0.73)
        assert components.kast == 0.73
