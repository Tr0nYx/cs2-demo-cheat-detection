from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from viewer.heatmap import HeatmapType, PNG_SIGNATURE, render_heatmap


def _radar_dir(tmp_path: Path) -> Path:
    radar_dir = tmp_path / "maps"
    radar_dir.mkdir()
    Image.new("RGBA", (1024, 1024), (20, 24, 28, 255)).save(radar_dir / "de_dust2_radar.png")
    return radar_dir


def test_render_heatmap_returns_png_bytes(tmp_path: Path) -> None:
    radar_dir = _radar_dir(tmp_path)

    data = render_heatmap(
        [{"x": 0, "y": 0, "value": 2.0}],
        "de_dust2",
        HeatmapType.KILLS,
        sigma=3.0,
        radar_path=str(radar_dir),
    )

    assert data.startswith(PNG_SIGNATURE)


def test_render_heatmap_empty_events_returns_png(tmp_path: Path) -> None:
    radar_dir = _radar_dir(tmp_path)

    data = render_heatmap([], "de_dust2", HeatmapType.DEATHS, radar_path=str(radar_dir))

    assert data.startswith(PNG_SIGNATURE)


def test_render_heatmap_requires_valid_heatmap_type(tmp_path: Path) -> None:
    radar_dir = _radar_dir(tmp_path)

    with pytest.raises(TypeError, match="HeatmapType"):
        render_heatmap([], "de_dust2", "kills", radar_path=str(radar_dir))  # type: ignore[arg-type]


def test_render_heatmap_missing_radar_path_is_explicit(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="Radar image not found"):
        render_heatmap([], "de_dust2", HeatmapType.KILLS, radar_path=str(tmp_path / "missing"))

