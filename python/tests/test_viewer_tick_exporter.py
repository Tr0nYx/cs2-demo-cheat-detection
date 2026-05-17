from __future__ import annotations

import pandas as pd

from parser.types import ParsedDemo
from viewer import tick_exporter


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, tuple[int, str]] = {}

    def setex(self, key: str, ttl: int, value: str) -> None:
        self.values[key] = (ttl, value)


class FakeParser:
    def parse_demo(self, _demo_path: str) -> ParsedDemo:
        rows = []
        for tick in range(1, 7):
            for steamid in ("111", "222"):
                rows.append(
                    {
                        "tick": tick,
                        "steamid": steamid,
                        "name": f"Player {steamid}",
                        "team": "CT" if steamid == "111" else "T",
                        "X": float(tick),
                        "Y": float(-tick),
                        "Z": 64.0,
                        "pitch": 1.0,
                        "yaw": 90.0,
                        "health": 100,
                        "has_bomb": steamid == "222",
                    }
                )
        return ParsedDemo(pd.DataFrame(rows), pd.DataFrame())


def test_export_ticks_to_cache_chunks_samples_and_compresses(monkeypatch) -> None:
    fake_redis = FakeRedis()
    monkeypatch.setattr(tick_exporter, "DemoParserAdapter", FakeParser)

    exported = tick_exporter.export_ticks_to_cache(
        "demo.dem",
        "demo-1",
        fake_redis,
        chunk_size=2,
        step=2,
    )

    assert exported == 3
    assert sorted(fake_redis.values.keys()) == [
        "demo_ticks:demo-1:1:3:2",
        "demo_ticks:demo-1:5:5:2",
    ]

    ttl, encoded = fake_redis.values["demo_ticks:demo-1:1:3:2"]
    payload = tick_exporter.decode_payload(encoded)
    assert ttl == tick_exporter.TICK_CACHE_TTL_SECONDS
    assert payload["step"] == 2
    assert [tick["tick"] for tick in payload["ticks"]] == [1, 3]
    assert payload["ticks"][0]["players"][0]["steam_id"] == "111"


def test_export_ticks_validates_positive_options() -> None:
    fake_redis = FakeRedis()

    try:
        tick_exporter.export_ticks_to_cache("demo.dem", "demo-1", fake_redis, chunk_size=0)
    except ValueError as exc:
        assert "chunk_size" in str(exc)
    else:
        raise AssertionError("Expected chunk_size validation error")

