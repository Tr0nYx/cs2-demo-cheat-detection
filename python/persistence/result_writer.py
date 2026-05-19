"""
PostgreSQL persistence layer for analysis results and errors.

Handles writing feature extraction results and parser/feature failures to the database
with parameterized queries to prevent SQL injection.

Also integrates TRACE rating system (Wave 2):
- Loads active calibration via CalibrationManager
- Calls TraceCalculator to compute TRACE scores
- Persists TRACE results to trace_rating table
- Checks recalibration trigger (100-sample threshold)
"""

from __future__ import annotations

import json
import math
import sys
from typing import Any, Optional, TYPE_CHECKING

import psycopg2
import psycopg2.extras

if TYPE_CHECKING:
    from features.base import FeatureResult
    from python.scoring.trace_rating import TraceComponents


import numpy as np

def sanitize_for_json(obj: Any) -> Any:
    """Recursively replace NaN/Inf float values with None for JSON safety.

    PostgreSQL's JSON type rejects the literal token ``NaN``, so any floating-
    point not-a-number or infinity value produced by NumPy operations (e.g.
    division by zero in correlation matrices) must be mapped to JSON ``null``
    before serialisation.
    """
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, np.floating):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return [sanitize_for_json(x) for x in obj.tolist()]
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    return obj


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle NumPy data types and NaN/Inf values."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            v = float(obj)
            return None if (math.isnan(v) or math.isinf(v)) else v
        if isinstance(obj, np.ndarray):
            return sanitize_for_json(obj.tolist())
        return super().default(obj)

    def encode(self, obj: Any) -> str:
        # Pre-sanitize the whole structure so bare Python float('nan') values
        # are also replaced before the standard encoder touches them.
        return super().encode(sanitize_for_json(obj))

class ResultWriter:
    """
    Writes analysis results and errors to PostgreSQL.

    All database operations use parameterized queries (cursor.execute with %s)
    to prevent SQL injection. Errors are logged to stdout and re-raised.
    """

    def __init__(self, db_conn: psycopg2.extensions.connection) -> None:
        """
        Initialize the result writer.

        Args:
            db_conn: psycopg2 database connection (open, ready to use)
        """
        self.db_conn = db_conn

    def write_error(self, demo_id: str, error_message: str) -> None:
        """
        Record a parser or extraction error for a demo.

        Updates the Demo record with:
        - error_message = error_message
        - status = 'error'

        Args:
            demo_id: UUID of the demo that failed
            error_message: Error description (will be stored in error_message field)

        Raises:
            psycopg2.Error: If database write fails (logged with context before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Use parameterized query to prevent SQL injection
            update_query = """
                UPDATE demo
                SET error_message = %s, status = %s
                WHERE id = %s
            """
            cursor.execute(update_query, (error_message, 'error', demo_id))
            self.db_conn.commit()

            # Log success
            log_payload = {
                "event": "error_recorded",
                "demo_id": demo_id,
                "error": error_message,
            }
            print(json.dumps(log_payload, separators=(",", ":")), file=sys.stdout, flush=True)

        except psycopg2.Error as e:
            self.db_conn.rollback()
            log_error = {
                "event": "error_write_failed",
                "demo_id": demo_id,
                "error": str(e),
            }
            print(json.dumps(log_error, separators=(",", ":")), file=sys.stdout, flush=True)
            raise
        finally:
            if cursor is not None:
                cursor.close()

    def delete_demo_level_result(self, demo_id: str) -> None:
        """Remove the legacy demo-wide dummy player result for a demo."""
        cursor = None
        try:
            cursor = self.db_conn.cursor()
            cursor.execute(
                """
                DELETE FROM analysis_result
                WHERE demo_id = %s
                  AND player_id = '00000000-0000-0000-0000-000000000000'
                """,
                (demo_id,),
            )
            self.db_conn.commit()
        except psycopg2.Error:
            self.db_conn.rollback()
            raise
        finally:
            if cursor is not None:
                cursor.close()

    def _find_or_create_player(
        self,
        cursor: psycopg2.extensions.cursor,
        steam_id: str,
        display_name: Optional[str],
    ) -> str:
        cursor.execute("SELECT id, display_name FROM player WHERE steam_id = %s", (steam_id,))
        row = cursor.fetchone()
        if row:
            player_id, current_display_name = row
            if display_name and display_name != steam_id and (current_display_name is None or current_display_name == steam_id):
                cursor.execute(
                    "UPDATE player SET display_name = %s WHERE id = %s",
                    (display_name, player_id),
                )
            return str(player_id)

        import uuid

        player_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO player (id, steam_id, display_name) VALUES (%s, %s, %s)",
            (player_id, steam_id, display_name or steam_id),
        )

        return player_id

    def write_result(
        self,
        demo_id: str,
        feature_results: dict[str, Optional[FeatureResult]],
        scoring_summary: Any,
        model_version: Optional[str] = None,
        trace_components: Optional[TraceComponents] = None,
        player_id: Optional[str] = None,
        player_steam_id: Optional[str] = None,
        player_display_name: Optional[str] = None,
        round_count: Optional[int] = None,
        raw_trace_values: Optional[dict[str, Any]] = None,
        map_name: Optional[str] = None,
    ) -> None:
        """
        Record a successful analysis result with optional TRACE rating.

        Creates an AnalysisResult record with:
        - demo_id (FK to Demo)
        - Normalized feature scores: aimbotScore, triggerBotScore, wallhackScore, recoilScore, bhopScore, sessionScore
        - overallSuspicion and suspicionLabel from the scoring_summary
        - featureData JSON containing raw measurements (per D-14, D-15, D-16)
        - model_version: semantic version or git SHA of the model used for analysis

        If trace_components is provided, also:
        - Calculates TRACE rating using TraceCalculator with active calibration
        - Persists TRACE result to trace_rating table
        - Checks if recalibration should be triggered (100-sample threshold)
        - Stores new calibration if threshold met

        Also updates Demo status to 'done'.

        Args:
            demo_id: UUID of the analyzed demo
            feature_results: Dict mapping feature extractor names to their FeatureResult objects
                           (or None if extraction failed). e.g., {"AimbotExtractor": FeatureResult(...), ...}
            scoring_summary: ScoringSummary object with overall_score (float 0.0-1.0) and label (str)
            model_version: Optional semantic version or git SHA of the model
            trace_components: Optional TraceComponents from component extraction (eKILL, AIM, KAST, UTIL, CLUTCH)
            player_id: Optional player identifier (required if trace_components provided)
            player_steam_id: Optional Steam ID; when provided, the player row is found or created
            round_count: Optional number of rounds in demo (required if trace_components provided)
            raw_trace_values: Optional dict with raw component values for debugging

        Raises:
            psycopg2.Error: If database write fails (logged with context before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Extract normalized feature scores (default to None if missing)
            # Map extractor class names to feature score columns
            aimbot_score = (
                feature_results.get("AimbotExtractor").score
                if feature_results.get("AimbotExtractor")
                else None
            )
            trigger_score = (
                feature_results.get("TriggerbotExtractor").score
                if feature_results.get("TriggerbotExtractor")
                else None
            )
            wallhack_score = (
                feature_results.get("WallhackExtractor").score
                if feature_results.get("WallhackExtractor")
                else None
            )
            recoil_score = (
                feature_results.get("RecoilExtractor").score
                if feature_results.get("RecoilExtractor")
                else None
            )
            bhop_score = (
                feature_results.get("BhopExtractor").score
                if feature_results.get("BhopExtractor")
                else None
            )
            session_score = (
                feature_results.get("SessionConsistencyExtractor").score
                if feature_results.get("SessionConsistencyExtractor")
                else None
            )

            # Prepare featureData JSON with raw measurements from all features (D-14, D-15)
            feature_data = {}
            for feature_name, feature_result in feature_results.items():
                if feature_result is None:
                    # Record failed feature extraction (D-17)
                    feature_data[feature_name] = {
                        "error": "feature_extraction_failed",
                        "score": None,
                    }
                else:
                    # Record successful extraction with raw measurements
                    feature_data[feature_name] = {
                        "score": feature_result.score,
                        "raw_measurements": feature_result.raw_measurements,
                        "metadata": feature_result.metadata,
                    }

            # Convert featureData to JSON string
            try:
                feature_data_json = json.dumps(feature_data, cls=NumpyEncoder)
            except (TypeError, ValueError) as e:
                log_error = {
                    "event": "feature_data_serialization_error",
                    "demo_id": demo_id,
                    "error": str(e),
                }
                print(
                    json.dumps(log_error, separators=(",", ":")),
                    file=sys.stdout,
                    flush=True,
                )
                raise

            import uuid

            if player_steam_id:
                player_id = self._find_or_create_player(cursor, player_steam_id, player_display_name)

            # Create a dummy player for demo-level results if player identity is missing
            if not player_id:
                player_id = "00000000-0000-0000-0000-000000000000"
                cursor.execute("SELECT id FROM player WHERE id = %s", (player_id,))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO player (id, steam_id, display_name) VALUES (%s, %s, %s)", (player_id, "0", "Demo Level Result"))

            result_id = str(uuid.uuid4())

            # Upsert AnalysisResult record (handles re-processing without duplicate key errors)
            insert_query = """
                INSERT INTO analysis_result
                (id, demo_id, player_id, round_count, aimbot_score, triggerbot_score, wallhack_score, recoil_score, bhop_score, session_consistency_score, overall_suspicion, suspicion_label, feature_data, support_data, analyzed_at, model_version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
                ON CONFLICT (demo_id, player_id) DO UPDATE SET
                    round_count = EXCLUDED.round_count,
                    aimbot_score = EXCLUDED.aimbot_score,
                    triggerbot_score = EXCLUDED.triggerbot_score,
                    wallhack_score = EXCLUDED.wallhack_score,
                    recoil_score = EXCLUDED.recoil_score,
                    bhop_score = EXCLUDED.bhop_score,
                    session_consistency_score = EXCLUDED.session_consistency_score,
                    overall_suspicion = EXCLUDED.overall_suspicion,
                    suspicion_label = EXCLUDED.suspicion_label,
                    feature_data = EXCLUDED.feature_data,
                    support_data = EXCLUDED.support_data,
                    analyzed_at = NOW(),
                    model_version = EXCLUDED.model_version
            """

            overall_score = (
                getattr(scoring_summary, "overall_score", 0.5)
                if scoring_summary
                else 0.5
            )
            label = (
                getattr(scoring_summary, "label", "suspicious")
                if scoring_summary
                else "suspicious"
            )

            def _safe_float(value: object) -> float:
                """Convert a score to float, defaulting to 0.0 if None or invalid."""
                try:
                    return float(value)  # type: ignore[arg-type]
                except (TypeError, ValueError):
                    return 0.0

            cursor.execute(
                insert_query,
                (
                    result_id,
                    demo_id,
                    player_id,
                    round_count or 0,
                    _safe_float(aimbot_score),
                    _safe_float(trigger_score),
                    _safe_float(wallhack_score),
                    _safe_float(recoil_score),
                    _safe_float(bhop_score),
                    _safe_float(session_score),
                    _safe_float(overall_score),
                    label,
                    feature_data_json,
                    '{}',
                    model_version,
                ),
            )

            # Update Demo status to 'done' and save map name if parsed
            if map_name:
                update_demo_query = """
                    UPDATE demo
                    SET status = %s, map = %s
                    WHERE id = %s
                """
                cursor.execute(update_demo_query, ("done", map_name, demo_id))
            else:
                update_demo_query = """
                    UPDATE demo
                    SET status = %s
                    WHERE id = %s
                """
                cursor.execute(update_demo_query, ("done", demo_id))

            # Fetch the analysis_result_id for TRACE linking
            analysis_result_id_query = "SELECT id FROM analysis_result WHERE demo_id = %s ORDER BY id DESC LIMIT 1"
            cursor.execute(analysis_result_id_query, (demo_id,))
            analysis_result_row = cursor.fetchone()
            analysis_result_id = analysis_result_row[0] if analysis_result_row else None

            # Persist TRACE rating if components provided
            if trace_components is not None and analysis_result_id is not None and player_id is not None:
                try:
                    # Import here to avoid circular imports
                    from python.scoring.trace_rating import TraceCalculator
                    from python.scoring.trace_calibration import CalibrationManager

                    # Initialize CalibrationManager and load active calibration
                    calibration_manager = CalibrationManager(self.db_conn)
                    calibration = calibration_manager.get_active_calibration()

                    # Calculate TRACE using TraceCalculator
                    calculator = TraceCalculator()
                    trace_result = calculator.calculate(
                        trace_components,
                        suspicion_score=overall_score,
                        calibration=calibration,
                    )

                    # Prepare raw values with defaults
                    raw = raw_trace_values or {}
                    ekill_raw = raw.get("ekill_raw", 0.0)
                    aim_cpq = raw.get("aim_cpq", 0.0)
                    aim_csq = raw.get("aim_csq", 0.0)
                    aim_ttd = raw.get("aim_ttd", 0.0)
                    aim_scs = raw.get("aim_scs", 0.0)
                    kast_percentage = raw.get("kast_percentage", 0.0)
                    clutch_attempts = raw.get("clutch_attempts", 0)
                    clutch_wins = raw.get("clutch_wins", 0)
                    rc = round_count if round_count is not None else 0

                    # Insert TRACE result into trace_rating table
                    trace_insert_query = """
                        INSERT INTO trace_rating
                        (analysis_result_id, player_id, demo_id, calibration_version,
                         trace_base, trace_adjusted, trace_normalized, trust_multiplier,
                         round_count, ekill, aim, kast, util, clutch,
                         ekill_raw, aim_cpq, aim_csq, aim_ttd, aim_scs,
                         kast_percentage, clutch_attempts, clutch_wins, calculated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, NOW())
                    """

                    cursor.execute(
                        trace_insert_query,
                        (
                            analysis_result_id,
                            player_id,
                            demo_id,
                            calibration["version"],
                            trace_result.trace_base,
                            trace_result.trace_adjusted,
                            trace_result.trace_normalized,
                            trace_result.trust_multiplier,
                            rc,
                            trace_result.components.ekill,
                            trace_result.components.aim,
                            trace_result.components.kast,
                            trace_result.components.util,
                            trace_result.components.clutch,
                            ekill_raw,
                            aim_cpq,
                            aim_csq,
                            aim_ttd,
                            aim_scs,
                            kast_percentage,
                            clutch_attempts,
                            clutch_wins,
                        ),
                    )

                    # Log TRACE persistence
                    trace_log = {
                        "event": "trace_persisted",
                        "demo_id": demo_id,
                        "player_id": player_id,
                        "trace_base": trace_result.trace_base,
                        "trace_adjusted": trace_result.trace_adjusted,
                        "trust_multiplier": trace_result.trust_multiplier,
                        "calibration_version": calibration["version"],
                    }
                    print(
                        json.dumps(trace_log, separators=(",", ":")),
                        file=sys.stdout,
                        flush=True,
                    )

                    # Check if recalibration should be triggered
                    if calibration_manager.should_recalibrate():
                        new_calibration = calibration_manager.calculate_calibration()
                        new_version = calibration_manager.store_calibration(new_calibration)
                        log_recal = {
                            "event": "calibration_recalibrated",
                            "new_version": new_version,
                            "sample_size": new_calibration["sample_size"],
                        }
                        print(
                            json.dumps(log_recal, separators=(",", ":")),
                            file=sys.stdout,
                            flush=True,
                        )

                except Exception as e:
                    # TRACE is optional enrichment; log but don't fail analysis
                    trace_error = {
                        "event": "trace_persistence_failed",
                        "demo_id": demo_id,
                        "error": str(e),
                    }
                    print(
                        json.dumps(trace_error, separators=(",", ":")),
                        file=sys.stdout,
                        flush=True,
                    )

            self.db_conn.commit()

            # Log success
            log_payload = {
                "event": "result_persisted",
                "demo_id": demo_id,
                "overall_suspicion": overall_score,
                "label": label,
            }
            print(
                json.dumps(log_payload, separators=(",", ":")),
                file=sys.stdout,
                flush=True,
            )

        except psycopg2.Error as e:
            self.db_conn.rollback()
            log_error = {
                "event": "result_write_failed",
                "demo_id": demo_id,
                "error": str(e),
            }
            print(
                json.dumps(log_error, separators=(",", ":")),
                file=sys.stdout,
                flush=True,
            )
            raise
        finally:
            if cursor is not None:
                cursor.close()
