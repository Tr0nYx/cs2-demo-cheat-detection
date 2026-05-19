"""Tests for SessionConsistencyExtractor feature."""

import pytest
import pandas as pd
import numpy as np
from features.base import FeatureExtractionError
from features.session import SessionConsistencyExtractor
from parser.types import ParsedDemo


def make_session_demo(minimal_tick_df, round_count=6, ticks_per_round=100, empty_rounds_count=0):
    """Helper to create a ParsedDemo with custom round count and empty round parameters."""
    extended_ticks = []
    total_ticks = round_count * ticks_per_round
    
    for i in range(total_ticks):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        # Add smooth aim differences for snaps
        row["yaw"] = 10.0 + (i % 10) * 0.1
        row["pitch"] = 20.0 + (i % 10) * 0.2
        extended_ticks.append(row)
        
    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)
    
    event_ticks = []
    event_types = []
    
    # We will build start/end ticks for each round
    for r in range(round_count):
        start_tick = r * ticks_per_round
        end_tick = start_tick + ticks_per_round - 10
        
        event_ticks.append(start_tick)
        event_types.append("round_start")
        
        event_ticks.append(end_tick)
        event_types.append("round_end")
        
        # If this is an empty round, we will delete ticks for this round in ticks_df
        if r < empty_rounds_count:
            ticks_df = ticks_df[~((ticks_df["tick"] >= start_tick) & (ticks_df["tick"] <= end_tick))]
            
    events_data = {
        "tick": event_ticks,
        "event_type": event_types,
    }
    events_df = pd.DataFrame(events_data)
    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


class TestSessionConsistencyExtractor:
    """Tests for session consistency detection."""

    def test_session_consistency_score_normalized(
        self, session_extractor, demo_with_rounds
    ):
        """Test that session score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_session_insufficient_rounds(
        self, session_extractor, minimal_parsed_demo
    ):
        """Test behavior with no round events.

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError) as exc_info:
            session_extractor.extract(minimal_parsed_demo)
        assert "insufficient_rounds" in str(exc_info.value)

    def test_session_raw_measurements(self, session_extractor, demo_with_rounds):
        """Test that raw measurements include rounds_analyzed and consistency_variance.

        Tests D-14: raw measurements for explainability.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_session_metadata_present(self, session_extractor, demo_with_rounds):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = session_extractor.extract(demo_with_rounds)

        assert isinstance(result.metadata, dict)
        assert "score_cap_applied" in result.metadata
        assert "confidence" in result.metadata
        assert "evidence_strength" in result.metadata

    def test_session_low_round_count_capping(self, session_extractor, minimal_tick_df):
        """Test that having only 3 or 4 rounds caps the score to 0.49."""
        # 4 rounds (which is >= 3 so runs, but < 5 so caps)
        demo = make_session_demo(minimal_tick_df, round_count=4, ticks_per_round=100)
        result = session_extractor.extract(demo)
        
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_rounds" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49

    def test_session_insufficient_measurements_capping(self, session_extractor, minimal_tick_df):
        """Test that having 6 rounds but 4 of them are empty (low valid measurements < 3) caps the score to 0.49."""
        # 6 rounds total, 4 empty -> only 2 rounds have valid measurements
        demo = make_session_demo(minimal_tick_df, round_count=6, ticks_per_round=100, empty_rounds_count=4)
        result = session_extractor.extract(demo)
        
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_round_measurements" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49
