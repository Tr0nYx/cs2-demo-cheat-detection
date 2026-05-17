"""CS2 radar map coordinate transforms.

The map values mirror Valve overview metadata for the active duty maps used by
the viewer. Radar PNGs are expected at assets/maps/{map_name}_radar.png.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MapConfig:
    """Overview metadata needed to transform world coordinates to radar pixels."""

    name: str
    pos_x: float
    pos_y: float
    scale: float
    radar_width: int = 1024
    radar_height: int = 1024


MAP_CONFIGS: dict[str, MapConfig] = {
    "de_dust2": MapConfig("de_dust2", -2476, 3239, 4.4),
    "de_mirage": MapConfig("de_mirage", -3230, 1713, 5.0),
    "de_inferno": MapConfig("de_inferno", -2087, 3870, 4.9),
    "de_nuke": MapConfig("de_nuke", -3453, 2887, 7.0),
    "de_ancient": MapConfig("de_ancient", -2953, 2164, 5.0),
    "de_anubis": MapConfig("de_anubis", -2796, 3328, 5.22),
    "de_vertigo": MapConfig("de_vertigo", -3168, 1762, 4.0),
}

# Nuke and Vertigo have vertical radar layers. Phase 13 starts with a single
# overview layer; z-threshold layer selection is intentionally deferred.
LAYER_SELECTION_DEFERRED_MAPS = frozenset({"de_nuke", "de_vertigo"})


def get_map_config(map_name: str) -> MapConfig:
    """Return map config or raise a clear error for unsupported maps."""

    try:
        return MAP_CONFIGS[map_name]
    except KeyError as exc:
        supported = ", ".join(sorted(MAP_CONFIGS))
        raise ValueError(f"Unsupported map '{map_name}'. Supported maps: {supported}") from exc


def world_to_map(x: float, y: float, map_name: str) -> tuple[float, float]:
    """Transform CS2 world coordinates into 2D radar pixels."""

    cfg = get_map_config(map_name)
    px = (x - cfg.pos_x) / cfg.scale
    py = (cfg.pos_y - y) / cfg.scale
    return px, py


def map_to_world(px: float, py: float, map_name: str) -> tuple[float, float]:
    """Transform 2D radar pixels back into CS2 world coordinates."""

    cfg = get_map_config(map_name)
    x = px * cfg.scale + cfg.pos_x
    y = cfg.pos_y - py * cfg.scale
    return x, y


def is_within_radar(px: float, py: float, map_name: str) -> bool:
    """Return whether a radar pixel coordinate is inside the configured image."""

    cfg = get_map_config(map_name)
    return 0 <= px <= cfg.radar_width and 0 <= py <= cfg.radar_height

