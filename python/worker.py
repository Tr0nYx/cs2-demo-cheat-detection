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
import pandas as pd

from features.aimbot import AimbotExtractor
from features.base import FeatureExtractionError, FeatureResult
from features.bhop import BhopExtractor
from features.recoil import RecoilExtractor
from features.session import SessionConsistencyExtractor
from features.triggerbot import TriggerbotExtractor
from features.wallhack import WallhackExtractor
from ml.augmentation import AugmentationPipeline
from ml.config import load_config
from parser.adapter import DemoParserAdapter
from parser.types import DemoParseError, ParsedDemo
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


def _normalize_steam_id(value: object) -> str:
    if pd.isna(value):
        return ""
    try:
        numeric = float(value)
        if numeric.is_integer():
            return str(int(numeric))
    except (TypeError, ValueError):
        pass

    return str(value)


def _string_series(series: pd.Series) -> pd.Series:
    return series.map(_normalize_steam_id)


def _event_mask_for_player(events_df: pd.DataFrame, steam_id: str) -> pd.Series:
    mask = pd.Series(False, index=events_df.index)
    event_type = events_df.get("event_type")

    if "attacker_steamid" in events_df.columns:
        mask |= (
            (event_type == "player_death")
            & (_string_series(events_df["attacker_steamid"]) == steam_id)
        )
    if "user_steamid" in events_df.columns:
        user_matches = _string_series(events_df["user_steamid"]) == steam_id
        mask |= (
            event_type.isin(["weapon_fire", "player_jump", "player_land"])
            & user_matches
        )
        # Opponent footsteps are needed for aimbot reaction proxy and wallhack timing.
        mask |= (event_type == "player_footstep") & ~user_matches

    mask |= event_type.isin(["round_start", "round_end"])

    return mask


def _slice_demo_for_player(parsed_demo: ParsedDemo, steam_id: str) -> ParsedDemo:
    ticks_df = parsed_demo.ticks_df[
        _string_series(parsed_demo.ticks_df["steamid"]) == steam_id
    ].copy()
    events_df = parsed_demo.events_df[
        _event_mask_for_player(parsed_demo.events_df, steam_id)
    ].copy()
    for column in ["user_steamid", "attacker_steamid", "victim_steamid"]:
        if column in events_df.columns:
            events_df[column] = _string_series(events_df[column])

    return ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name=parsed_demo.map_name)


def _player_steam_ids(parsed_demo: ParsedDemo) -> list[str]:
    if "steamid" not in parsed_demo.ticks_df.columns:
        return []

    steam_ids = sorted(
        steam_id
        for steam_id in _string_series(parsed_demo.ticks_df["steamid"]).unique().tolist()
        if steam_id and steam_id != "0"
    )

    return steam_ids


def _extraction_stage(
    player_demo: ParsedDemo, extractors: list
) -> Dict[str, Optional]:
    """Extract all features from player demo per D-12, D-13.

    Runs all traditional feature extractors (aimbot, wallhack, triggerbot,
    recoil, bhop, session) with per-feature error resilience.

    Args:
        player_demo: Parsed demo sliced for a single player.
        extractors: List of feature extractor instances.

    Returns:
        Dict mapping extractor class name to FeatureResult or None if extraction failed.
    """
    feature_results = {}
    for extractor in extractors:
        feature_name = extractor.__class__.__name__
        try:
            result = extractor.extract(player_demo)
            feature_results[feature_name] = result
        except FeatureExtractionError as e:
            log("feature_error", feature=feature_name, error=str(e), level="warning")
            feature_results[feature_name] = None
        except Exception as e:
            log("feature_error", feature=feature_name, error=str(e), level="warning")
            feature_results[feature_name] = None

    return feature_results


def _conversion_stage(feature_results: Dict[str, Optional]) -> Dict[str, Optional]:
    """Normalize and prepare features for analysis per D-12, D-13.

    Per D-12: conversion stage normalizes to tensor format. Extractors have
    already computed derivatives in Wave 1. This stage is a pass-through for
    now; future extensions can add statistical summaries.

    Args:
        feature_results: Dict from extraction stage.

    Returns:
        Same structure (pass-through for now).
    """
    # Wave 1 already computes derivatives in extractors.
    # Conversion stage is identity for now; Wave 3 can add tensor normalization.
    return feature_results


def _augmentation_stage(
    converted_results: Dict[str, Optional[FeatureResult]],
    is_training: bool = False
) -> Dict[str, Optional[FeatureResult]]:
    """Stage 3: Apply augmentation for training only (IDENTITY for production).

    Per D-05, D-06, D-07: Production uses authentic data only. Augmentation is
    training-only to address class imbalance and test model robustness per D-08 through D-11.

    Per Pitfall 2 mitigation: This function enforces production-only authenticity.
    CRITICAL: is_training=False MUST return unchanged results (no augmentation).

    Args:
        converted_results: Dict of FeatureResult from _conversion_stage
        is_training: If True, apply augmentation; if False, return unchanged (production)

    Returns:
        Same structure as input (augmented if is_training=True, else identity)
    """
    # CRITICAL: Production pipeline must NOT apply augmentation (Pitfall 2 mitigation)
    if not is_training:
        log("augmentation_stage", is_training=False, action="skipped", reason="production_pipeline")
        return converted_results

    # Training path only: apply augmentation per D-08 through D-11
    log("augmentation_stage", is_training=True, action="apply")

    cfg = load_config()
    augmentation = AugmentationPipeline(seed=cfg.AUGMENTATION_SEED)
    augmented = {}

    for name, result in converted_results.items():
        if result is None:
            augmented[name] = None
            continue

        try:
            # Augment raw_measurements only (not score or metadata)
            # Per D-08: SMOTE, noise, temporal shifts, feature scaling
            augmented_measurements = augmentation.augment_feature_measurements(
                result.raw_measurements.copy(),
                method="all"
            )

            # Preserve original score and metadata; augment only raw_measurements
            augmented[name] = FeatureResult(
                score=result.score,
                raw_measurements=augmented_measurements,
                metadata={
                    **result.metadata,
                    "augmentation_applied": True
                }
            )
        except Exception as e:
            # Fail-safe: if augmentation fails, return original result
            log(
                "augmentation_error",
                extractor=name,
                error=str(e),
                level="warning"
            )
            augmented[name] = result

    # Record augmentation metadata for reproducibility per D-10
    log(
        "augmentation_metadata",
        is_training=True,
        metadata=augmentation.augmentation_metadata()
    )

    return augmented


def _analysis_stage(
    augmented_results: Dict[str, Optional],
    parsed_demo: ParsedDemo,
    scorer: WeightedScorer,
) -> Optional:
    """Run transformer and compute final score per D-12, D-13, D-15, D-16.

    Per D-15: TransformerSequenceExtractor is an additional feature extractor.
    Per D-16: Transformer runs after traditional extractors and feeds into
    WeightedScorer as one feature input. Phase 20 gates remain baseline.

    Args:
        augmented_results: Dict from augmentation stage.
        parsed_demo: Parsed demo for transformer context windowing.
        scorer: WeightedScorer instance.

    Returns:
        ScoringSummary from scorer.score() or None if scoring failed.
    """
    # Add transformer as a feature input
    try:
        from features.transformer_sequence import TransformerSequenceExtractor

        transformer = TransformerSequenceExtractor()
        transformer_result = transformer.extract(parsed_demo)
        augmented_results["TransformerSequenceExtractor"] = transformer_result
        log("transformer_extraction_complete", score=transformer_result.score)
    except FeatureExtractionError as e:
        log("transformer_error", error=str(e), level="warning")
        # Continue without transformer if extraction fails
    except Exception as e:
        log("transformer_error", error=str(e), level="warning")

    # Score all features (transformer + traditional)
    valid_results = {
        k: v for k, v in augmented_results.items() if v is not None
    }

    if not valid_results:
        log("no_valid_features", level="warning")
        return None

    try:
        scoring_summary = scorer.score(valid_results)
        return scoring_summary
    except Exception as e:
        log("scoring_error", error=str(e), level="error")
        return None


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

    player_steam_ids = _player_steam_ids(parsed_demo)
    if not player_steam_ids:
        log("no_players_found", demo_id=demo_id, level="error")
        result_writer.write_error(demo_id, "No player Steam IDs found in parsed ticks")
        return

    results_written = 0
    try:
        result_writer.delete_demo_level_result(demo_id)

        for steam_id in player_steam_ids:
            player_demo = _slice_demo_for_player(parsed_demo, steam_id)
            if player_demo.ticks_df.empty:
                continue

            # Modular pipeline stages per D-12, D-13, D-15, D-16
            # Stage 1: Extract all traditional features
            feature_results = _extraction_stage(player_demo, extractors)
            log(
                "extraction_stage_complete",
                demo_id=demo_id,
                player_steam_id=steam_id,
                extracted_count=sum(1 for v in feature_results.values() if v is not None),
            )

            # Stage 2: Convert (normalize and prepare tensors)
            converted_results = _conversion_stage(feature_results)

            # Stage 3: Augment (identity for production, augmentation for training)
            augmented_results = _augmentation_stage(converted_results, is_training=False)

            # Stage 4: Analyze (transformer + scoring)
            scoring_summary = _analysis_stage(augmented_results, player_demo, scorer)

            if scoring_summary is None:
                log("player_scoring_failed", demo_id=demo_id, player_steam_id=steam_id, level="warning")
                continue

            # Extract the player's Steam profile name from the demo if available
            player_display_name = steam_id
            if "name" in player_demo.ticks_df.columns:
                non_empty_names = player_demo.ticks_df["name"].dropna().unique()
                non_empty_names = [n for n in non_empty_names if n and str(n).strip()]
                if non_empty_names:
                    player_display_name = str(non_empty_names[0])

            result_writer.write_result(
                demo_id,
                feature_results,
                scoring_summary,
                model_version,
                player_steam_id=steam_id,
                player_display_name=player_display_name,
                map_name=parsed_demo.map_name,
            )
            results_written += 1
            log("result_persisted", demo_id=demo_id, player_steam_id=steam_id, model_version=model_version)

        if results_written == 0:
            log("all_player_features_failed", demo_id=demo_id, level="error")
            result_writer.write_error(demo_id, "No per-player feature results could be scored")
    except Exception as e:
        log("persistence_error", demo_id=demo_id, error=str(e), level="error")
        raise
    finally:
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
