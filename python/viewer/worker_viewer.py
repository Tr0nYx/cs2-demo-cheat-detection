"""Redis worker for asynchronous CS2 demo viewer jobs."""

from __future__ import annotations

import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any

import redis

from .heatmap_job import handle_heatmap_job

shutdown_requested = False
in_flight_count = 0


def log(event: str, **fields: Any) -> None:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True), flush=True)


def handle_shutdown(signum: int, _frame: object) -> None:
    global shutdown_requested
    shutdown_requested = True
    log("viewer_shutdown_requested", signal=signum, in_flight_count=in_flight_count)


def process_viewer_job(payload: dict[str, Any], *, redis_client: redis.Redis | None = None) -> dict[str, Any] | None:
    """Process one viewer queue payload."""

    job_type = payload.get("type")
    if job_type == "generate_heatmap":
        return handle_heatmap_job(payload, redis_client=redis_client)
    if job_type == "export_ticks":
        log("viewer_export_ticks_requested", demo_id=payload.get("demo_id"))
        return {"status": "accepted", "type": "export_ticks", "demo_id": payload.get("demo_id")}

    raise ValueError(f"unsupported viewer job type: {job_type}")


def main() -> int:
    global in_flight_count

    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    queue_name = os.getenv("PYTHON_VIEWER_QUEUE", "cs2.viewer")
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    poll_timeout = int(os.getenv("VIEWER_WORKER_POLL_TIMEOUT_SECONDS", "5"))
    shutdown_grace = int(os.getenv("VIEWER_WORKER_SHUTDOWN_GRACE_SECONDS", "15"))

    log("viewer_worker_startup", queue=queue_name, redis_configured=bool(redis_url))

    try:
        redis_client = redis.from_url(redis_url, decode_responses=False)
        redis_client.ping()
    except Exception as exc:
        log("viewer_startup_error", error=str(exc), level="error")
        return 2

    log("viewer_worker_ready", queue=queue_name)

    try:
        while not shutdown_requested:
            try:
                queued = redis_client.brpop(queue_name, timeout=poll_timeout)
                if queued is None:
                    continue

                _, raw_payload = queued
                if isinstance(raw_payload, bytes):
                    raw_payload = raw_payload.decode("utf-8")
                payload = json.loads(raw_payload)

                in_flight_count += 1
                log("viewer_job_received", type=payload.get("type"), demo_id=payload.get("demo_id"))
                result = process_viewer_job(payload, redis_client=redis_client)
                log("viewer_job_completed", type=payload.get("type"), demo_id=payload.get("demo_id"), result=result)
            except json.JSONDecodeError as exc:
                log("viewer_job_invalid_json", error=str(exc), level="warning")
            except Exception as exc:
                log("viewer_job_error", error=str(exc), level="error")
            finally:
                if in_flight_count > 0:
                    in_flight_count -= 1
    finally:
        elapsed = 0
        while in_flight_count > 0 and elapsed < shutdown_grace:
            log("viewer_graceful_shutdown", in_flight_count=in_flight_count, grace_remaining=shutdown_grace - elapsed)
            time.sleep(1)
            elapsed += 1

        redis_client.close()
        log("viewer_worker_exit", reason="shutdown_requested", in_flight_count=in_flight_count)

    return 0


if __name__ == "__main__":
    sys.exit(main())
