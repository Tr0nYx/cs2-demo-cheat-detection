"""Heatmap generation job handling for the CS2 demo viewer worker."""

from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

import psycopg2
import redis

from .heatmap import HeatmapType, render_heatmap

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
HEATMAP_TTL_SECONDS = 604800


@dataclass(frozen=True)
class HeatmapJob:
    """Validated heatmap generation request from the viewer queue."""

    demo_id: str
    heatmap_type: HeatmapType
    player_steam_id: str | None = None
    round_from: int | None = None
    round_to: int | None = None
    map_name: str | None = None
    events: list[dict[str, Any]] | None = None


def handle_heatmap_job(
    payload: Mapping[str, Any],
    *,
    redis_client: redis.Redis | None = None,
    database_url: str | None = None,
    storage_root: str | Path | None = None,
    radar_path: str | Path | None = None,
) -> dict[str, Any]:
    """Render and store one heatmap job.

    Tests can pass `events` and `map_name` in the payload to avoid a database.
    Production jobs load compact event summaries from PostgreSQL.
    """

    job = validate_heatmap_payload(payload)
    storage = Path(storage_root or os.getenv("HEATMAP_STORAGE_PATH", "/storage/heatmaps"))
    radar_dir = str(radar_path or os.getenv("RADAR_ASSET_PATH", "assets/maps/"))
    redis_conn = redis_client or redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"), decode_responses=False)

    map_name = job.map_name
    events = job.events
    if events is None or map_name is None:
        map_name, events = load_heatmap_events(job, database_url or os.getenv("DATABASE_URL"))

    png = render_heatmap(events, map_name, job.heatmap_type, radar_path=radar_dir)
    if not png.startswith(PNG_SIGNATURE):
        raise RuntimeError("Heatmap renderer returned non-PNG bytes")

    cache_key = heatmap_cache_key(job.demo_id, job.player_steam_id, job.heatmap_type.value, job.round_from, job.round_to)
    redis_conn.setex(cache_key, HEATMAP_TTL_SECONDS, base64.b64encode(png))

    output_path = heatmap_file_path(storage, job.demo_id, job.player_steam_id, job.heatmap_type.value, job.round_from, job.round_to)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(png)

    return {
        "demo_id": job.demo_id,
        "heatmap_type": job.heatmap_type.value,
        "cache_key": cache_key,
        "file_path": str(output_path),
        "event_count": len(events),
        "bytes": len(png),
    }


def validate_heatmap_payload(payload: Mapping[str, Any]) -> HeatmapJob:
    """Validate queue payload and return a strongly typed job."""

    demo_id = payload.get("demo_id")
    heatmap_type = payload.get("heatmap_type") or payload.get("type_name")
    if not isinstance(demo_id, str) or not demo_id:
        raise ValueError("demo_id is required")
    if not isinstance(heatmap_type, str):
        raise ValueError("heatmap_type is required")

    try:
        parsed_type = HeatmapType(heatmap_type)
    except ValueError as exc:
        raise ValueError(f"unsupported heatmap_type: {heatmap_type}") from exc

    round_from = _optional_positive_int(payload.get("round_from"), "round_from")
    round_to = _optional_positive_int(payload.get("round_to"), "round_to")
    if round_from is not None and round_to is not None and round_from > round_to:
        raise ValueError("round_from must be less than or equal to round_to")

    player = payload.get("player_steam_id")
    if player is not None and not isinstance(player, str):
        raise ValueError("player_steam_id must be a string when provided")

    map_name = payload.get("map_name")
    if map_name is not None and not isinstance(map_name, str):
        raise ValueError("map_name must be a string when provided")

    raw_events = payload.get("events")
    events = raw_events if isinstance(raw_events, list) else None

    return HeatmapJob(
        demo_id=demo_id,
        heatmap_type=parsed_type,
        player_steam_id=player,
        round_from=round_from,
        round_to=round_to,
        map_name=map_name,
        events=events,
    )


def load_heatmap_events(job: HeatmapJob, database_url: str | None) -> tuple[str, list[dict[str, Any]]]:
    """Load compact event summaries for heatmap rendering."""

    if not database_url:
        raise RuntimeError("DATABASE_URL is required when events are not embedded in the job")

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT map FROM demo WHERE id = %s", (job.demo_id,))
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"demo not found: {job.demo_id}")
            map_name = row[0] or "de_dust2"

            if job.heatmap_type is HeatmapType.GRENADES:
                events = _grenade_events(cur, job)
            else:
                events = _kill_events(cur, job)

    return map_name, events


def heatmap_cache_key(demo_id: str, player: str | None, heatmap_type: str, round_from: int | None, round_to: int | None) -> str:
    round_filter = "all" if round_from is None and round_to is None else f"{round_from or 'start'}-{round_to or 'end'}"
    return f"heatmap:{demo_id}:{player or 'all'}:{heatmap_type}:{round_filter}"


def heatmap_file_path(
    root: str | Path,
    demo_id: str,
    player: str | None,
    heatmap_type: str,
    round_from: int | None,
    round_to: int | None,
) -> Path:
    round_filter = "all" if round_from is None and round_to is None else f"{round_from or 'start'}-{round_to or 'end'}"
    return Path(root) / _safe(demo_id) / f"{_safe(heatmap_type)}_{_safe(player or 'all')}_{_safe(round_filter)}.png"


def _kill_events(cur: Any, job: HeatmapJob) -> list[dict[str, Any]]:
    position_prefix = "attacker" if job.heatmap_type is HeatmapType.KILLS else "victim"
    cur.execute(
        f"""
        SELECT {position_prefix}_x, {position_prefix}_y, aimbot_score
        FROM demo_suspicious_kill
        WHERE demo_id = %s
          AND (%s::int IS NULL OR round_number >= %s)
          AND (%s::int IS NULL OR round_number <= %s)
          AND (%s::text IS NULL OR attacker_steam_id = %s OR victim_steam_id = %s)
        """,
        (job.demo_id, job.round_from, job.round_from, job.round_to, job.round_to, job.player_steam_id, job.player_steam_id, job.player_steam_id),
    )
    return [{"x": row[0], "y": row[1], "value": max(float(row[2] or 1.0), 0.1)} for row in cur.fetchall() if row[0] is not None and row[1] is not None]


def _grenade_events(cur: Any, job: HeatmapJob) -> list[dict[str, Any]]:
    cur.execute(
        """
        SELECT COALESCE(end_x, start_x), COALESCE(end_y, start_y)
        FROM demo_grenade
        WHERE demo_id = %s
          AND (%s::int IS NULL OR round_number >= %s)
          AND (%s::int IS NULL OR round_number <= %s)
          AND (%s::text IS NULL OR thrower_steam_id = %s)
        """,
        (job.demo_id, job.round_from, job.round_from, job.round_to, job.round_to, job.player_steam_id, job.player_steam_id),
    )
    return [{"x": row[0], "y": row[1], "value": 1.0} for row in cur.fetchall() if row[0] is not None and row[1] is not None]


def _optional_positive_int(value: Any, field: str) -> int | None:
    if value is None or value == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a positive integer") from exc
    if parsed < 1:
        raise ValueError(f"{field} must be a positive integer")
    return parsed


def _safe(value: str) -> str:
    return "".join(char if char.isalnum() or char in {"_", ".", "-"} else "_" for char in value)
