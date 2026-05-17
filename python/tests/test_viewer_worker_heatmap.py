from __future__ import annotations

import base64

import pytest

from viewer import heatmap_job
from viewer.heatmap_job import (
    HEATMAP_TTL_SECONDS,
    handle_heatmap_job,
    heatmap_cache_key,
    heatmap_file_path,
    validate_heatmap_payload,
)
from viewer.worker_viewer import process_viewer_job


PNG_BYTES = b"\x89PNG\r\n\x1a\nrendered"


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, tuple[int, bytes]] = {}

    def setex(self, key: str, ttl: int, value: bytes) -> bool:
        self.values[key] = (ttl, value)
        return True


def test_validate_heatmap_payload_rejects_invalid_round_range() -> None:
    with pytest.raises(ValueError, match="round_from"):
        validate_heatmap_payload(
            {
                "demo_id": "demo-1",
                "heatmap_type": "kills",
                "round_from": 5,
                "round_to": 2,
            }
        )


def test_handle_heatmap_job_stores_png_in_redis_and_file(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    redis_client = FakeRedis()

    def fake_render(events, map_name, heatmap_type, radar_path):
        assert events == [{"x": 1.0, "y": 2.0, "value": 1.0}]
        assert map_name == "de_dust2"
        assert heatmap_type.value == "kills"
        return PNG_BYTES

    monkeypatch.setattr(heatmap_job, "render_heatmap", fake_render)

    result = handle_heatmap_job(
        {
            "type": "generate_heatmap",
            "demo_id": "demo-1",
            "heatmap_type": "kills",
            "round_from": 1,
            "round_to": 3,
            "map_name": "de_dust2",
            "events": [{"x": 1.0, "y": 2.0, "value": 1.0}],
        },
        redis_client=redis_client,
        storage_root=tmp_path,
        radar_path=tmp_path,
    )

    expected_key = heatmap_cache_key("demo-1", None, "kills", 1, 3)
    assert result["cache_key"] == expected_key
    assert redis_client.values[expected_key][0] == HEATMAP_TTL_SECONDS
    assert base64.b64decode(redis_client.values[expected_key][1]) == PNG_BYTES
    assert heatmap_file_path(tmp_path, "demo-1", None, "kills", 1, 3).read_bytes() == PNG_BYTES


def test_process_viewer_job_dispatches_heatmap(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    redis_client = FakeRedis()
    called: dict[str, object] = {}

    def fake_handler(payload, redis_client=None):
        called["payload"] = payload
        called["redis_client"] = redis_client
        return {"status": "ok"}

    monkeypatch.setattr("viewer.worker_viewer.handle_heatmap_job", fake_handler)

    result = process_viewer_job(
        {
            "type": "generate_heatmap",
            "demo_id": "demo-1",
            "heatmap_type": "grenades",
        },
        redis_client=redis_client,
    )

    assert result == {"status": "ok"}
    assert called["redis_client"] is redis_client


def test_process_viewer_job_rejects_unknown_type() -> None:
    with pytest.raises(ValueError, match="unsupported viewer job type"):
        process_viewer_job({"type": "unknown"})
