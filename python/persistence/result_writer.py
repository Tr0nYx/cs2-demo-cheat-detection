"""
PostgreSQL persistence layer for analysis results and errors.

Handles writing feature extraction results and parser/feature failures to the database
with parameterized queries to prevent SQL injection.
"""

from __future__ import annotations

import json
import sys
from typing import Any

import psycopg2
import psycopg2.extras


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
        - errorStatus = true
        - errorMessage = error_message
        - status = 'error'

        Args:
            demo_id: UUID of the demo that failed
            error_message: Error description (will be stored in errorMessage field)

        Raises:
            psycopg2.Error: If database write fails (logged with context before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Use parameterized query to prevent SQL injection
            update_query = """
                UPDATE demo
                SET error_status = true, error_message = %s, status = %s
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
        feature_results: dict[str, Any],
        scoring_summary: Any,
    ) -> None:
        """
        Record a successful analysis result.

        Creates an AnalysisResult record with:
        - demo_id (FK to Demo)
        - Normalized feature scores: aimbotScore, triggerBotScore, wallhackScore, recoilScore, bhopScore, sessionScore
        - overallSuspicion and suspicionLabel from the scoring_summary
        - featureData JSON containing raw measurements

        Also updates Demo status to 'done'.

        Args:
            demo_id: UUID of the analyzed demo
            feature_results: Dict mapping feature names to their extraction results
            scoring_summary: Object with overall_score (float 0.0-1.0) and label (str)

        Raises:
            psycopg2.Error: If database write fails (logged with context before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Extract normalized feature scores (default to None if missing)
            aimbot_score = feature_results.get("aimbot", {}).get("score") if feature_results.get("aimbot") else None
            trigger_score = feature_results.get("triggerbot", {}).get("score") if feature_results.get("triggerbot") else None
            wallhack_score = feature_results.get("wallhack", {}).get("score") if feature_results.get("wallhack") else None
            recoil_score = feature_results.get("recoil", {}).get("score") if feature_results.get("recoil") else None
            bhop_score = feature_results.get("bhop", {}).get("score") if feature_results.get("bhop") else None
            session_score = feature_results.get("session", {}).get("score") if feature_results.get("session") else None

            # Prepare featureData JSON with raw measurements from all features
            feature_data = {}
            for feature_name, feature_result in feature_results.items():
                if isinstance(feature_result, dict):
                    feature_data[feature_name] = {
                        "score": feature_result.get("score"),
                        "raw_measurements": feature_result.get("raw_measurements", {}),
                        "metadata": feature_result.get("metadata", {}),
                    }

            # Insert AnalysisResult record
            insert_query = """
                INSERT INTO analysis_result
                (demo_id, aimbot_score, trigger_bot_score, wallhack_score, recoil_score, bhop_score, session_score, overall_suspicion, suspicion_label, feature_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            overall_score = getattr(scoring_summary, "overall_score", 0.5) if scoring_summary else 0.5
            label = getattr(scoring_summary, "label", "suspicious") if scoring_summary else "suspicious"

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
                    json.dumps(feature_data),
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
            print(json.dumps(log_payload, separators=(",", ":")), file=sys.stdout, flush=True)

        except psycopg2.Error as e:
            self.db_conn.rollback()
            log_error = {
                "event": "result_write_failed",
                "demo_id": demo_id,
                "error": str(e),
            }
            print(json.dumps(log_error, separators=(",", ":")), file=sys.stdout, flush=True)
            raise
        finally:
            if cursor is not None:
                cursor.close()
