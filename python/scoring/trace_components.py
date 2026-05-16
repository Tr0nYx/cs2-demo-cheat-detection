"""TRACE component extraction helpers for all five TRACE components.

This module converts parsed demo data and existing feature extractor outputs
into normalized TRACE components (eKILL, AIM, KAST, UTIL, CLUTCH). All helpers
return values in the range [0.3, 2.0] before weighting.

Each function reuses existing parsed data or feature outputs without duplication
per Phase 3/7 patterns.
"""

from __future__ import annotations

from typing import List, Dict, Tuple, Optional, TYPE_CHECKING

from .trace_rating import WEAPON_VALUES, TraceComponents

if TYPE_CHECKING:
    from parser.types import ParsedDemo


def extract_ekill(
    kills_data: List[Dict],
    victim_weapons: Dict[str, str],
) -> float:
    """Extract eKILL (economy-adjusted kill value) from kill events.

    eKILL measures kill value adjusted by weapon economy. Kills against better-equipped
    opponents count more. Kills against poorly-equipped opponents count less.

    Formula per kill:
    - ratio = victim_weapon_value / max(attacker_weapon_value, 1)
    - kill_value = min(sqrt(ratio), 2.0)

    Modifiers:
    - Assisted kill with ≥35 damage: add 0.60 * kill_value
    - Death within 5s after own kill: multiply that kill by 0.85
    - Two kills within 5s: multiply the second kill by 1.10
    - Knife attacker: set attacker_weapon_value to 1 (avoid division by zero)
    - Zero kills: return neutral 0.73

    Args:
        kills_data: List of kill event dicts from parsed demo. Each dict should contain:
                   'attacker_weapon', 'victim_steamid', 'assisters', 'assister_damages',
                   'kill_tick', 'attacker_death_tick' (optional).
        victim_weapons: Dict mapping victim steamid to their equipped weapon name (string) for the kill.

    Returns:
        eKILL score in range [0.3, 2.0]. Neutral 0.73 if zero kills.
    """
    if not kills_data:
        return 0.73

    total_kill_value = 0.0
    kill_count = 0

    for kill_idx, kill in enumerate(kills_data):
        # Get weapon names
        attacker_weapon = kill.get("attacker_weapon", "")
        victim_steamid = kill.get("victim_steamid", "")

        # Get attacker and victim weapon names from kill data
        attacker_value = WEAPON_VALUES.get(attacker_weapon, 500)
        # victim_weapons maps steamid to weapon name, need to look up value
        victim_weapon_name = victim_weapons.get(victim_steamid, "ak47")
        victim_value = WEAPON_VALUES.get(victim_weapon_name, 500)

        # Knife attacker: use 1 to avoid division by zero
        if attacker_weapon in ("knife", "knife_t"):
            attacker_value = 1

        # Calculate base kill_value
        if attacker_value > 0:
            ratio = victim_value / max(attacker_value, 1)
        else:
            ratio = 1.0

        kill_value = min((ratio ** 0.5), 2.0)

        # Apply assist modifier if present (≥35 damage)
        assister_damages = kill.get("assister_damages", [])
        if assister_damages and max(assister_damages) >= 35:
            kill_value += 0.60 * kill_value

        # Apply death within 5s modifier (if available in kill data)
        attacker_death_tick = kill.get("attacker_death_tick")
        kill_tick = kill.get("kill_tick", 0)
        if attacker_death_tick and (attacker_death_tick - kill_tick) <= (5 * 128):  # ~5 seconds
            kill_value *= 0.85

        # Apply consecutive kill modifier (two kills within 5s)
        if kill_idx > 0:
            prev_kill = kills_data[kill_idx - 1]
            prev_kill_tick = prev_kill.get("kill_tick", 0)
            if (kill_tick - prev_kill_tick) <= (5 * 128):  # ~5 seconds
                kill_value *= 1.10

        total_kill_value += kill_value
        kill_count += 1

    # Average across all kills, scale to range
    if kill_count > 0:
        ekill_raw = total_kill_value / kill_count
    else:
        return 0.73

    # Clamp to [0.3, 2.0]
    ekill = max(0.3, min(2.0, ekill_raw))
    return ekill


def extract_aim(
    aim_cpq: float,
    aim_csq: float,
    aim_ttd: float,
    aim_scs: float,
) -> float:
    """Extract AIM (mechanical skill) from existing aimbot feature outputs.

    AIM reuses the crosshair placement quality (cpq), counter-strafe quality (csq),
    time-to-damage (ttd), and spray control score (scs) outputs from the existing
    aimbot feature extractor. No duplication of aimbot logic.

    Formula:
    - aim_raw = cpq*0.35 + csq*0.20 + ttd*0.25 + scs*0.20
    - Clamp inputs to [0.0, 1.0] (feature outputs are normalized to this range)
    - Scale output to [0.3, 2.0]

    Args:
        aim_cpq: Crosshair placement quality [0.0, 1.0] from aimbot extractor.
        aim_csq: Counter-strafe quality [0.0, 1.0] from aimbot extractor.
        aim_ttd: Time-to-damage score [0.0, 1.0] from aimbot extractor.
        aim_scs: Spray control score [0.0, 1.0] from aimbot extractor.

    Returns:
        AIM score in range [0.3, 2.0].
    """
    # Clamp inputs to [0.0, 1.0]
    cpq = max(0.0, min(1.0, aim_cpq))
    csq = max(0.0, min(1.0, aim_csq))
    ttd = max(0.0, min(1.0, aim_ttd))
    scs = max(0.0, min(1.0, aim_scs))

    # Calculate aim_raw with fixed weights
    aim_raw = cpq * 0.35 + csq * 0.20 + ttd * 0.25 + scs * 0.20

    # Scale from [0.0, 1.0] to [0.3, 2.0]
    # Linear mapping: aim_raw ∈ [0, 1] → output ∈ [0.3, 2.0]
    # output = 0.3 + (aim_raw * (2.0 - 0.3)) = 0.3 + aim_raw * 1.7
    aim = 0.3 + (aim_raw * 1.7)

    # Clamp to [0.3, 2.0]
    aim = max(0.3, min(2.0, aim))
    return aim


def extract_kast(
    kills: int,
    assists: int,
    survived_rounds: int,
    traded_within_5s: int,
    total_rounds: int,
) -> float:
    """Extract KAST (round participation percentage).

    KAST measures the percentage of rounds where the player had a positive impact:
    - got a kill, OR
    - got an assist, OR
    - survived the round, OR
    - was traded within 5 seconds after death

    These are not mutually exclusive; a single round counts as KAST-positive if ANY
    of these conditions is met.

    Formula:
    - kast_positive_rounds = kills + assists + survived_rounds + traded_within_5s
      (note: players can have multiple of these in a single round, but a round only
       counts once toward kast_positive_rounds)
    - For simplicity, we estimate: kast_positive = kills + assists + survived_rounds + traded_within_5s
    - kast_percentage = kast_positive_rounds / total_rounds
    - Scale: baseline 0.73 for average player, range [0.3, 2.0]

    Args:
        kills: Total kills in match.
        assists: Total assists in match.
        survived_rounds: Rounds where player survived (not traded).
        traded_within_5s: Rounds where player was traded within 5s after death.
        total_rounds: Total rounds played.

    Returns:
        KAST score in range [0.3, 2.0]. Neutral 0.73 if zero rounds played.
    """
    if total_rounds == 0:
        return 0.73

    # Estimate kast_positive rounds (not mutually exclusive)
    # In practice, these would come from round event analysis, but for MVP
    # we approximate as: kills + assists + survived + traded
    kast_positive_rounds = kills + assists + survived_rounds + traded_within_5s

    # Clamp to [0, total_rounds] to avoid nonsensical percentages
    kast_positive_rounds = min(kast_positive_rounds, total_rounds)

    # Calculate KAST percentage
    kast_percentage = kast_positive_rounds / total_rounds

    # Scale to [0.3, 2.0] with 0.73 as baseline (100% KAST)
    # For 100% participation (kast_percentage=1.0), we want score > 1.0
    # Linear mapping: kast_percentage ∈ [0, 1] → output ∈ [0.3, 2.0]
    # At 0%: 0.3, At 73%: 0.73, At 100%: 1.5
    # Using formula: output = 0.3 + (kast_percentage * (2.0 - 0.3)) = 0.3 + kast_percentage * 1.7
    kast = 0.3 + (kast_percentage * 1.7)

    # Clamp to [0.3, 2.0]
    kast = max(0.3, min(2.0, kast))
    return kast


def extract_util(
    flash_assists: float,
    enemy_blind_seconds: float,
    he_damage: float,
    molotov_damage: float,
    teammate_blind_seconds: float,
    unused_utility_at_death: float,
) -> float:
    """Extract UTIL (team utility impact).

    UTIL measures the net positive impact from utility usage (flashes, grenades, smoke).
    Positive contributions increase the score; penalties decrease it.

    Formula per TRACE.md:
    util_raw = flash_assists * 2.0 + enemy_blind_seconds * 0.5 + he_damage * 0.02 +
               molotov_damage * 0.015 - teammate_blind_seconds * 1.0 - unused_utility * 0.001

    Range [0.3, 2.0]. Default 0.5 for players with no utility usage.

    Args:
        flash_assists: Number of flash assists (enemy blinded and killed/assisted).
        enemy_blind_seconds: Total seconds of enemies blinded by utility.
        he_damage: Total damage dealt by HE grenades to enemies.
        molotov_damage: Total damage dealt by molotov grenades to enemies.
        teammate_blind_seconds: Total seconds of teammates blinded by player's utility.
        unused_utility_at_death: Value of unused utility dropped at death.

    Returns:
        UTIL score in range [0.3, 2.0].
    """
    # Calculate util_raw per formula
    util_raw = (
        flash_assists * 2.0
        + enemy_blind_seconds * 0.5
        + he_damage * 0.02
        + molotov_damage * 0.015
        - teammate_blind_seconds * 1.0
        - unused_utility_at_death * 0.001
    )

    # Scale: baseline around 0.5 for players with minimal utility
    # Center around 1.0 for average utility usage
    # Use 0.3 + (util_raw / 2.0) to map wide range to [0.3, 2.0]
    # This avoids extreme sensitivity to outliers
    util = 0.3 + (util_raw * 0.5) if util_raw >= 0 else max(0.3, 0.3 + util_raw * 0.5)

    # Clamp to [0.3, 2.0]
    util = max(0.3, min(2.0, util))
    return util


def extract_clutch(
    clutch_1v1_wins: int,
    clutch_1v2_wins: int,
    clutch_1v3_wins: int,
    clutch_1v4_wins: int,
    clutch_1v5_wins: int,
) -> float:
    """Extract CLUTCH (high-value round wins).

    CLUTCH measures the player's ability to win unlikely round situations.
    Each clutch situation is weighted by its difficulty:
    - 1v1: 1.00x (baseline)
    - 1v2: 1.35x
    - 1v3: 1.65x
    - 1v4: 1.90x
    - 1v5: 2.10x (most valuable)

    Players with no clutch situations receive neutral 1.0.

    Formula:
    clutch_raw = (1v1*1.0 + 1v2*1.35 + 1v3*1.65 + 1v4*1.90 + 1v5*2.10) /
                 (1v1 + 1v2 + 1v3 + 1v4 + 1v5)
    If no clutches: return 1.0

    Args:
        clutch_1v1_wins: Number of 1v1 clutches won.
        clutch_1v2_wins: Number of 1v2 clutches won.
        clutch_1v3_wins: Number of 1v3 clutches won.
        clutch_1v4_wins: Number of 1v4 clutches won.
        clutch_1v5_wins: Number of 1v5 clutches won.

    Returns:
        CLUTCH score. Neutral 1.0 if no clutches. Range [1.0, 2.1] typically,
        can go to 2.0 if clamped.
    """
    # Check if no clutches
    total_clutches = (
        clutch_1v1_wins
        + clutch_1v2_wins
        + clutch_1v3_wins
        + clutch_1v4_wins
        + clutch_1v5_wins
    )

    if total_clutches == 0:
        return 1.0

    # Weighted sum of clutches by difficulty
    clutch_raw = (
        clutch_1v1_wins * 1.0
        + clutch_1v2_wins * 1.35
        + clutch_1v3_wins * 1.65
        + clutch_1v4_wins * 1.90
        + clutch_1v5_wins * 2.10
    ) / total_clutches

    # Clamp to [0.3, 2.0]
    clutch = max(0.3, min(2.0, clutch_raw))
    return clutch


def extract_all_components(
    parser_output: Dict,
    features_output: Dict,
) -> TraceComponents:
    """Extract all five TRACE components from parser and feature outputs.

    This factory function combines parsed events (kills, utility) and feature
    extractor outputs (AIM) into a single TraceComponents object. It handles
    missing keys with safe defaults.

    Args:
        parser_output: Dictionary with keys:
                      - 'kills_data': list of kill dicts
                      - 'victim_weapons': dict mapping steamid to weapon
                      - 'kills': int count of kills
                      - 'assists': int count of assists
                      - 'survived_rounds': int
                      - 'traded_within_5s': int
                      - 'total_rounds': int
                      - 'flash_assists': float
                      - 'enemy_blind_seconds': float
                      - 'he_damage': float
                      - 'molotov_damage': float
                      - 'teammate_blind_seconds': float
                      - 'unused_utility_at_death': float
                      - 'clutch_1v1_wins' through 'clutch_1v5_wins': int

        features_output: Dictionary with keys:
                        - 'aim_cpq': float [0.0, 1.0]
                        - 'aim_csq': float [0.0, 1.0]
                        - 'aim_ttd': float [0.0, 1.0]
                        - 'aim_scs': float [0.0, 1.0]

    Returns:
        TraceComponents with all five components extracted and normalized.
    """
    # Extract eKILL
    kills_data = parser_output.get("kills_data", [])
    victim_weapons = parser_output.get("victim_weapons", {})
    ekill = extract_ekill(kills_data, victim_weapons)

    # Extract AIM
    aim_cpq = features_output.get("aim_cpq", 0.5)
    aim_csq = features_output.get("aim_csq", 0.5)
    aim_ttd = features_output.get("aim_ttd", 0.5)
    aim_scs = features_output.get("aim_scs", 0.5)
    aim = extract_aim(aim_cpq, aim_csq, aim_ttd, aim_scs)

    # Extract KAST
    kills = parser_output.get("kills", 0)
    assists = parser_output.get("assists", 0)
    survived_rounds = parser_output.get("survived_rounds", 0)
    traded_within_5s = parser_output.get("traded_within_5s", 0)
    total_rounds = parser_output.get("total_rounds", 1)
    kast = extract_kast(kills, assists, survived_rounds, traded_within_5s, total_rounds)

    # Extract UTIL
    flash_assists = parser_output.get("flash_assists", 0.0)
    enemy_blind_seconds = parser_output.get("enemy_blind_seconds", 0.0)
    he_damage = parser_output.get("he_damage", 0.0)
    molotov_damage = parser_output.get("molotov_damage", 0.0)
    teammate_blind_seconds = parser_output.get("teammate_blind_seconds", 0.0)
    unused_utility_at_death = parser_output.get("unused_utility_at_death", 0.0)
    util = extract_util(
        flash_assists,
        enemy_blind_seconds,
        he_damage,
        molotov_damage,
        teammate_blind_seconds,
        unused_utility_at_death,
    )

    # Extract CLUTCH
    clutch_1v1_wins = parser_output.get("clutch_1v1_wins", 0)
    clutch_1v2_wins = parser_output.get("clutch_1v2_wins", 0)
    clutch_1v3_wins = parser_output.get("clutch_1v3_wins", 0)
    clutch_1v4_wins = parser_output.get("clutch_1v4_wins", 0)
    clutch_1v5_wins = parser_output.get("clutch_1v5_wins", 0)
    clutch = extract_clutch(
        clutch_1v1_wins,
        clutch_1v2_wins,
        clutch_1v3_wins,
        clutch_1v4_wins,
        clutch_1v5_wins,
    )

    return TraceComponents(
        ekill=ekill,
        aim=aim,
        kast=kast,
        util=util,
        clutch=clutch,
    )
