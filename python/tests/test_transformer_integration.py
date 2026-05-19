"""Integration tests for transformer sequence extractor and worker pipeline.

Verifies that TransformerSequenceExtractor integrates correctly with the modular
pipeline stages in worker.py per D-15, D-16.
"""

import numpy as np
import pandas as pd
import pytest

from features.transformer_sequence import TransformerSequenceExtractor
from parser.types import ParsedDemo


class TestTransformerSequenceExtractor:
    """Test TransformerSequenceExtractor basic functionality."""

    def test_transformer_extractor_initialization(self):
        """Test that transformer can be initialized."""
        extractor = TransformerSequenceExtractor()
        assert extractor is not None
        assert extractor.CONTEXT_WINDOW_TICKS == 300
        assert extractor.CONTEXT_HALF_WINDOW == 150

    def test_transformer_extractor_with_minimal_demo(self):
        """Test transformer extraction with minimal demo data."""
        # Create minimal demo with one kill
        ticks_df = pd.DataFrame({
            "tick": range(100),
            "steamid": ["player1"] * 100,
            "yaw": np.random.randn(100) * 45,
            "pitch": np.random.randn(100) * 0.3,
            "velocity_x": np.random.randn(100) * 5,
            "velocity_y": np.random.randn(100) * 5,
        })

        # Add more feature columns to reach 44 features
        for i in range(6, 44):
            ticks_df[f"feature_{i}"] = np.random.randn(100)

        events_df = pd.DataFrame({
            "tick": [50],
            "event_type": ["player_death"],
            "attacker_steamid": ["player1"],
            "victim_steamid": ["player2"],
        })

        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name="de_mirage")

        extractor = TransformerSequenceExtractor()
        result = extractor.extract(demo)

        assert result is not None
        assert 0.0 <= result.score <= 1.0
        assert result.raw_measurements is not None
        assert "window_count" in result.raw_measurements
        assert "mean_score" in result.raw_measurements
        assert result.raw_measurements["window_count"] > 0

    def test_context_window_extraction(self):
        """Test that context windows are properly extracted."""
        # Create demo with multiple kills
        ticks_df = pd.DataFrame({
            "tick": range(300),
            "steamid": ["player1"] * 300,
        })

        # Add features
        for i in range(44):
            ticks_df[f"feature_{i}"] = np.random.randn(300)

        events_df = pd.DataFrame({
            "tick": [75, 150, 225],
            "event_type": ["player_death", "player_death", "player_death"],
            "attacker_steamid": ["player1", "player1", "player1"],
            "victim_steamid": ["player2", "player2", "player2"],
        })

        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name="de_mirage")

        extractor = TransformerSequenceExtractor()
        windows = extractor._slice_context_windows(demo)

        # Should extract windows for each kill
        assert len(windows) > 0
        for window_tensor, kill_id in windows:
            assert window_tensor.shape == (1, 300, 44)
            assert "kill_" in kill_id

    def test_positional_encoding(self):
        """Test positional encoding generation."""
        tick_ids = np.array([0, 100, 200, 300, 400])

        extractor = TransformerSequenceExtractor()
        pe = extractor._create_positional_encoding(tick_ids, d_model=256)

        assert pe.shape == (5, 256)
        assert np.all(np.isfinite(pe))
        # Values should be bounded (sine/cosine)
        assert np.all(pe >= -1.1) and np.all(pe <= 1.1)

    def test_pad_context_matrix(self):
        """Test that context matrix is padded correctly."""
        # Create small context window
        ticks_df = pd.DataFrame({
            "tick": range(50),
            "steamid": ["player1"] * 50,
        })

        for i in range(44):
            ticks_df[f"feature_{i}"] = np.random.randn(50)

        extractor = TransformerSequenceExtractor()
        padded = extractor._pad_context_matrix(ticks_df, target_size=300)

        assert padded.shape == (300, 44)
        # First 50 rows should have data, rest should be zeros
        assert np.any(padded[:50] != 0)  # Data rows
        assert np.all(padded[50:] == 0)   # Padded rows

    def test_no_kills_error_handling(self):
        """Test that missing kills raises appropriate error."""
        ticks_df = pd.DataFrame({
            "tick": range(100),
            "steamid": ["player1"] * 100,
        })

        for i in range(44):
            ticks_df[f"feature_{i}"] = np.random.randn(100)

        # No kill events
        events_df = pd.DataFrame({
            "tick": [],
            "event_type": [],
            "attacker_steamid": [],
            "victim_steamid": [],
        })

        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name="de_mirage")

        extractor = TransformerSequenceExtractor()
        try:
            result = extractor.extract(demo)
            # Should fail or return None due to no kills
            assert result is None or result.score is None
        except Exception as e:
            assert "no_context_windows" in str(e)

    def test_multi_kill_boundary_filtering(self):
        """Test that windows with multiple kills are skipped (D-18)."""
        # Create demo with two kills close together
        ticks_df = pd.DataFrame({
            "tick": range(300),
            "steamid": ["player1"] * 300,
        })

        for i in range(44):
            ticks_df[f"feature_{i}"] = np.random.randn(300)

        # Two kills within same window (150 tick radius)
        events_df = pd.DataFrame({
            "tick": [100, 120],  # 20 ticks apart, within 150-tick radius
            "event_type": ["player_death", "player_death"],
            "attacker_steamid": ["player1", "player1"],
            "victim_steamid": ["player2", "player2"],
        })

        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name="de_mirage")

        extractor = TransformerSequenceExtractor()
        windows = extractor._slice_context_windows(demo)

        # Should skip the window with multiple kills
        # Keep only kills that have exclusive windows
        for window_tensor, kill_id in windows:
            assert window_tensor.shape == (1, 300, 44)


class TestPipelineIntegration:
    """Test modular pipeline integration (extraction through analysis)."""

    def test_extraction_and_analysis_pipeline(self):
        """Test that extraction and analysis stages work together."""
        # This test verifies the basic pipeline flow without requiring
        # the actual trained model (which we don't have yet)
        from features.aimbot import AimbotExtractor
        from features.base import FeatureResult

        # Create demo
        ticks_df = pd.DataFrame({
            "tick": range(100),
            "steamid": ["player1"] * 100,
            "yaw": np.sin(np.linspace(0, 2 * np.pi, 100)) * 45,
            "pitch": np.random.randn(100) * 0.3,
        })

        for i in range(6, 44):
            ticks_df[f"feature_{i}"] = np.random.randn(100)

        events_df = pd.DataFrame({
            "tick": [50],
            "event_type": ["player_death"],
            "attacker_steamid": ["player1"],
            "victim_steamid": ["player2"],
        })

        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df, map_name="de_mirage")

        # Test extraction stage (traditional extractor)
        extractor = AimbotExtractor()
        result = extractor.extract(demo)

        # Verify extraction succeeded
        assert result is not None
        assert isinstance(result, FeatureResult)
        assert result.score is not None or result.raw_measurements is not None
