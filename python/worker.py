from __future__ import annotations

import json
import os
import signal
import sys
import time
from datetime import datetime, timezone


shutdown_requested = False


def _handle_shutdown(signum: int, _frame: object) -> None:
    global shutdown_requested
    shutdown_requested = True
    log("shutdown_requested", signal=signum)


def log(event: str, **fields: object) -> None:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def main() -> int:
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    queue_name = os.getenv("PYTHON_WORKER_QUEUE", "cs2.analysis")
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    storage_path = os.getenv("DEMO_STORAGE_PATH", "/storage/demos")
    idle_on_start = env_bool("WORKER_IDLE_ON_START", False)

    log(
        "worker_startup",
        queue=queue_name,
        redis_configured=bool(redis_url),
        demo_storage_path=storage_path,
        mode="phase_1_smoke",
    )

    if not idle_on_start:
        log("worker_exit", reason="idle_disabled")
        return 0

    while not shutdown_requested:
        time.sleep(1)

    log("worker_exit", reason="shutdown")
    return 0


if __name__ == "__main__":
    sys.exit(main())
