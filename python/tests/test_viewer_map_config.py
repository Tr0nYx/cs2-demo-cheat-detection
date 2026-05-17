from __future__ import annotations

import pytest

from viewer.map_config import MAP_CONFIGS, get_map_config, map_to_world, world_to_map


@pytest.mark.parametrize("map_name", sorted(MAP_CONFIGS))
def test_world_to_map_round_trip_for_all_supported_maps(map_name: str) -> None:
    px, py = world_to_map(128.5, -64.25, map_name)
    x, y = map_to_world(px, py, map_name)

    assert x == pytest.approx(128.5)
    assert y == pytest.approx(-64.25)


def test_dust2_origin_maps_to_expected_radar_pixel() -> None:
    px, py = world_to_map(0, 0, "de_dust2")

    assert px == pytest.approx(562.7, abs=0.1)
    assert py == pytest.approx(736.1, abs=0.1)


def test_unsupported_map_raises_clear_error() -> None:
    with pytest.raises(ValueError, match="Unsupported map 'de_cache'"):
        get_map_config("de_cache")

