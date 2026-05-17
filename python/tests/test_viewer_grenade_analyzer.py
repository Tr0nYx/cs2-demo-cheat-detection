from __future__ import annotations

import pytest

from viewer.grenade_analyzer import downsample_trajectory, find_similar_throws


def test_find_similar_throws_filters_by_type_and_threshold() -> None:
    target = {
        "type": "smoke",
        "map_name": "de_dust2",
        "end_x": 0,
        "end_y": 0,
    }
    throws = [
        {"id": "near", "type": "smoke", "map_name": "de_dust2", "end_x": 20, "end_y": 20},
        {"id": "far", "type": "smoke", "map_name": "de_dust2", "end_x": 2000, "end_y": 2000},
        {"id": "wrong-type", "type": "flash", "map_name": "de_dust2", "end_x": 10, "end_y": 10},
    ]

    matches = find_similar_throws(target, throws, threshold_pixels=10)

    assert [match["id"] for match in matches] == ["near"]
    assert matches[0]["distance_pixels"] < 10


def test_find_similar_throws_sorts_by_distance() -> None:
    target = {"type": "he", "map_name": "de_dust2", "end_map_px": 100, "end_map_py": 100}
    throws = [
        {"id": "b", "type": "he", "map_name": "de_dust2", "end_map_px": 106, "end_map_py": 100},
        {"id": "a", "type": "he", "map_name": "de_dust2", "end_map_px": 102, "end_map_py": 100},
    ]

    matches = find_similar_throws(target, throws, threshold_pixels=10)

    assert [match["id"] for match in matches] == ["a", "b"]


def test_find_similar_throws_raises_for_unsupported_map() -> None:
    target = {"type": "smoke", "map_name": "de_cache", "end_x": 0, "end_y": 0}

    with pytest.raises(ValueError, match="Unsupported map"):
        find_similar_throws(target, [])


def test_downsample_trajectory_every_n_points() -> None:
    trajectory = [{"x": index, "y": -index, "z": 64} for index in range(10)]

    assert downsample_trajectory(trajectory, step=4) == [[0.0, 0.0], [4.0, -4.0], [8.0, -8.0]]

