"""Pytest fixtures for feature extraction and worker testing.

Provides:
- Minimal synthetic tick/event DataFrames
- ParsedDemo fixtures with various configurations
- Feature extractor instances
- Mock Redis and database connections
"""

from __future__ import annotations

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock

from parser.types import ParsedDemo
from features.aimbot import AimbotExtractor
from features.triggerbot import TriggerbotExtractor
from features.wallhack import WallhackExtractor
from features.recoil import RecoilExtractor
from features.bhop import BhopExtractor
from features.session import SessionConsistencyExtractor


# ============================================================================
# Minimal Tick and Event DataFrames
# ============================================================================


@pytest.fixture
def minimal_tick_df() -> pd.DataFrame:
    """Create a minimal DataFrame with 6 ticks of player state data.

    Represents a linear movement with stable aim and health.
    Used as the base for other fixtures.

    Returns:
        DataFrame with columns: tick, steamid, X, Y, Z, pitch, yaw,
        velocity_X, velocity_Y, velocity_Z, health, armor_value,
        is_shooting, is_scoped, is_airborne, active_weapon_name, ping
    """
    data = {
        "tick": [0, 1, 2, 3, 4, 5],
        "steamid": [1, 1, 1, 1, 1, 1],
        "X": [100.0, 101.0, 102.0, 103.0, 104.0, 105.0],
        "Y": [200.0, 200.0, 200.0, 200.0, 200.0, 200.0],
        "Z": [64.0, 64.0, 64.0, 64.0, 64.0, 64.0],
        "pitch": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "yaw": [0.0, 5.0, 10.0, 15.0, 20.0, 25.0],  # Linear yaw increase
        "velocity_X": [10.0, 10.0, 10.0, 10.0, 10.0, 10.0],
        "velocity_Y": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "velocity_Z": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "health": [100, 100, 100, 100, 100, 100],
        "armor_value": [100, 100, 100, 100, 100, 100],
        "is_shooting": [False, False, False, False, False, False],
        "is_scoped": [False, False, False, False, False, False],
        "is_airborne": [False, False, False, False, False, False],
        "active_weapon_name": ["ak47", "ak47", "ak47", "ak47", "ak47", "ak47"],
        "ping": [20, 20, 20, 20, 20, 20],
    }
    return pd.DataFrame(data)


@pytest.fixture
def minimal_events_df() -> pd.DataFrame:
    """Create a minimal DataFrame with 2 gameplay events.

    Represents a player jump and land, useful for basic event parsing tests.

    Returns:
        DataFrame with columns: tick, event_type
    """
    data = {
        "tick": [2, 4],
        "event_type": ["player_jump", "player_land"],
    }
    return pd.DataFrame(data)


# ============================================================================
# ParsedDemo Fixtures
# ============================================================================


@pytest.fixture
def minimal_parsed_demo(
    minimal_tick_df: pd.DataFrame, minimal_events_df: pd.DataFrame
) -> ParsedDemo:
    """ParsedDemo with minimal 6-tick dataset and basic events.

    Use this for simple feature extraction tests that don't require
    kills, footsteps, or specific event types.

    Args:
        minimal_tick_df: Minimal ticks fixture
        minimal_events_df: Minimal events fixture

    Returns:
        ParsedDemo ready for extraction
    """
    return ParsedDemo(ticks_df=minimal_tick_df, events_df=minimal_events_df)


@pytest.fixture
def demo_with_kills(minimal_tick_df: pd.DataFrame) -> ParsedDemo:
    """ParsedDemo extended with kill events for aimbot/triggerbot testing.

    Extends the ticks to 30 rows with shooting at strategic points (ticks 9, 10, 19, 20).
    Adds player_death events at ticks 10 and 20.

    Returns:
        ParsedDemo with kills for aimbot/triggerbot feature extraction
    """
    # Extend ticks to tick 30
    extended_ticks = []
    for i in range(30):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        row["X"] = 100.0 + i
        row["yaw"] = (i * 5.0) % 360
        # Add shooting at strategic points
        if i in [9, 10, 19, 20]:
            row["is_shooting"] = True
        extended_ticks.append(row)

    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

    # Create kill events: player_death at ticks 10 and 20
    events_data = {
        "tick": [10, 20],
        "event_type": ["player_death", "player_death"],
        "attacker_steamid": [1, 1],
        "victim_steamid": [2, 3],
    }
    events_df = pd.DataFrame(events_data)

    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


@pytest.fixture
def demo_with_footsteps(minimal_tick_df: pd.DataFrame) -> ParsedDemo:
    """ParsedDemo with footstep events for wallhack testing.

    Extends ticks and adds player_footstep events from opponent (steamid=2).

    Returns:
        ParsedDemo with footsteps for wallhack feature extraction
    """
    # Extend ticks to 30
    extended_ticks = []
    for i in range(30):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        row["X"] = 100.0 + i
        extended_ticks.append(row)

    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

    # Add footstep events from opponent
    events_data = {
        "tick": [5, 10, 15, 20, 25],
        "event_type": ["player_footstep"] * 5,
        "steamid": [2, 2, 2, 2, 2],
    }
    events_df = pd.DataFrame(events_data)

    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


@pytest.fixture
def demo_with_jumps(minimal_tick_df: pd.DataFrame) -> ParsedDemo:
    """ParsedDemo with jump/land event pairs for bhop testing.

    Extends ticks and adds alternating player_jump/player_land events.

    Returns:
        ParsedDemo with jumps for bhop feature extraction
    """
    # Extend ticks to 40
    extended_ticks = []
    for i in range(40):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        # Set is_airborne based on jump/land events
        if i in [5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]:
            row["is_airborne"] = True
        extended_ticks.append(row)

    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

    # Add jump/land pairs: jump at 5, land at 8; jump at 10, land at 13, etc.
    events_data = {
        "tick": [5, 8, 10, 13, 15, 18, 20, 23],
        "event_type": [
            "player_jump",
            "player_land",
            "player_jump",
            "player_land",
            "player_jump",
            "player_land",
            "player_jump",
            "player_land",
        ],
    }
    events_df = pd.DataFrame(events_data)

    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


@pytest.fixture
def demo_with_rounds(minimal_tick_df: pd.DataFrame) -> ParsedDemo:
    """ParsedDemo with round_start and round_end events for session consistency testing.

    Extends ticks to 300+ and adds round boundaries.

    Returns:
        ParsedDemo with round events for session feature extraction
    """
    # Extend ticks to 300
    extended_ticks = []
    for i in range(300):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        row["X"] = 100.0 + (i % 100)
        extended_ticks.append(row)

    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

    # Add round events: round_start at 0, 100, 200; round_end at 90, 190, 290
    events_data = {
        "tick": [0, 90, 100, 190, 200, 290],
        "event_type": [
            "round_start",
            "round_end",
            "round_start",
            "round_end",
            "round_start",
            "round_end",
        ],
    }
    events_df = pd.DataFrame(events_data)

    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


# ============================================================================
# Feature Extractor Fixtures
# ============================================================================


@pytest.fixture
def aimbot_extractor() -> AimbotExtractor:
    """AimbotExtractor instance for testing."""
    return AimbotExtractor()


@pytest.fixture
def triggerbot_extractor() -> TriggerbotExtractor:
    """TriggerbotExtractor instance for testing."""
    return TriggerbotExtractor()


@pytest.fixture
def wallhack_extractor() -> WallhackExtractor:
    """WallhackExtractor instance for testing."""
    return WallhackExtractor()


@pytest.fixture
def recoil_extractor() -> RecoilExtractor:
    """RecoilExtractor instance for testing."""
    return RecoilExtractor()


@pytest.fixture
def bhop_extractor() -> BhopExtractor:
    """BhopExtractor instance for testing."""
    return BhopExtractor()


@pytest.fixture
def session_extractor() -> SessionConsistencyExtractor:
    """SessionConsistencyExtractor instance for testing."""
    return SessionConsistencyExtractor()


# ============================================================================
# Mock Database and Redis Fixtures
# ============================================================================


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing worker job queue.

    Returns a Mock object configured to simulate Redis BRPOP behavior.
    """
    mock_redis = Mock()
    mock_redis.ping = Mock(return_value=True)
    mock_redis.brpop = Mock(return_value=None)  # Default: no jobs
    mock_redis.close = Mock(return_value=None)
    return mock_redis


@pytest.fixture
def mock_db_conn():
    """Mock psycopg2 database connection for testing result persistence.

    Returns a Mock object configured to simulate cursor operations.
    """
    mock_conn = Mock()
    mock_cursor = Mock()

    # Configure cursor methods
    mock_cursor.execute = Mock(return_value=None)
    mock_cursor.close = Mock(return_value=None)
    mock_cursor.fetchone = Mock(return_value=None)
    mock_cursor.fetchall = Mock(return_value=[])

    # Configure connection methods
    mock_conn.cursor = Mock(return_value=mock_cursor)
    mock_conn.commit = Mock(return_value=None)
    mock_conn.rollback = Mock(return_value=None)
    mock_conn.close = Mock(return_value=None)

    return mock_conn
