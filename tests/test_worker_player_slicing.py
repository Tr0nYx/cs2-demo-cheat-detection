import pandas as pd

from parser.types import ParsedDemo
from worker import _player_steam_ids, _slice_demo_for_player


def test_player_steam_ids_excludes_zero_and_sorts():
    parsed = ParsedDemo(
        ticks_df=pd.DataFrame(
            [
                {"tick": 1, "steamid": 2},
                {"tick": 1, "steamid": 0},
                {"tick": 1, "steamid": 1},
            ]
        ),
        events_df=pd.DataFrame(),
    )

    assert _player_steam_ids(parsed) == ["1", "2"]


def test_slice_demo_for_player_keeps_player_actions_and_opponent_footsteps():
    ticks = pd.DataFrame(
        [
            {"tick": 10, "steamid": 1, "yaw": 10.0},
            {"tick": 10, "steamid": 2, "yaw": 20.0},
            {"tick": 11, "steamid": 1, "yaw": 12.0},
            {"tick": 11, "steamid": 2, "yaw": 22.0},
        ]
    )
    events = pd.DataFrame(
        [
            {"tick": 1, "event_type": "round_start"},
            {"tick": 10, "event_type": "weapon_fire", "user_steamid": 1},
            {"tick": 10, "event_type": "weapon_fire", "user_steamid": 2},
            {"tick": 11, "event_type": "player_death", "attacker_steamid": 1, "victim_steamid": 2},
            {"tick": 12, "event_type": "player_death", "attacker_steamid": 2, "victim_steamid": 1},
            {"tick": 13, "event_type": "player_footstep", "user_steamid": 2},
            {"tick": 14, "event_type": "player_footstep", "user_steamid": 1},
            {"tick": 15, "event_type": "player_jump", "user_steamid": 1},
            {"tick": 16, "event_type": "player_land", "user_steamid": 1},
            {"tick": 100, "event_type": "round_end"},
        ]
    )

    sliced = _slice_demo_for_player(ParsedDemo(ticks, events), "1")

    assert sliced.ticks_df["steamid"].astype(str).unique().tolist() == ["1"]
    assert sliced.events_df["event_type"].tolist() == [
        "round_start",
        "weapon_fire",
        "player_death",
        "player_footstep",
        "player_jump",
        "player_land",
        "round_end",
    ]
    assert sliced.events_df[sliced.events_df["event_type"] == "player_death"]["attacker_steamid"].astype(str).tolist() == ["1"]
    assert sliced.events_df[sliced.events_df["event_type"] == "player_footstep"]["user_steamid"].astype(str).tolist() == ["2"]
