"""TRACE Calibration Manager: Loading, calculating, and storing calibration versions.

Calibration data represents the baseline statistics used to normalize TRACE scores.
The CalibrationManager handles:

1. Loading existing calibrations by version (with sensible defaults)
2. Getting the active calibration (most recent, unlocked)
3. Calculating new calibration statistics from accumulated TRACE data
4. Storing new calibration versions with automatic version increment
5. Deciding when to trigger recalibration (100-sample threshold + 24-hour cooldown)

All database operations use parameterized queries (cursor.execute with %s) to prevent
SQL injection. Errors are logged as JSON and re-raised.
"""

from __future__ import annotations

import json
import logging
import sys
from typing import Any, Optional

import numpy as np
import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)


class CalibrationManager:
    """Manages loading, calculating, and storing TRACE calibration versions.

    Calibration represents baseline statistics (means, stdevs, percentiles) for each
    TRACE component, used to normalize trace_adjusted scores across different player
    populations and time periods.

    The 100-sample threshold (Decision D-04) ensures calibrations are based on
    sufficient data before being marked active. The 24-hour cooldown prevents
    excessive recalibration.
    """

    def __init__(self, db_conn: psycopg2.extensions.connection) -> None:
        """Initialize CalibrationManager with database connection.

        Args:
            db_conn: psycopg2 database connection (open, ready to use)
        """
        self.db_conn = db_conn

    def load_calibration(self, version: str) -> dict[str, Any]:
        """Load calibration statistics for a specific version.

        Queries the trace_calibration table for the given version. If not found,
        returns a default calibration (version="default-v1", global_average=1.0,
        all component means=1.0, stdevs=0.1, percentiles=1.0).

        This fallback ensures the system always has valid calibration data
        (no KeyError, no None returns).

        Args:
            version: Version identifier (e.g., "default-v1", "live-v1")

        Returns:
            dict with keys:
            - version: str
            - sample_size: int
            - global_average: float
            - {component}_mean, {component}_stdev, {component}_p50, p75, p95 for each component
              where component in ['ekill', 'aim', 'kast', 'util', 'clutch']

        Raises:
            psycopg2.Error: If database query fails (logged before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            query = """
                SELECT version, sample_size, global_average,
                       ekill_mean, ekill_stdev, ekill_p50, ekill_p75, ekill_p95,
                       aim_mean, aim_stdev, aim_p50, aim_p75, aim_p95,
                       kast_mean, kast_stdev, kast_p50, kast_p75, kast_p95,
                       util_mean, util_stdev, util_p50, util_p75, util_p95,
                       clutch_mean, clutch_stdev, clutch_p50, clutch_p75, clutch_p95
                FROM trace_calibration
                WHERE version = %s
            """

            cursor.execute(query, (version,))
            row = cursor.fetchone()

            if row is None:
                # Return default calibration
                return self._default_calibration()

            # Parse result into dict
            calibration = {
                "version": row[0],
                "sample_size": row[1],
                "global_average": row[2],
                "ekill_mean": row[3],
                "ekill_stdev": row[4],
                "ekill_p50": row[5],
                "ekill_p75": row[6],
                "ekill_p95": row[7],
                "aim_mean": row[8],
                "aim_stdev": row[9],
                "aim_p50": row[10],
                "aim_p75": row[11],
                "aim_p95": row[12],
                "kast_mean": row[13],
                "kast_stdev": row[14],
                "kast_p50": row[15],
                "kast_p75": row[16],
                "kast_p95": row[17],
                "util_mean": row[18],
                "util_stdev": row[19],
                "util_p50": row[20],
                "util_p75": row[21],
                "util_p95": row[22],
                "clutch_mean": row[23],
                "clutch_stdev": row[24],
                "clutch_p50": row[25],
                "clutch_p75": row[26],
                "clutch_p95": row[27],
            }

            return calibration

        except psycopg2.Error as e:
            log_error = {
                "event": "calibration_load_failed",
                "version": version,
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

    def get_active_calibration(self) -> dict[str, Any]:
        """Get the active (most recent, unlocked) calibration.

        Queries the trace_calibration table for unlocked versions, ordered by
        created_at DESC. If < 100 trace_rating rows exist (Decision D-04 threshold),
        returns default calibration instead.

        This ensures new systems bootstrap with sensible defaults before enough
        data accumulates for live calibration.

        Args:
            None

        Returns:
            dict with calibration statistics (same keys as load_calibration())

        Raises:
            psycopg2.Error: If database query fails (logged before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Check if we have >= 100 TRACE samples
            count_query = "SELECT COUNT(*) FROM trace_rating"
            cursor.execute(count_query)
            sample_count = cursor.fetchone()[0]

            if sample_count < 100:
                # Below threshold: return default calibration
                log_event = {
                    "event": "using_default_calibration",
                    "reason": "insufficient_samples",
                    "sample_count": sample_count,
                    "threshold": 100,
                }
                print(
                    json.dumps(log_event, separators=(",", ":")),
                    file=sys.stdout,
                    flush=True,
                )
                return self._default_calibration()

            # Find most recent unlocked calibration
            query = """
                SELECT version, sample_size, global_average,
                       ekill_mean, ekill_stdev, ekill_p50, ekill_p75, ekill_p95,
                       aim_mean, aim_stdev, aim_p50, aim_p75, aim_p95,
                       kast_mean, kast_stdev, kast_p50, kast_p75, kast_p95,
                       util_mean, util_stdev, util_p50, util_p75, util_p95,
                       clutch_mean, clutch_stdev, clutch_p50, clutch_p75, clutch_p95
                FROM trace_calibration
                WHERE locked = FALSE
                ORDER BY created_at DESC
                LIMIT 1
            """

            cursor.execute(query)
            row = cursor.fetchone()

            if row is None:
                return self._default_calibration()

            calibration = {
                "version": row[0],
                "sample_size": row[1],
                "global_average": row[2],
                "ekill_mean": row[3],
                "ekill_stdev": row[4],
                "ekill_p50": row[5],
                "ekill_p75": row[6],
                "ekill_p95": row[7],
                "aim_mean": row[8],
                "aim_stdev": row[9],
                "aim_p50": row[10],
                "aim_p75": row[11],
                "aim_p95": row[12],
                "kast_mean": row[13],
                "kast_stdev": row[14],
                "kast_p50": row[15],
                "kast_p75": row[16],
                "kast_p95": row[17],
                "util_mean": row[18],
                "util_stdev": row[19],
                "util_p50": row[20],
                "util_p75": row[21],
                "util_p95": row[22],
                "clutch_mean": row[23],
                "clutch_stdev": row[24],
                "clutch_p50": row[25],
                "clutch_p75": row[26],
                "clutch_p95": row[27],
            }

            log_event = {
                "event": "active_calibration_loaded",
                "version": calibration["version"],
                "sample_size": calibration["sample_size"],
            }
            print(
                json.dumps(log_event, separators=(",", ":")),
                file=sys.stdout,
                flush=True,
            )

            return calibration

        except psycopg2.Error as e:
            log_error = {
                "event": "active_calibration_load_failed",
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

    def calculate_calibration(self) -> dict[str, Any]:
        """Calculate new calibration statistics from all TRACE data.

        Queries all trace_rating rows and computes:
        - global_average: mean of trace_adjusted
        - For each component (ekill, aim, kast, util, clutch):
          - mean, stdev, p50, p75, p95

        Does NOT write to database (caller decides when to persist).

        Uses numpy for efficient numerical calculations.

        Args:
            None

        Returns:
            dict with calculated statistics (ready for store_calibration)

        Raises:
            psycopg2.Error: If database query fails (logged before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Fetch all TRACE data
            query = """
                SELECT trace_adjusted, ekill, aim, kast, util, clutch
                FROM trace_rating
            """

            cursor.execute(query)
            rows = cursor.fetchall()

            if not rows:
                # Empty database: return default with 0 samples
                default = self._default_calibration()
                default["sample_size"] = 0
                return default

            # Extract columns
            trace_adjusted_values = np.array([row[0] for row in rows])
            ekill_values = np.array([row[1] for row in rows])
            aim_values = np.array([row[2] for row in rows])
            kast_values = np.array([row[3] for row in rows])
            util_values = np.array([row[4] for row in rows])
            clutch_values = np.array([row[5] for row in rows])

            # Calculate statistics
            calibration = {
                "version": None,  # Will be set by store_calibration()
                "sample_size": len(rows),
                "global_average": float(np.mean(trace_adjusted_values)),
                "ekill_mean": float(np.mean(ekill_values)),
                "ekill_stdev": float(np.std(ekill_values)),
                "ekill_p50": float(np.percentile(ekill_values, 50)),
                "ekill_p75": float(np.percentile(ekill_values, 75)),
                "ekill_p95": float(np.percentile(ekill_values, 95)),
                "aim_mean": float(np.mean(aim_values)),
                "aim_stdev": float(np.std(aim_values)),
                "aim_p50": float(np.percentile(aim_values, 50)),
                "aim_p75": float(np.percentile(aim_values, 75)),
                "aim_p95": float(np.percentile(aim_values, 95)),
                "kast_mean": float(np.mean(kast_values)),
                "kast_stdev": float(np.std(kast_values)),
                "kast_p50": float(np.percentile(kast_values, 50)),
                "kast_p75": float(np.percentile(kast_values, 75)),
                "kast_p95": float(np.percentile(kast_values, 95)),
                "util_mean": float(np.mean(util_values)),
                "util_stdev": float(np.std(util_values)),
                "util_p50": float(np.percentile(util_values, 50)),
                "util_p75": float(np.percentile(util_values, 75)),
                "util_p95": float(np.percentile(util_values, 95)),
                "clutch_mean": float(np.mean(clutch_values)),
                "clutch_stdev": float(np.std(clutch_values)),
                "clutch_p50": float(np.percentile(clutch_values, 50)),
                "clutch_p75": float(np.percentile(clutch_values, 75)),
                "clutch_p95": float(np.percentile(clutch_values, 95)),
            }

            return calibration

        except psycopg2.Error as e:
            log_error = {
                "event": "calibration_calculation_failed",
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

    def store_calibration(self, calibration_data: dict[str, Any]) -> str:
        """Store new calibration version in database.

        Generates a new version string in the format "live-v{N}" where N increments
        from any previous live versions. Then inserts into trace_calibration table
        via parameterized query.

        Args:
            calibration_data: dict with calculated statistics (from calculate_calibration)

        Returns:
            str: New version identifier (e.g., "live-v1")

        Raises:
            psycopg2.Error: If database write fails (logged before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Determine next version number
            query = """
                SELECT MAX(CAST(SUBSTRING(version, 7) AS INTEGER))
                FROM trace_calibration
                WHERE version LIKE 'live-v%'
            """

            cursor.execute(query)
            result = cursor.fetchone()
            next_version_num = 1 if result[0] is None else result[0] + 1
            new_version = f"live-v{next_version_num}"

            # Insert new calibration
            insert_query = """
                INSERT INTO trace_calibration
                (version, sample_size, global_average,
                 ekill_mean, ekill_stdev, ekill_p50, ekill_p75, ekill_p95,
                 aim_mean, aim_stdev, aim_p50, aim_p75, aim_p95,
                 kast_mean, kast_stdev, kast_p50, kast_p75, kast_p95,
                 util_mean, util_stdev, util_p50, util_p75, util_p95,
                 clutch_mean, clutch_stdev, clutch_p50, clutch_p75, clutch_p95,
                 created_at, locked)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE)
            """

            cursor.execute(
                insert_query,
                (
                    new_version,
                    calibration_data["sample_size"],
                    calibration_data["global_average"],
                    calibration_data["ekill_mean"],
                    calibration_data["ekill_stdev"],
                    calibration_data["ekill_p50"],
                    calibration_data["ekill_p75"],
                    calibration_data["ekill_p95"],
                    calibration_data["aim_mean"],
                    calibration_data["aim_stdev"],
                    calibration_data["aim_p50"],
                    calibration_data["aim_p75"],
                    calibration_data["aim_p95"],
                    calibration_data["kast_mean"],
                    calibration_data["kast_stdev"],
                    calibration_data["kast_p50"],
                    calibration_data["kast_p75"],
                    calibration_data["kast_p95"],
                    calibration_data["util_mean"],
                    calibration_data["util_stdev"],
                    calibration_data["util_p50"],
                    calibration_data["util_p75"],
                    calibration_data["util_p95"],
                    calibration_data["clutch_mean"],
                    calibration_data["clutch_stdev"],
                    calibration_data["clutch_p50"],
                    calibration_data["clutch_p75"],
                    calibration_data["clutch_p95"],
                ),
            )

            self.db_conn.commit()

            log_event = {
                "event": "calibration_stored",
                "version": new_version,
                "sample_size": calibration_data["sample_size"],
                "global_average": calibration_data["global_average"],
            }
            print(
                json.dumps(log_event, separators=(",", ":")),
                file=sys.stdout,
                flush=True,
            )

            return new_version

        except psycopg2.Error as e:
            self.db_conn.rollback()
            log_error = {
                "event": "calibration_store_failed",
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

    def should_recalibrate(self) -> bool:
        """Determine if recalibration should be triggered.

        Recalibration is recommended if:
        1. Total trace_rating rows >= 100 (Decision D-04 threshold), AND
        2. No calibration created in the last 24 hours

        This prevents excessive recalibration while ensuring the system
        adapts to new data patterns.

        Args:
            None

        Returns:
            bool: True if recalibration should proceed, False otherwise

        Raises:
            psycopg2.Error: If database query fails (logged before re-raising)
        """
        cursor = None
        try:
            cursor = self.db_conn.cursor()

            # Check sample count
            count_query = "SELECT COUNT(*) FROM trace_rating"
            cursor.execute(count_query)
            sample_count = cursor.fetchone()[0]

            if sample_count < 100:
                return False

            # Check if recent calibration exists (< 24 hours)
            recent_query = """
                SELECT COUNT(*)
                FROM trace_calibration
                WHERE created_at > NOW() - INTERVAL '24 hours'
            """

            cursor.execute(recent_query)
            recent_count = cursor.fetchone()[0]

            return recent_count == 0

        except psycopg2.Error as e:
            log_error = {
                "event": "recalibration_check_failed",
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

    @staticmethod
    def _default_calibration() -> dict[str, Any]:
        """Return default (bootstrap) calibration.

        Used when no live calibration exists or when sample count < 100.
        Defaults to global_average=1.0 (no normalization) and all component
        means=1.0, stdevs=0.1 (indicating minimal spread).

        Returns:
            dict with default calibration values
        """
        return {
            "version": "default-v1",
            "sample_size": 0,
            "global_average": 1.0,
            "ekill_mean": 1.0,
            "ekill_stdev": 0.1,
            "ekill_p50": 1.0,
            "ekill_p75": 1.0,
            "ekill_p95": 1.0,
            "aim_mean": 1.0,
            "aim_stdev": 0.1,
            "aim_p50": 1.0,
            "aim_p75": 1.0,
            "aim_p95": 1.0,
            "kast_mean": 1.0,
            "kast_stdev": 0.1,
            "kast_p50": 1.0,
            "kast_p75": 1.0,
            "kast_p95": 1.0,
            "util_mean": 1.0,
            "util_stdev": 0.1,
            "util_p50": 1.0,
            "util_p75": 1.0,
            "util_p95": 1.0,
            "clutch_mean": 1.0,
            "clutch_stdev": 0.1,
            "clutch_p50": 1.0,
            "clutch_p75": 1.0,
            "clutch_p95": 1.0,
        }
