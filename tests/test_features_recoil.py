"""Tests for RecoilExtractor feature."""

import pytest
import pandas as pd
import numpy as np
from features.base import FeatureExtractionError
from features.recoil import RecoilExtractor
from parser.types import ParsedDemo


def make_recoil_demo(minimal_tick_df, spray_count=10, weapon_name="AK-47", spray_length=5):
    """Helper to create a ParsedDemo with a specified number of sprays and weapon."""
    extended_ticks = []
    total_ticks = spray_count * 50
    
    for i in range(total_ticks):
        row = minimal_tick_df.iloc[0].copy()
        row["tick"] = i
        row["X"] = 100.0 + i
        # Simulate smooth changes for correlation
        row["yaw"] = 10.0 + (i % spray_length) * 0.1
        row["pitch"] = 20.0 + (i % spray_length) * 0.2
        row["is_shooting"] = False
        row["velocity_x"] = 0.0
        row["velocity_y"] = 0.0
        extended_ticks.append(row)
        
    ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)
    
    event_ticks = []
    event_types = []
    steamids = []
    attacker_steamids = []
    victim_steamids = []
    weapon_names = []
    
    for s in range(spray_count):
        fire_tick = s * 50 + 5
        # Set is_shooting to True for spray_length ticks starting at fire_tick
        ticks_df.loc[(ticks_df["tick"] >= fire_tick) & (ticks_df["tick"] < fire_tick + spray_length), "is_shooting"] = True
            
        event_ticks.append(fire_tick)
        event_types.append("weapon_fire")
        steamids.append(1)
        attacker_steamids.append(None)
        victim_steamids.append(None)
        weapon_names.append(weapon_name)
        
    events_data = {
        "tick": event_ticks,
        "event_type": event_types,
        "steamid": steamids,
        "attacker_steamid": attacker_steamids,
        "victim_steamid": victim_steamids,
        "weapon_name": weapon_names,
    }
    events_df = pd.DataFrame(events_data)
    return ParsedDemo(ticks_df=ticks_df, events_df=events_df)


class TestRecoilExtractor:
    """Tests for recoil compensation detection."""

    def test_recoil_score_normalized(self, recoil_extractor, minimal_tick_df):
        """Test that recoil score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        demo = make_recoil_demo(minimal_tick_df, spray_count=10, weapon_name="AK-47")
        result = recoil_extractor.extract(demo)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_recoil_patterns_loaded(self, recoil_extractor):
        """Test that recoil patterns are loaded at initialization.

        Tests D-35, D-36: recoil patterns loaded from filesystem.
        """
        assert isinstance(recoil_extractor.patterns, dict)
        assert len(recoil_extractor.patterns) > 0

    def test_recoil_insufficient_sprays(self, recoil_extractor, minimal_parsed_demo):
        """Test behavior with minimal data (fewer than 10 fire events).

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError) as exc_info:
            recoil_extractor.extract(minimal_parsed_demo)
        assert "insufficient_sprays" in str(exc_info.value)

    def test_recoil_metadata_present(self, recoil_extractor, minimal_tick_df):
        """Test that metadata dict is populated.

        Tests D-07: metadata field in FeatureResult.
        """
        demo = make_recoil_demo(minimal_tick_df, spray_count=10, weapon_name="AK-47")
        result = recoil_extractor.extract(demo)

        assert isinstance(result.metadata, dict)
        assert "score_cap_applied" in result.metadata
        assert "score_cap_reason" in result.metadata
        assert "confidence" in result.metadata
        assert "evidence_strength" in result.metadata

    def test_recoil_unknown_weapon_capping(self, recoil_extractor, minimal_tick_df):
        """Test that unknown weapon data caps recoil score to 0.49."""
        demo = make_recoil_demo(minimal_tick_df, spray_count=10, weapon_name="unknown")
        result = recoil_extractor.extract(demo)

        assert result.metadata["score_cap_applied"] is True
        assert "unknown_weapon" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49

    def test_recoil_insufficient_sprays_capping(self, recoil_extractor, minimal_tick_df):
        """Test that low spray count (e.g. 7 sprays, which is >= 5 but < 8) caps score to 0.49 if score is high."""
        # Create a highly correlated mock spray but with low count (7)
        # Note: RecoilExtractor requires len(fire_events) >= 10, but we can have some fire events
        # where we don't extract valid spray sequences (spray_sequences count < 8).
        # To do this, let's create 10 fire events, but only 7 have is_shooting = True (so spray_sequences length is 7).
        extended_ticks = []
        for i in range(500):
            row = minimal_tick_df.iloc[0].copy()
            row["tick"] = i
            row["X"] = 100.0 + i
            row["yaw"] = 10.0 + (i % 5) * 0.1
            row["pitch"] = 20.0 + (i % 5) * 0.2
            row["is_shooting"] = False
            extended_ticks.append(row)
            
        ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)
        
        event_ticks = []
        event_types = []
        steamids = []
        attacker_steamids = []
        victim_steamids = []
        weapon_names = []
        
        for s in range(10):
            fire_tick = s * 50 + 5
            # Only set is_shooting = True for the first 7 fire events
            if s < 7:
                ticks_df.loc[(ticks_df["tick"] >= fire_tick) & (ticks_df["tick"] < fire_tick + 5), "is_shooting"] = True
                
            event_ticks.append(fire_tick)
            event_types.append("weapon_fire")
            steamids.append(1)
            attacker_steamids.append(None)
            victim_steamids.append(None)
            weapon_names.append("AK-47")
            
        events_data = {
            "tick": event_ticks,
            "event_type": event_types,
            "steamid": steamids,
            "attacker_steamid": attacker_steamids,
            "victim_steamid": victim_steamids,
            "weapon_name": weapon_names,
        }
        events_df = pd.DataFrame(events_data)
        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df)
        
        result = recoil_extractor.extract(demo)
        
        # If score is naturally >= 0.49, it should be capped to 0.49 due to insufficient sprays
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_sprays" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49

    def test_recoil_no_patterns_capping(self, recoil_extractor, minimal_tick_df):
        """Test that missing patterns disables recoil scoring and caps score to 0.0."""
        # Backup original patterns
        original_patterns = recoil_extractor.patterns
        recoil_extractor.patterns = {}
        
        try:
            demo = make_recoil_demo(minimal_tick_df, spray_count=10, weapon_name="AK-47")
            result = recoil_extractor.extract(demo)
            
            assert result.metadata["score_cap_applied"] is True
            assert result.metadata["score_cap_reason"] == "no_recoil_patterns_loaded"
            assert result.score == 0.0
        finally:
            # Restore original patterns
            recoil_extractor.patterns = original_patterns
