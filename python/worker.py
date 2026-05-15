from __future__ import annotations

import json
import os
import signal
import sys
import time
from datetime import datetime, timezone

import psycopg2
import redis

from persistence.result_writer import ResultWriter

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


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def process_job(demo_id: str, file_path: str) -> None:
    """
    Process a single demo job.

    Placeholder for now - validates inputs and logs job processing.
    Future tasks (03-02 through 03-05) will implement actual parsing and feature extraction.

    Args:
        demo_id: UUID of the demo to analyze
        file_path: Path to the demo file

    Raises:
        ValueError: If file_path is empty or file does not exist
    """
    if not file_path:
        raise ValueError("file_path required")

    # Per D-05: Check if file exists before processing
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Demo file not found: {file_path}")

    log("job_processing", demo_id=demo_id, file_path=file_path)


def main() -> int:
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    # Environment variables
    queue_name = os.getenv("PYTHON_WORKER_QUEUE", "cs2.analysis")
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    database_url = os.getenv("DATABASE_URL")
    storage_path = os.getenv("DEMO_STORAGE_PATH", "/storage/demos")
    poll_timeout_sec = env_int("WORKER_POLL_TIMEOUT_SECONDS", 5)
    shutdown_grace_sec = env_int("WORKER_SHUTDOWN_GRACE_SECONDS", 15)
    idle_on_start = env_bool("WORKER_IDLE_ON_START", False)

    log(
        "worker_startup",
        queue=queue_name,
        redis_configured=bool(redis_url),
        database_configured=bool(database_url),
        demo_storage_path=storage_path,
        poll_timeout=poll_timeout_sec,
    )

    # Early exit if idle mode
    if idle_on_start:
        log("worker_exit", reason="idle_on_start")
        return 0

    # Initialize Redis and PostgreSQL connections
    try:
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
        db_conn = psycopg2.connect(database_url)
        result_writer = ResultWriter(db_conn)
        log("worker_ready", queue=queue_name)
    except Exception as e:
        log("startup_error", reason="connection_failed", error=str(e))
        return 2

    # Main job processing loop
    try:
        while not shutdown_requested:
            try:
                # BRPOP blocks until a job arrives or timeout occurs
                job = r.brpop(queue_name, timeout=poll_timeout_sec)

                # Timeout - continue to check shutdown flag
                if job is None:
                    continue

                # Extract job data from queue response (returns (key, value))
                _, job_json = job
                job_data = json.loads(job_json)

                demo_id = job_data.get("demo_id")
                file_path = job_data.get("file_path")

                # Log job receipt
                log("job_received", demo_id=demo_id)

                # Process the job
                try:
                    process_job(demo_id, file_path)
                    log("result_persisted", demo_id=demo_id)

                except (FileNotFoundError, ValueError) as e:
                    log("parser_error", demo_id=demo_id, error=str(e))
                    result_writer.write_error(demo_id, str(e))

                except Exception as e:
                    log("feature_error", demo_id=demo_id, error=str(e))
                    result_writer.write_error(demo_id, str(e))

            except redis.ConnectionError as e:
                log("worker_error", error=f"Redis connection lost: {str(e)}")
                return 1
            except json.JSONDecodeError as e:
                log("worker_error", error=f"Invalid job JSON: {str(e)}")
                # Continue processing - bad message is logged and skipped
                continue
            except Exception as e:
                log("worker_error", error=f"Unexpected error: {str(e)}")
                return 1

    finally:
        log("worker_exit", reason="shutdown_requested")
        if db_conn:
            db_conn.close()
        if r:
            r.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
