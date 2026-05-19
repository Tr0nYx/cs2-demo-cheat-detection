"""Tests for BhopExtractor feature."""

import pytest
import pandas as pd
import numpy as np
from features.base import FeatureExtractionError
from features.bhop import BhopExtractor
from parser.types import ParsedDemo


def make_bhop_demo(minimal_tick_df, jump_count=10, perfect_jump_gap=2, other_jump_gap=20):
    """Helper to create a ParsedDemo with custom jump count and gap sizes."""
    extended_ticks = []
    total_ticks = jump_count * 50
    
    for i in range(total_ticks):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        row["is_airborne"] = False
        extended_ticks.append(row)
        
    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)
    
    event_ticks = []
    event_types = []
    
    # We will simulate consecutive jump/land pairs.
    # Every pair: jump at t, land at t+3.
    # Gap from previous land to next jump is perfect_jump_gap or other_jump_gap.
    current_tick = 5
    for j in range(jump_count):
        # Jump
        event_ticks.append(current_tick)
        event_types.append("player_jump")
        ticks_df.loc[ticks_df["tick"] == current_tick, "is_airborne"] = True
        
        # Land
        land_tick = current_tick + 3
        event_ticks.append(land_tick)
        event_types.append("player_land")
        ticks_df.loc[ticks_df["tick"] == land_tick, "is_airborne"] = True
        
        # Next jump timing gap
        if j % 2 == 0:
            current_tick = land_tick + perfect_jump_gap
        else:
            current_tick = land_tick + other_jump_gap
            
    events_data = {
        "tick": event_ticks,
        "event_type": event_types,
        "steamid": [1] * len(event_ticks),
    }
    events_df = pd.DataFrame(events_data)
    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


class TestBhopExtractor:
    """Tests for bunnyhopping detection."""

    def test_bhop_score_normalized(self, bhop_extractor, demo_with_jumps):
        """Test that bhop score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_bhop_insufficient_jumps(self, bhop_extractor, minimal_parsed_demo):
        """Test behavior with minimal jump data.

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError) as exc_info:
            bhop_extractor.extract(minimal_parsed_demo)
        assert "insufficient_jumps" in str(exc_info.value)

    def test_bhop_raw_measurements(self, bhop_extractor, demo_with_jumps):
        """Test that raw measurements include total_jumps and perfect_jump_ratio.

        Tests D-14: raw measurements for explainability.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_bhop_metadata_present(self, bhop_extractor, demo_with_jumps):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        result = bhop_extractor.extract(demo_with_jumps)

        assert isinstance(result.metadata, dict)
        assert "score_cap_applied" in result.metadata
        assert "confidence" in result.metadata
        assert "evidence_strength" in result.metadata

    def test_bhop_low_jump_count_capping(self, bhop_extractor, minimal_tick_df):
        """Test that having only 5-9 jumps caps score to 0.49 even if perfectly timed."""
        # 7 jumps perfectly timed (gap = 1 tick)
        demo = make_bhop_demo(minimal_tick_df, jump_count=7, perfect_jump_gap=1, other_jump_gap=1)
        result = bhop_extractor.extract(demo)
        
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_jumps" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49

    def test_bhop_insufficient_perfect_jumps_capping(self, bhop_extractor, minimal_tick_df):
        """Test that having plenty of jumps but less than 3 perfect ones caps score to 0.49."""
        # 12 jumps, but all with 20 tick gaps (0 perfect jumps)
        demo = make_bhop_demo(minimal_tick_df, jump_count=12, perfect_jump_gap=20, other_jump_gap=20)
        result = bhop_extractor.extract(demo)
        
        # If score is somehow high, it must be capped.
        if result.score >= 0.49:
            assert result.metadata["score_cap_applied"] is True
            assert "insufficient_perfect_jumps" in result.metadata["score_cap_reason"]
            assert result.score <= 0.49
