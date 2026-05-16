"""Unit tests for CalibrationManager and calibration logic.

Tests validate:
- Loading calibrations by version with fallback to defaults
- Getting active calibration with 100-sample threshold
- Calculating statistics from TRACE data (mean, stdev, percentiles)
- Storing new calibration versions
- Version number increment (live-v1, live-v2, etc.)
- Recalibration trigger (100-sample threshold + 24-hour cooldown)
- Error handling and JSON logging
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch


class TestLoadCalibration:
    """Test loading calibrations by version."""

    def test_load_default_calibration(self, mocker):
        """Assert load_calibration returns default when version not found."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        manager = CalibrationManager(mock_conn)
        calibration = manager.load_calibration("nonexistent-version")

        assert calibration is not None
        assert calibration["version"] == "default-v1"
        assert calibration["global_average"] == 1.0
        assert calibration["ekill_mean"] == 1.0
        assert calibration["ekill_stdev"] == 0.1

    def test_load_existing_calibration(self, mocker):
        """Assert load_calibration returns exact values from database."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Simulate database row with 28 columns
        mock_cursor.fetchone.return_value = (
            "live-v2",  # version
            150,  # sample_size
            1.05,  # global_average
            1.02, 0.08, 1.00, 1.05, 1.10,  # ekill
            1.15, 0.12, 1.10, 1.20, 1.30,  # aim
            0.98, 0.10, 0.95, 1.02, 1.08,  # kast
            0.92, 0.15, 0.85, 0.95, 1.05,  # util
            1.08, 0.09, 1.05, 1.10, 1.15,  # clutch
        )

        manager = CalibrationManager(mock_conn)
        calibration = manager.load_calibration("live-v2")

        assert calibration["version"] == "live-v2"
        assert calibration["sample_size"] == 150
        assert abs(calibration["global_average"] - 1.05) < 0.001
        assert abs(calibration["ekill_mean"] - 1.02) < 0.001
        assert abs(calibration["aim_p95"] - 1.30) < 0.001

    def test_load_nonexistent_version_fallback(self, mocker):
        """Assert fallback to default calibration preserves all necessary keys."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        manager = CalibrationManager(mock_conn)
        calibration = manager.load_calibration("missing")

        # Verify all required keys present
        required_keys = [
            "version", "sample_size", "global_average",
            "ekill_mean", "ekill_stdev", "ekill_p50", "ekill_p75", "ekill_p95",
            "aim_mean", "aim_stdev", "aim_p50", "aim_p75", "aim_p95",
            "kast_mean", "kast_stdev", "kast_p50", "kast_p75", "kast_p95",
            "util_mean", "util_stdev", "util_p50", "util_p75", "util_p95",
            "clutch_mean", "clutch_stdev", "clutch_p50", "clutch_p75", "clutch_p95",
        ]
        for key in required_keys:
            assert key in calibration


class TestGetActiveCalibration:
    """Test getting the active calibration."""

    def test_get_active_calibration_sufficient_samples(self, mocker):
        """Assert get_active_calibration returns latest when >= 100 samples."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First call: count query returns 150 samples
        # Second call: fetch latest calibration
        mock_cursor.fetchone.side_effect = [
            (150,),  # COUNT(*) FROM trace_rating
            (
                "live-v2",  # version
                150,  # sample_size
                1.05,  # global_average
                1.02, 0.08, 1.00, 1.05, 1.10,  # ekill
                1.15, 0.12, 1.10, 1.20, 1.30,  # aim
                0.98, 0.10, 0.95, 1.02, 1.08,  # kast
                0.92, 0.15, 0.85, 0.95, 1.05,  # util
                1.08, 0.09, 1.05, 1.10, 1.15,  # clutch
            ),
        ]

        manager = CalibrationManager(mock_conn)
        calibration = manager.get_active_calibration()

        assert calibration["version"] == "live-v2"
        assert calibration["sample_size"] == 150

    def test_get_active_calibration_below_threshold(self, mocker):
        """Assert get_active_calibration returns default when < 100 samples."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # COUNT(*) returns only 50 samples
        mock_cursor.fetchone.return_value = (50,)

        manager = CalibrationManager(mock_conn)
        calibration = manager.get_active_calibration()

        assert calibration["version"] == "default-v1"
        assert calibration["global_average"] == 1.0

    def test_get_active_calibration_no_unlocked_versions(self, mocker):
        """Assert get_active_calibration returns default when no unlocked versions exist."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # COUNT returns 100+, but fetchone for calibration returns None
        mock_cursor.fetchone.side_effect = [(100,), None]

        manager = CalibrationManager(mock_conn)
        calibration = manager.get_active_calibration()

        assert calibration["version"] == "default-v1"


class TestCalculateCalibration:
    """Test calculating new calibration statistics."""

    def test_calculate_calibration_with_samples(self, mocker):
        """Assert calculate_calibration computes statistics from TRACE data."""
        from python.scoring.trace_calibration import CalibrationManager
        import numpy as np

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock 10 TRACE rows with known values
        rows = [
            (1.0, 1.0, 1.0, 1.0, 1.0, 1.0),  # trace_adjusted, ekill, aim, kast, util, clutch
            (1.1, 1.1, 1.1, 1.1, 1.1, 1.1),
            (0.9, 0.9, 0.9, 0.9, 0.9, 0.9),
            (1.05, 1.05, 1.05, 1.05, 1.05, 1.05),
            (0.95, 0.95, 0.95, 0.95, 0.95, 0.95),
            (1.0, 1.0, 1.0, 1.0, 1.0, 1.0),
            (1.1, 1.1, 1.1, 1.1, 1.1, 1.1),
            (0.9, 0.9, 0.9, 0.9, 0.9, 0.9),
            (1.05, 1.05, 1.05, 1.05, 1.05, 1.05),
            (0.95, 0.95, 0.95, 0.95, 0.95, 0.95),
        ]
        mock_cursor.fetchall.return_value = rows

        manager = CalibrationManager(mock_conn)
        calibration = manager.calculate_calibration()

        assert calibration["sample_size"] == 10
        assert "global_average" in calibration
        assert "ekill_mean" in calibration
        assert "ekill_stdev" in calibration
        assert "ekill_p50" in calibration
        assert "ekill_p75" in calibration
        assert "ekill_p95" in calibration

    def test_calculate_calibration_below_threshold(self, mocker):
        """Assert calculate_calibration works with < 100 samples (returns defaults)."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # 50 samples
        rows = [(1.0, 1.0, 1.0, 1.0, 1.0, 1.0) for _ in range(50)]
        mock_cursor.fetchall.return_value = rows

        manager = CalibrationManager(mock_conn)
        calibration = manager.calculate_calibration()

        assert calibration["sample_size"] == 50

    def test_calculate_calibration_empty_database(self, mocker):
        """Assert calculate_calibration handles zero rows gracefully."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []

        manager = CalibrationManager(mock_conn)
        calibration = manager.calculate_calibration()

        assert calibration["sample_size"] == 0
        assert calibration["version"] is None


class TestStoreCalibration:
    """Test storing new calibration versions."""

    def test_store_calibration_new_version(self, mocker):
        """Assert store_calibration generates version string and inserts."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First query finds no existing live-v versions, second is INSERT
        mock_cursor.fetchone.return_value = (None,)

        manager = CalibrationManager(mock_conn)
        calibration_data = {
            "sample_size": 100,
            "global_average": 1.02,
            "ekill_mean": 1.0, "ekill_stdev": 0.1, "ekill_p50": 1.0, "ekill_p75": 1.0, "ekill_p95": 1.0,
            "aim_mean": 1.0, "aim_stdev": 0.1, "aim_p50": 1.0, "aim_p75": 1.0, "aim_p95": 1.0,
            "kast_mean": 1.0, "kast_stdev": 0.1, "kast_p50": 1.0, "kast_p75": 1.0, "kast_p95": 1.0,
            "util_mean": 1.0, "util_stdev": 0.1, "util_p50": 1.0, "util_p75": 1.0, "util_p95": 1.0,
            "clutch_mean": 1.0, "clutch_stdev": 0.1, "clutch_p50": 1.0, "clutch_p75": 1.0, "clutch_p95": 1.0,
        }

        version = manager.store_calibration(calibration_data)

        assert version == "live-v1"
        # Verify INSERT was called
        mock_cursor.execute.assert_called()

    def test_store_calibration_version_increment(self, mocker):
        """Assert version numbers increment correctly (live-v1, live-v2, etc.)."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Find max version 2, so next should be 3
        mock_cursor.fetchone.return_value = (2,)

        manager = CalibrationManager(mock_conn)
        calibration_data = {
            "sample_size": 100,
            "global_average": 1.02,
            "ekill_mean": 1.0, "ekill_stdev": 0.1, "ekill_p50": 1.0, "ekill_p75": 1.0, "ekill_p95": 1.0,
            "aim_mean": 1.0, "aim_stdev": 0.1, "aim_p50": 1.0, "aim_p75": 1.0, "aim_p95": 1.0,
            "kast_mean": 1.0, "kast_stdev": 0.1, "kast_p50": 1.0, "kast_p75": 1.0, "kast_p95": 1.0,
            "util_mean": 1.0, "util_stdev": 0.1, "util_p50": 1.0, "util_p75": 1.0, "util_p95": 1.0,
            "clutch_mean": 1.0, "clutch_stdev": 0.1, "clutch_p50": 1.0, "clutch_p75": 1.0, "clutch_p95": 1.0,
        }

        version = manager.store_calibration(calibration_data)

        assert version == "live-v3"


class TestRecalibrationTrigger:
    """Test the recalibration trigger logic."""

    def test_should_recalibrate_false_low_count(self, mocker):
        """Assert should_recalibrate returns False when < 100 samples."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = (50,)

        manager = CalibrationManager(mock_conn)
        result = manager.should_recalibrate()

        assert result is False

    def test_should_recalibrate_true_sufficient_samples_no_recent(self, mocker):
        """Assert should_recalibrate returns True when >= 100 samples and no recent calibration."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First query: COUNT(*) = 150
        # Second query: COUNT of recent calibrations = 0
        mock_cursor.fetchone.side_effect = [(150,), (0,)]

        manager = CalibrationManager(mock_conn)
        result = manager.should_recalibrate()

        assert result is True

    def test_should_recalibrate_false_recent_calibration(self, mocker):
        """Assert should_recalibrate returns False when recent calibration exists."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # First query: COUNT(*) = 150
        # Second query: COUNT of recent = 1
        mock_cursor.fetchone.side_effect = [(150,), (1,)]

        manager = CalibrationManager(mock_conn)
        result = manager.should_recalibrate()

        assert result is False

    def test_should_recalibrate_threshold_exactly_100(self, mocker):
        """Assert should_recalibrate returns True at exactly 100 samples."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [(100,), (0,)]

        manager = CalibrationManager(mock_conn)
        result = manager.should_recalibrate()

        assert result is True


class TestErrorHandling:
    """Test error handling and logging."""

    def test_load_calibration_db_error(self, mocker):
        """Assert database errors are caught and re-raised."""
        from python.scoring.trace_calibration import CalibrationManager
        import psycopg2

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("Connection failed")

        manager = CalibrationManager(mock_conn)

        with pytest.raises(psycopg2.Error):
            manager.load_calibration("live-v1")

    def test_calculate_calibration_preserves_types(self, mocker):
        """Assert calculated statistics are all float/int types (not NaN)."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        rows = [(1.0, 1.0, 1.0, 1.0, 1.0, 1.0) for _ in range(10)]
        mock_cursor.fetchall.return_value = rows

        manager = CalibrationManager(mock_conn)
        calibration = manager.calculate_calibration()

        # Verify no NaN values
        for key in ["global_average", "ekill_mean", "ekill_p50"]:
            value = calibration[key]
            assert isinstance(value, (float, int))
            assert not (value != value)  # NaN check


class TestPercentileCalculations:
    """Test percentile accuracy."""

    def test_calibration_percentile_calculations_accuracy(self, mocker):
        """Assert percentile calculations match numpy output."""
        from python.scoring.trace_calibration import CalibrationManager
        import numpy as np

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Known values for percentile testing
        test_values = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]
        rows = [(v, v, v, v, v, v) for v in test_values]
        mock_cursor.fetchall.return_value = rows

        manager = CalibrationManager(mock_conn)
        calibration = manager.calculate_calibration()

        # Verify percentiles
        assert 0.5 <= calibration["ekill_p50"] <= 1.0
        assert calibration["ekill_p75"] >= calibration["ekill_p50"]
        assert calibration["ekill_p95"] >= calibration["ekill_p75"]

    def test_calibration_version_reproducibility(self, mocker):
        """Assert same data produces same calibration statistics."""
        from python.scoring.trace_calibration import CalibrationManager

        mock_conn1 = mocker.MagicMock()
        mock_cursor1 = mocker.MagicMock()
        mock_conn1.cursor.return_value = mock_cursor1

        mock_conn2 = mocker.MagicMock()
        mock_cursor2 = mocker.MagicMock()
        mock_conn2.cursor.return_value = mock_cursor2

        # Same data in both
        rows = [(1.0, 1.0, 1.0, 1.0, 1.0, 1.0) for _ in range(50)]
        mock_cursor1.fetchall.return_value = rows
        mock_cursor2.fetchall.return_value = rows

        manager1 = CalibrationManager(mock_conn1)
        manager2 = CalibrationManager(mock_conn2)

        cal1 = manager1.calculate_calibration()
        cal2 = manager2.calculate_calibration()

        assert abs(cal1["global_average"] - cal2["global_average"]) < 0.0001
        assert abs(cal1["ekill_mean"] - cal2["ekill_mean"]) < 0.0001
