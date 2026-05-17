"""Server-side radar heatmap rendering for CS2 demo viewer data."""

from __future__ import annotations

import io
from enum import Enum
from pathlib import Path
from typing import Iterable, Mapping

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

from .map_config import get_map_config, world_to_map


class HeatmapType(Enum):
    """Supported semantic heatmap layers."""

    KILLS = "kills"
    DEATHS = "deaths"
    DAMAGE = "damage"
    TAKEN = "taken"
    GRENADES = "grenades"


HEATMAP_COLORS: dict[HeatmapType, str] = {
    HeatmapType.KILLS: "YlOrRd",
    HeatmapType.DEATHS: "PuBu",
    HeatmapType.DAMAGE: "hot",
    HeatmapType.TAKEN: "Blues",
    HeatmapType.GRENADES: "Greens",
}

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def render_heatmap(
    events: list[dict],
    map_name: str,
    heatmap_type: HeatmapType,
    sigma: float = 15.0,
    colormap: str | None = None,
    alpha: float = 0.65,
    radar_path: str = "assets/maps/",
) -> bytes:
    """Render a heatmap over a CS2 radar image and return PNG bytes.

    Args:
        events: Event dictionaries with x, y, and optional value fields.
        map_name: CS2 map name such as de_dust2.
        heatmap_type: Semantic layer to render.
        sigma: Gaussian blur radius in pixels.
        colormap: Optional matplotlib colormap override.
        alpha: Heatmap layer opacity in the range [0.0, 1.0].
        radar_path: Directory containing {map_name}_radar.png.

    Returns:
        PNG image bytes suitable for HTTP responses or Redis/file caching.
    """

    if not isinstance(heatmap_type, HeatmapType):
        raise TypeError("heatmap_type must be a HeatmapType")
    if sigma < 0:
        raise ValueError("sigma must be non-negative")
    if not 0 <= alpha <= 1:
        raise ValueError("alpha must be between 0 and 1")

    cfg = get_map_config(map_name)
    radar = _load_radar_image(map_name, radar_path, cfg.radar_width, cfg.radar_height)
    if not events:
        return _png_bytes(radar)

    grid = _build_intensity_grid(events, map_name, cfg.radar_width, cfg.radar_height)
    if sigma > 0:
        grid = gaussian_filter(grid, sigma=sigma)

    if float(grid.max()) <= 0.0:
        return _png_bytes(radar)

    heat_layer = _colorize_grid(
        grid,
        colormap or HEATMAP_COLORS[heatmap_type],
        alpha,
    )

    composed = Image.alpha_composite(radar.convert("RGBA"), heat_layer)
    return _png_bytes(composed)


def _load_radar_image(
    map_name: str,
    radar_path: str,
    width: int,
    height: int,
) -> Image.Image:
    radar_file = Path(radar_path) / f"{map_name}_radar.png"
    if not radar_file.exists():
        raise FileNotFoundError(f"Radar image not found: {radar_file}")

    with Image.open(radar_file) as image:
        radar = image.convert("RGBA")

    if radar.size != (width, height):
        radar = radar.resize((width, height), Image.Resampling.LANCZOS)

    return radar


def _build_intensity_grid(
    events: Iterable[Mapping[str, object]],
    map_name: str,
    width: int,
    height: int,
) -> np.ndarray:
    grid = np.zeros((height, width), dtype=np.float32)

    for event in events:
        if "x" not in event or "y" not in event:
            continue
        try:
            x = float(event["x"])
            y = float(event["y"])
            value = float(event.get("value", 1.0))
        except (TypeError, ValueError):
            continue

        if value <= 0:
            continue

        px, py = world_to_map(x, y, map_name)
        ix = int(round(px))
        iy = int(round(py))
        if 0 <= ix < width and 0 <= iy < height:
            grid[iy, ix] += value

    return grid


def _colorize_grid(grid: np.ndarray, colormap: str, alpha: float) -> Image.Image:
    normalized = grid / grid.max()
    cmap = plt.get_cmap(colormap)
    rgba = cmap(normalized)
    rgba[:, :, 3] = np.where(normalized > 0, normalized * alpha, 0)

    image = (rgba * 255).astype(np.uint8)
    return Image.fromarray(image, mode="RGBA")


def _png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    data = buffer.getvalue()
    if not data.startswith(PNG_SIGNATURE):
        raise RuntimeError("Generated image is not a valid PNG")
    return data

