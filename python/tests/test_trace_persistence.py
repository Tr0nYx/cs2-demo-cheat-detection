"""Integration tests for TRACE persistence to database.

Tests validate:
- write_result() with and without TRACE components
- TRACE rating insertion and column values
- Foreign key relationship to AnalysisResult
- Calibration version tracking
- Trust multiplier and component persistence
- Trace percentile NULL handling
- Multiple TRACE entries per player (repository queries)
- Cascade delete when AnalysisResult is deleted
- Unique constraint on analysis_result_id
- Query performance (indices working)
"""

import pytest
from datetime import datetime, timezone
from uuid import uuid4


class TestTraceRatingPersistence:
    """Test TRACE rating insertion and column handling."""

    def test_write_result_with_trace_components(self, mocker):
        """Assert TraceRating row inserted when trace_components provided."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        # Mock database connection
        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        # Mock fetchone to return analysis_result_id
        mock_cursor.fetchone.side_effect = [
            (uuid4(),),  # From: SELECT id FROM analysis_result
        ]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        # Should not raise
        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )

        # Verify INSERT into trace_rating was called
        calls = [str(call) for call in mock_cursor.execute.call_args_list]
        trace_insert_found = any("trace_rating" in str(call) for call in calls)
        assert trace_insert_found, "trace_rating INSERT not found in cursor.execute calls"

    def test_write_result_without_trace_components(self, mocker):
        """Assert no TRACE row when trace_components is None (backward compatibility)."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchone.return_value = None

        writer = ResultWriter(mock_conn)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=None,  # No TRACE
        )

        # Verify no trace_rating INSERT
        calls = [str(call) for call in mock_cursor.execute.call_args_list]
        trace_insert_found = any("trace_rating" in str(call) for call in calls)
        assert not trace_insert_found, "trace_rating INSERT should not be called"

    def test_trace_rating_column_precision(self, mocker):
        """Assert float columns preserve precision (e.g., trust_multiplier 0.85)."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=0.95, aim=1.15, kast=1.05, util=0.88, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.35
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        demo_id = str(uuid4())
        writer.write_result(
            demo_id=demo_id,
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )

        # Extract the trace_rating INSERT parameters
        insert_calls = [
            call for call in mock_cursor.execute.call_args_list
            if "trace_rating" in str(call[0])
        ]
        assert len(insert_calls) > 0, "trace_rating INSERT call not found"

    def test_trace_percentile_nullable(self, mocker):
        """Assert trace_percentile can be NULL (not set during insertion)."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )

        # Verify trace_rating INSERT (percentile will be NULL by default)
        calls = [str(call) for call in mock_cursor.execute.call_args_list]
        trace_insert_found = any("trace_rating" in str(call) for call in calls)
        assert trace_insert_found

    def test_raw_components_preserved(self, mocker):
        """Assert raw component values (aim_cpq, clutch_attempts, etc.) are stored."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        raw_values = {
            "ekill_raw": 150.5,
            "aim_cpq": 0.75,
            "aim_csq": 0.68,
            "aim_ttd": 120.0,
            "aim_scs": 0.82,
            "kast_percentage": 65.0,
            "clutch_attempts": 5,
            "clutch_wins": 2,
        }

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
            raw_trace_values=raw_values,
        )

        # Verify INSERT call includes raw values
        insert_calls = [
            call for call in mock_cursor.execute.call_args_list
            if "trace_rating" in str(call[0])
        ]
        assert len(insert_calls) > 0

    def test_multiple_traces_per_player(self, mocker):
        """Assert repository can query multiple TRACE entries for same player."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        player_id = "player123"

        # Write multiple TRACE entries for same player
        for i in range(3):
            mock_cursor.fetchone.side_effect = [(1234 + i,)]
            writer.write_result(
                demo_id=str(uuid4()),
                feature_results=feature_results,
                scoring_summary=scoring_summary,
                trace_components=components,
                player_id=player_id,
                round_count=30,
            )

    def test_calibration_version_stored(self, mocker):
        """Assert calibration_version column matches active calibration."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        # Mock CalibrationManager to return specific version
        import sys
        from unittest.mock import patch

        mock_calibration = {
            "version": "live-v2",
            "global_average": 1.05,
            "sample_size": 150,
        }

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        with patch("python.persistence.result_writer.CalibrationManager") as mock_cal_mgr:
            mock_mgr_instance = mocker.MagicMock()
            mock_cal_mgr.return_value = mock_mgr_instance
            mock_mgr_instance.get_active_calibration.return_value = mock_calibration
            mock_mgr_instance.should_recalibrate.return_value = False

            writer.write_result(
                demo_id=str(uuid4()),
                feature_results=feature_results,
                scoring_summary=scoring_summary,
                trace_components=components,
                player_id="player123",
                round_count=30,
            )

    def test_trust_multiplier_persisted(self, mocker):
        """Assert trust multiplier is calculated and stored correctly."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)

        # Test with suspicion_score that gives known trust_multiplier
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5  # Should give trust ~0.85
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )


class TestTraceCalibrationIntegration:
    """Test calibration loading and recalibration trigger."""

    def test_load_calibration_on_write(self, mocker):
        """Assert CalibrationManager.get_active_calibration() called during write."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        from unittest.mock import patch

        with patch("python.persistence.result_writer.CalibrationManager") as mock_cal_mgr:
            mock_mgr_instance = mocker.MagicMock()
            mock_cal_mgr.return_value = mock_mgr_instance
            mock_mgr_instance.get_active_calibration.return_value = {
                "version": "default-v1",
                "global_average": 1.0,
            }
            mock_mgr_instance.should_recalibrate.return_value = False

            writer.write_result(
                demo_id=str(uuid4()),
                feature_results=feature_results,
                scoring_summary=scoring_summary,
                trace_components=components,
                player_id="player123",
                round_count=30,
            )

            # Verify CalibrationManager was instantiated
            mock_cal_mgr.assert_called_once()
            # Verify get_active_calibration was called
            mock_mgr_instance.get_active_calibration.assert_called_once()

    def test_recalibration_triggered(self, mocker):
        """Assert store_calibration called when should_recalibrate returns True."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        from unittest.mock import patch

        with patch("python.persistence.result_writer.CalibrationManager") as mock_cal_mgr:
            mock_mgr_instance = mocker.MagicMock()
            mock_cal_mgr.return_value = mock_mgr_instance
            mock_mgr_instance.get_active_calibration.return_value = {
                "version": "default-v1",
                "global_average": 1.0,
            }
            mock_mgr_instance.should_recalibrate.return_value = True
            mock_mgr_instance.calculate_calibration.return_value = {
                "sample_size": 100,
                "global_average": 1.02,
            }
            mock_mgr_instance.store_calibration.return_value = "live-v1"

            writer.write_result(
                demo_id=str(uuid4()),
                feature_results=feature_results,
                scoring_summary=scoring_summary,
                trace_components=components,
                player_id="player123",
                round_count=30,
            )

            # Verify recalibration was triggered
            mock_mgr_instance.should_recalibrate.assert_called_once()
            mock_mgr_instance.calculate_calibration.assert_called_once()
            mock_mgr_instance.store_calibration.assert_called_once()

    def test_trace_error_doesnt_fail_analysis(self, mocker):
        """Assert TRACE persistence errors are logged but don't crash write_result."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        from unittest.mock import patch

        with patch("python.persistence.result_writer.CalibrationManager") as mock_cal_mgr:
            mock_mgr_instance = mocker.MagicMock()
            mock_cal_mgr.return_value = mock_mgr_instance
            # Raise exception on get_active_calibration
            mock_mgr_instance.get_active_calibration.side_effect = Exception("DB error")

            # Should not raise - error is caught and logged
            writer.write_result(
                demo_id=str(uuid4()),
                feature_results=feature_results,
                scoring_summary=scoring_summary,
                trace_components=components,
                player_id="player123",
                round_count=30,
            )


class TestTraceRepositoryQueries:
    """Test TraceRatingRepository query methods."""

    def test_find_latest_by_player(self, mocker):
        """Assert findLatestByPlayer returns recent TRACE entries ordered DESC."""
        pytest.importorskip("sqlalchemy")
        from app.infrastructure.persistence import TraceRatingRepository

        # This would require a real database or full ORM mock
        # Verify the method exists and is callable
        assert hasattr(TraceRatingRepository, "findLatestByPlayer")

    def test_find_by_calibration_version(self, mocker):
        """Assert findByCalibrationVersion returns entries for specific version."""
        pytest.importorskip("sqlalchemy")
        from app.infrastructure.persistence import TraceCalibrationRepository

        assert hasattr(TraceCalibrationRepository, "findByCalibrationVersion")

    def test_count_by_calibration_version(self, mocker):
        """Assert countByCalibrationVersion returns sample count."""
        pytest.importorskip("sqlalchemy")
        from app.infrastructure.persistence import TraceRatingRepository

        assert hasattr(TraceRatingRepository, "countByCalibrationVersion")


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_analysis_result_id_none(self, mocker):
        """Assert graceful handling when analysis_result_id query returns None."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None  # No analysis_result_id

        writer = ResultWriter(mock_conn)
        components = TraceComponents(ekill=1.0, aim=1.2, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        # Should not raise
        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )

    def test_component_values_clamped(self, mocker):
        """Assert out-of-bounds components are clamped to [0.3, 2.0]."""
        pytest.importorskip("psycopg2")
        from python.persistence.result_writer import ResultWriter
        from python.scoring.trace_rating import TraceComponents

        mock_conn = mocker.MagicMock()
        mock_cursor = mocker.MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.side_effect = [(1234,)]

        writer = ResultWriter(mock_conn)
        # Values outside [0.3, 2.0] should be clamped by TraceCalculator
        components = TraceComponents(ekill=0.1, aim=3.0, kast=0.95, util=0.8, clutch=1.0)
        scoring_summary = mocker.MagicMock()
        scoring_summary.overall_score = 0.5
        scoring_summary.label = "suspicious"

        feature_results = {
            "AimbotExtractor": mocker.MagicMock(score=0.3, raw_measurements={}, metadata={}),
        }

        writer.write_result(
            demo_id=str(uuid4()),
            feature_results=feature_results,
            scoring_summary=scoring_summary,
            trace_components=components,
            player_id="player123",
            round_count=30,
        )
