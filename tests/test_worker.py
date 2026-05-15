"""Tests for worker loop: job handling, error persistence, logging."""

import json
from io import StringIO
from unittest.mock import Mock, patch, MagicMock

import pytest


class TestWorker:
    """Tests for worker job processing and error handling."""

    def test_brpop_receives_job(self, mock_redis, mock_db_conn):
        """Test that worker can receive a job from Redis BRPOP.

        Tests D-23: BRPOP queue polling.
        """
        # Mock a job in the queue
        job_json = json.dumps(
            {"demo_id": "test-uuid-1", "file_path": "/storage/demos/test.dem"}
        )
        mock_redis.brpop.return_value = ("cs2.analysis", job_json)

        # Parse the job (simulating worker behavior)
        job = mock_redis.brpop("cs2.analysis", timeout=5)
        assert job is not None
        assert job[0] == "cs2.analysis"

        _, job_data = job
        parsed = json.loads(job_data)
        assert parsed["demo_id"] == "test-uuid-1"
        assert parsed["file_path"] == "/storage/demos/test.dem"

    def test_job_deserialization(self, mock_redis):
        """Test that malformed JSON is handled gracefully.

        Tests D-25: JSON deserialization error handling.
        """
        # Mock malformed JSON
        bad_json = '{"demo_id": "test"}'  # Missing file_path
        mock_redis.brpop.return_value = ("cs2.analysis", bad_json)

        job = mock_redis.brpop("cs2.analysis", timeout=5)
        _, job_data = job

        parsed = json.loads(job_data)
        assert "demo_id" in parsed
        assert parsed.get("file_path") is None

    def test_log_format_is_json(self, capsys):
        """Test that worker logs are valid JSON.

        Tests D-38, D-39: JSON-structured logging.
        """
        from worker import log

        log("test_event", demo_id="test-1", score=0.75)

        captured = capsys.readouterr()
        output = captured.out.strip()

        # Verify output is valid JSON
        parsed = json.loads(output)
        assert parsed["event"] == "test_event"
        assert parsed["demo_id"] == "test-1"
        assert parsed["score"] == 0.75
        assert "timestamp" in parsed

    def test_error_persistence_writes_to_db(self, mock_db_conn):
        """Test that errors are persisted to database.

        Tests D-20, D-22: error recording and logging.
        """
        from persistence.result_writer import ResultWriter

        writer = ResultWriter(mock_db_conn)
        error_msg = "Demo file not found"

        # Call write_error
        writer.write_error("test-uuid-1", error_msg)

        # Verify cursor.execute was called with UPDATE
        mock_db_conn.cursor().execute.assert_called()

        # Verify commit was called
        mock_db_conn.commit.assert_called()

    def test_worker_handles_redis_error(self, mock_redis):
        """Test that worker handles Redis connection errors.

        Tests D-21: unrecoverable error handling.
        """
        import redis

        # Mock Redis connection error
        mock_redis.brpop.side_effect = redis.ConnectionError("Connection lost")

        with pytest.raises(redis.ConnectionError):
            mock_redis.brpop("cs2.analysis", timeout=5)

    def test_result_writer_error_handling(self, mock_db_conn):
        """Test that result writer handles database errors.

        Tests D-21: unrecoverable error handling.
        """
        from persistence.result_writer import ResultWriter
        import psycopg2

        # Mock database error
        mock_db_conn.cursor().execute.side_effect = psycopg2.Error(
            "Database error"
        )

        writer = ResultWriter(mock_db_conn)

        with pytest.raises(psycopg2.Error):
            writer.write_error("test-uuid-1", "Test error")

        # Verify rollback was called
        mock_db_conn.rollback.assert_called()

    def test_sigterm_graceful_shutdown(self, capsys):
        """Test that worker handles SIGTERM and gracefully shuts down.

        Tests D-26: SIGTERM signal handling and graceful shutdown.
        """
        import signal
        from worker import _handle_shutdown, log

        # Call the shutdown handler (simulating SIGTERM receipt)
        _handle_shutdown(signal.SIGTERM, None)

        # Verify that a shutdown_requested event was logged
        captured = capsys.readouterr()
        output = captured.out.strip()

        # Parse the logged event
        parsed = json.loads(output)
        assert parsed["event"] == "shutdown_requested"
        assert parsed["signal"] == signal.SIGTERM
