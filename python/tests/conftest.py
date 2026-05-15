"""Pytest configuration and shared fixtures for feature extractor tests."""

import numpy as np
import pandas as pd
import pytest

from parser.types import ParsedDemo


@pytest.fixture
def sample_ticks_df():
    """Create sample tick data with player position, aim angles, and shooting state."""
    num_ticks = 500
    ticks = []

    for tick in range(num_ticks):
        # Simulate some yaw and pitch movement (aiming)
        yaw = 45.0 + 10.0 * np.sin(tick / 50.0)
        pitch = 5.0 + 3.0 * np.cos(tick / 50.0)

        # Shooting in bursts (e.g., ticks 100-110, 200-210, etc.)
        is_shooting = (tick % 200 >= 100) and (tick % 200 < 110)

        ticks.append({
            "tick": tick,
            "steamid": 123456789,
            "X": 1000.0 + tick,
            "Y": 2000.0,
            "Z": 100.0,
            "pitch": pitch,
            "yaw": yaw,
            "velocity_X": 50.0,
            "velocity_Y": 10.0,
            "velocity_Z": 0.0,
            "health": 100,
            "armor_value": 100,
            "is_shooting": is_shooting,
            "is_scoped": False,
            "is_airborne": (tick % 100) < 10,
            "active_weapon_name": "AK-47" if is_shooting else "Knife",
            "ping": 20,
        })

    return pd.DataFrame(ticks)


@pytest.fixture
def sample_events_df():
    """Create sample event data including weapon fires, jumps, lands, and rounds."""
    events = []

    # Weapon fire events
    for i in range(5):
        events.append({
            "tick": 105 + i * 200,
            "event_type": "weapon_fire",
            "weapon_name": "AK-47",
        })

    # Jump and land events
    for i in range(20):
        jump_tick = 50 + i * 20
        land_tick = jump_tick + 8
        events.append({
            "tick": jump_tick,
            "event_type": "player_jump",
            "steamid": 123456789,
        })
        events.append({
            "tick": land_tick,
            "event_type": "player_land",
            "steamid": 123456789,
        })

    # Round start and end events
    for i in range(5):
        events.append({
            "tick": i * 100,
            "event_type": "round_start",
        })
        events.append({
            "tick": (i + 1) * 100 - 10,
            "event_type": "round_end",
        })

    # Kill events
    events.append({
        "tick": 105,
        "event_type": "player_death",
    })

    return pd.DataFrame(events)


@pytest.fixture
def sample_parsed_demo(sample_ticks_df, sample_events_df):
    """Create a complete ParsedDemo object with tick and event data."""
    return ParsedDemo(
        ticks_df=sample_ticks_df,
        events_df=sample_events_df,
    )


@pytest.fixture
def minimal_ticks_df():
    """Create minimal tick data for edge case testing."""
    return pd.DataFrame({
        "tick": [0, 1, 2, 3, 4],
        "steamid": [123456789] * 5,
        "X": [0.0] * 5,
        "Y": [0.0] * 5,
        "Z": [0.0] * 5,
        "pitch": [0.0, 1.0, 2.0, 3.0, 4.0],
        "yaw": [0.0, 1.0, 2.0, 3.0, 4.0],
        "velocity_X": [0.0] * 5,
        "velocity_Y": [0.0] * 5,
        "velocity_Z": [0.0] * 5,
        "health": [100] * 5,
        "armor_value": [100] * 5,
        "is_shooting": [True] * 5,
        "is_scoped": [False] * 5,
        "is_airborne": [False] * 5,
        "active_weapon_name": ["AK-47"] * 5,
        "ping": [20] * 5,
    })


@pytest.fixture
def minimal_events_df():
    """Create minimal event data for edge case testing."""
    return pd.DataFrame({
        "tick": [0, 5, 10, 15, 20, 25, 30],
        "event_type": [
            "round_start",
            "weapon_fire",
            "round_end",
            "round_start",
            "weapon_fire",
            "round_end",
            "weapon_fire",
        ],
        "weapon_name": [""] * 2 + [None] + [""] * 2 + [None, "AK-47"],
    })


@pytest.fixture
def minimal_parsed_demo(minimal_ticks_df, minimal_events_df):
    """Create a minimal ParsedDemo object."""
    return ParsedDemo(
        ticks_df=minimal_ticks_df,
        events_df=minimal_events_df,
    )
