"""
PostgreSQL persistence layer for analysis results and errors.

Handles writing feature extraction results and parser/feature failures to the database
with parameterized queries to prevent SQL injection.
"""

from __future__ import annotations

import json
import sys
from typing import Any, Optional, TYPE_CHECKING

import psycopg2
import psycopg2.extras

if TYPE_CHECKING:
    from features.base import FeatureResult


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

    def write_result(
        self,
        demo_id: str,
        feature_results: dict[str, Optional[FeatureResult]],
        scoring_summary: Any,
        model_version: Optional[str] = None,
    ) -> None:
        """
        Record a successful analysis result.

        Creates an AnalysisResult record with:
        - demo_id (FK to Demo)
        - Normalized feature scores: aimbotScore, triggerBotScore, wallhackScore, recoilScore, bhopScore, sessionScore
        - overallSuspicion and suspicionLabel from the scoring_summary
        - featureData JSON containing raw measurements (per D-14, D-15, D-16)
        - model_version: semantic version or git SHA of the model used for analysis

        Also updates Demo status to 'done'.

        Args:
            demo_id: UUID of the analyzed demo
            feature_results: Dict mapping feature extractor names to their FeatureResult objects
                           (or None if extraction failed). e.g., {"AimbotExtractor": FeatureResult(...), ...}
            scoring_summary: ScoringSummary object with overall_score (float 0.0-1.0) and label (str)
            model_version: Optional semantic version or git SHA of the model

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
                feature_data_json = json.dumps(feature_data)
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

            # Insert AnalysisResult record
            insert_query = """
                INSERT INTO analysis_result
                (demo_id, aimbot_score, trigger_bot_score, wallhack_score, recoil_score, bhop_score, session_score, overall_suspicion, suspicion_label, feature_data, model_version)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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

            cursor.execute(
                insert_query,
                (
                    demo_id,
                    aimbot_score,
                    trigger_score,
                    wallhack_score,
                    recoil_score,
                    bhop_score,
                    session_score,
                    overall_score,
                    label,
                    feature_data_json,
                    model_version,
                ),
            )

            # Update Demo status to 'done'
            update_demo_query = """
                UPDATE demo
                SET status = %s
                WHERE id = %s
            """
            cursor.execute(update_demo_query, ("done", demo_id))

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
