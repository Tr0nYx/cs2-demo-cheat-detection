from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Dict, Optional

import psycopg2
import redis

from features.aimbot import AimbotExtractor
from features.base import FeatureExtractionError
from features.bhop import BhopExtractor
from features.recoil import RecoilExtractor
from features.session import SessionConsistencyExtractor
from features.triggerbot import TriggerbotExtractor
from features.wallhack import WallhackExtractor
from parser.adapter import DemoParserAdapter
from parser.types import DemoParseError
from persistence.result_writer import ResultWriter
from scoring.weighted_scorer import WeightedScorer

shutdown_requested = False
in_flight_count = 0
in_flight_lock = __import__("threading").Lock()


def _get_model_version() -> str:
    try:
        commit_sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        if commit_sha:
            return f"v1.0.1-anticheatpt-{commit_sha}"
    except Exception:
        pass
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"v1.0.1-anticheatpt-{timestamp}"


def _handle_shutdown(signum: int, _frame: object) -> None:
    global shutdown_requested
    shutdown_requested = True
    log("shutdown_requested", signal=signum, in_flight_count=in_flight_count)


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


def process_job(
    demo_id: str,
    file_path: str,
    parser_adapter: DemoParserAdapter,
    extractors: list,
    scorer: WeightedScorer,
    result_writer: ResultWriter,
    model_version: str,
) -> None:
    """
    Process a single demo job: parse, extract features, score, persist results.

    Implements the full pipeline per D-27 through D-31:
    1. Parse demo file
    2. Extract all 6 features (with per-feature resilience)
    3. Compute weighted score
    4. Persist results to PostgreSQL
    5. Record model version for traceability

    Args:
        demo_id: UUID of the demo to analyze
        file_path: Path to the demo file
        parser_adapter: DemoParserAdapter instance
        extractors: List of feature extractor instances
        scorer: WeightedScorer instance
        result_writer: ResultWriter instance
        model_version: Semantic version or git SHA of the model

    Raises:
        DemoParseError: If parsing fails (all-or-nothing, per D-18)
        Exception: If persistence fails (worker exit, per D-21)
    """
    global in_flight_count
    with in_flight_lock:
        in_flight_count += 1

    log("job_processing", demo_id=demo_id, model_version=model_version)

    # Phase 1: Parse demo (D-18: all-or-nothing)
    try:
        parsed_demo = parser_adapter.parse_demo(file_path)
        log("demo_parsed", demo_id=demo_id, tick_count=len(parsed_demo.ticks_df))
    except DemoParseError as e:
        log("parser_error", demo_id=demo_id, error=str(e), level="error")
        result_writer.write_error(demo_id, f"Parse error: {e}")
        return

    # Phase 2: Extract features (D-19: per-feature resilience)
    feature_results = {}
    for extractor in extractors:
        feature_name = extractor.__class__.__name__
        try:
            result = extractor.extract(parsed_demo)
            feature_results[feature_name] = result
            log(
                "feature_extracted",
                demo_id=demo_id,
                feature=feature_name,
                score=result.score,
            )
        except FeatureExtractionError as e:
            log(
                "feature_error",
                demo_id=demo_id,
                feature=feature_name,
                error=str(e),
                level="warning",
            )
            feature_results[feature_name] = None
        except Exception as e:
            log(
                "feature_error",
                demo_id=demo_id,
                feature=feature_name,
                error=str(e),
                level="warning",
            )
            feature_results[feature_name] = None

    # Collect valid results (exclude None)
    valid_results = {
        k: v for k, v in feature_results.items() if v is not None
    }

    # D-20: If all features failed, mark as error
    if not valid_results:
        log("all_features_failed", demo_id=demo_id, level="error")
        result_writer.write_error(demo_id, "All feature extractors failed")
        return

    # Phase 3: Score (D-27 through D-31) with retry backoff
    max_retries = 3
    backoff_times = [1, 2, 4]
    scoring_summary = None

    for attempt in range(max_retries):
        try:
            scoring_summary = scorer.score(valid_results)
            log(
                "scoring_complete",
                demo_id=demo_id,
                overall_score=scoring_summary.overall_score,
                label=scoring_summary.label,
                attempt=attempt + 1,
            )
            break
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = backoff_times[attempt]
                log(
                    "scoring_retry",
                    demo_id=demo_id,
                    attempt=attempt + 1,
                    wait_seconds=wait_time,
                    error=str(e),
                )
                time.sleep(wait_time)
            else:
                log("scoring_error", demo_id=demo_id, error=str(e), level="error")
                result_writer.write_error(demo_id, f"Scoring failed after {max_retries} retries: {e}")
                return

    # Phase 4: Persist results (D-14 through D-17)
    try:
        result_writer.write_result(demo_id, feature_results, scoring_summary, model_version)
        log("result_persisted", demo_id=demo_id, model_version=model_version)
    except Exception as e:
        log("persistence_error", demo_id=demo_id, error=str(e), level="error")
        # D-21: Worker exits on persistence errors
        raise
    finally:
        global in_flight_count
        with in_flight_lock:
            in_flight_count -= 1


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

    # Get model version for traceability
    model_version = _get_model_version()
    log("model_version_captured", model_version=model_version)

    # Initialize pipeline components
    parser_adapter = DemoParserAdapter()
    extractors = [
        AimbotExtractor(),
        TriggerbotExtractor(),
        WallhackExtractor(),
        RecoilExtractor(),
        BhopExtractor(),
        SessionConsistencyExtractor(),
    ]
    scorer = WeightedScorer()
    log("pipeline_initialized", extractors_count=len(extractors), model_version=model_version)

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

                # Process the job using full pipeline
                try:
                    process_job(
                        demo_id,
                        file_path,
                        parser_adapter,
                        extractors,
                        scorer,
                        result_writer,
                        model_version,
                    )

                except Exception as e:
                    log("job_error", demo_id=demo_id, error=str(e), level="error")
                    # Attempt to write error; if it fails, exit
                    try:
                        result_writer.write_error(demo_id, str(e))
                    except Exception as write_error:
                        log(
                            "worker_error",
                            error=f"Failed to write error for {demo_id}: {write_error}",
                        )
                        return 1

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
        # Graceful shutdown: wait for in-flight analyses to complete
        grace_period = shutdown_grace_sec
        elapsed = 0
        while in_flight_count > 0 and elapsed < grace_period:
            log(
                "graceful_shutdown",
                in_flight_count=in_flight_count,
                grace_remaining=grace_period - elapsed,
            )
            time.sleep(1)
            elapsed += 1

        if in_flight_count > 0:
            log(
                "shutdown_timeout",
                in_flight_count=in_flight_count,
                level="warning",
            )
        else:
            log("all_in_flight_analyses_completed")

        log("worker_exit", reason="shutdown_requested", in_flight_count=in_flight_count)
        if db_conn:
            db_conn.close()
        if r:
            r.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
