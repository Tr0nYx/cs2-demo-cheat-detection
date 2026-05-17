"""Grenade trajectory helpers for the 2D demo viewer."""

from __future__ import annotations

import math
from typing import Any, Iterable

from .map_config import world_to_map


def find_similar_throws(
    target_throw: dict[str, Any],
    all_throws: list[dict[str, Any]],
    threshold_pixels: float = 100.0,
) -> list[dict[str, Any]]:
    """Find same-type grenade throws with similar radar end positions."""

    if threshold_pixels < 0:
        raise ValueError("threshold_pixels must be non-negative")

    target_type = _required_string(target_throw, "type")
    map_name = _required_string(target_throw, "map_name")
    target_px, target_py = _end_position_pixels(target_throw, map_name)

    matches: list[dict[str, Any]] = []
    for throw in all_throws:
        if throw is target_throw:
            continue
        if str(throw.get("type", "")) != target_type:
            continue
        if str(throw.get("map_name", map_name)) != map_name:
            continue

        end_px, end_py = _end_position_pixels(throw, map_name)
        distance = math.dist((target_px, target_py), (end_px, end_py))
        if distance <= threshold_pixels:
            item = dict(throw)
            item["distance_pixels"] = distance
            item["end_map_px"] = end_px
            item["end_map_py"] = end_py
            matches.append(item)

    return sorted(matches, key=lambda item: item["distance_pixels"])


def downsample_trajectory(
    trajectory: Iterable[dict[str, Any] | tuple[float, float] | tuple[float, float, float]],
    step: int = 4,
) -> list[list[float]]:
    """Downsample grenade trajectory points for compact API payloads."""

    if step <= 0:
        raise ValueError("step must be positive")

    sampled: list[list[float]] = []
    for index, point in enumerate(trajectory):
        if index % step != 0:
            continue
        if isinstance(point, dict):
            sampled.append([float(point["x"]), float(point["y"])])
        else:
            sampled.append([float(point[0]), float(point[1])])
    return sampled


def _end_position_pixels(throw: dict[str, Any], map_name: str) -> tuple[float, float]:
    if "end_map_px" in throw and "end_map_py" in throw:
        return float(throw["end_map_px"]), float(throw["end_map_py"])

    end_x = _required_float(throw, "end_x")
    end_y = _required_float(throw, "end_y")
    return world_to_map(end_x, end_y, map_name)


def _required_string(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if value is None or str(value) == "":
        raise ValueError(f"Missing required grenade field: {key}")
    return str(value)


def _required_float(data: dict[str, Any], key: str) -> float:
    value = data.get(key)
    if value is None:
        raise ValueError(f"Missing required grenade field: {key}")
    return float(value)

