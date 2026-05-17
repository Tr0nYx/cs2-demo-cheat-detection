"""Export sampled demo ticks into compressed Redis chunks for viewer playback."""

from __future__ import annotations

import base64
import json
import zlib
from datetime import datetime, timezone
from typing import Any, Iterable

import pandas as pd

from parser.adapter import DemoParserAdapter

TICK_CACHE_TTL_SECONDS = 48 * 60 * 60
DEFAULT_CHUNK_SIZE = 500


def export_ticks_to_cache(
    demo_path: str,
    demo_id: str,
    redis_client: Any,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    step: int = 1,
) -> int:
    """Parse a demo and export sampled tick chunks into Redis.

    Returns the number of sampled ticks written across all chunks.
    """

    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if step <= 0:
        raise ValueError("step must be positive")

    parser = DemoParserAdapter()
    parsed = parser.parse_demo(demo_path)
    ticks_df = _sample_ticks(parsed.ticks_df, step)

    exported = 0
    for chunk in _chunk_tick_rows(ticks_df, chunk_size):
        if not chunk:
            continue
        from_tick = int(chunk[0]["tick"])
        to_tick = int(chunk[-1]["tick"])
        payload = {
            "demo_id": demo_id,
            "from_tick": from_tick,
            "to_tick": to_tick,
            "step": step,
            "ticks": chunk,
        }
        key = tick_cache_key(demo_id, from_tick, to_tick, step)
        encoded = encode_payload(payload)
        _redis_set(redis_client, key, encoded, TICK_CACHE_TTL_SECONDS)
        exported += len(chunk)
        log("tick_chunk_exported", demo_id=demo_id, key=key, ticks=len(chunk))

    return exported


def tick_cache_key(demo_id: str, from_tick: int, to_tick: int, step: int) -> str:
    """Build the Redis key for a sampled tick chunk."""

    return f"demo_ticks:{demo_id}:{from_tick}:{to_tick}:{step}"


def encode_payload(payload: dict[str, Any]) -> str:
    """Encode a JSON payload as zlib-compressed base64 text."""

    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.b64encode(zlib.compress(raw)).decode("ascii")


def decode_payload(encoded: str) -> dict[str, Any]:
    """Decode a payload produced by encode_payload."""

    raw = zlib.decompress(base64.b64decode(encoded.encode("ascii")))
    decoded = json.loads(raw.decode("utf-8"))
    if not isinstance(decoded, dict):
        raise ValueError("Decoded tick payload must be a JSON object")
    return decoded


def normalize_tick_group(tick: int, rows: pd.DataFrame) -> dict[str, Any]:
    """Normalize all player rows for one tick into the viewer API shape."""

    players = []
    for _, row in rows.iterrows():
        players.append(
            {
                "steam_id": _string_value(row, "steamid"),
                "name": _string_value(row, "name", default=_string_value(row, "steamid")),
                "team": _string_value(row, "team", default="UNKNOWN"),
                "x": _float_value(row, "X"),
                "y": _float_value(row, "Y"),
                "z": _float_value(row, "Z"),
                "yaw": _float_value(row, "yaw"),
                "pitch": _float_value(row, "pitch"),
                "alive": _float_value(row, "health") > 0,
                "health": int(_float_value(row, "health")),
                "has_bomb": _bool_value(row, "has_bomb"),
            }
        )

    return {
        "tick": int(tick),
        "time_ms": _tick_to_time_ms(tick),
        "players": players,
        "grenades": [],
    }


def _sample_ticks(ticks_df: pd.DataFrame, step: int) -> pd.DataFrame:
    sampled_ticks = sorted(int(tick) for tick in ticks_df["tick"].drop_duplicates())
    selected = set(sampled_ticks[::step])
    return ticks_df[ticks_df["tick"].isin(selected)].sort_values(["tick", "steamid"])


def _chunk_tick_rows(ticks_df: pd.DataFrame, chunk_size: int) -> Iterable[list[dict[str, Any]]]:
    current: list[dict[str, Any]] = []
    for tick, rows in ticks_df.groupby("tick", sort=True):
        current.append(normalize_tick_group(int(tick), rows))
        if len(current) >= chunk_size:
            yield current
            current = []
    if current:
        yield current


def _redis_set(redis_client: Any, key: str, value: str, ttl_seconds: int) -> None:
    if hasattr(redis_client, "setex"):
        redis_client.setex(key, ttl_seconds, value)
        return
    redis_client.set(key, value, ex=ttl_seconds)


def _tick_to_time_ms(tick: int, tick_rate: int = 64) -> int:
    return int((tick / tick_rate) * 1000)


def _float_value(row: pd.Series, column: str, default: float = 0.0) -> float:
    value = row[column] if column in row else default
    if pd.isna(value):
        return default
    return float(value)


def _string_value(row: pd.Series, column: str, default: str = "") -> str:
    value = row[column] if column in row else default
    if pd.isna(value):
        return default
    return str(value)


def _bool_value(row: pd.Series, column: str, default: bool = False) -> bool:
    value = row[column] if column in row else default
    if pd.isna(value):
        return default
    return bool(value)


def log(event: str, **fields: object) -> None:
    """Emit structured JSON logs compatible with the analysis worker."""

    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)

