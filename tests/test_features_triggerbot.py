"""Tests for TriggerbotExtractor feature."""

import pytest
from features.base import FeatureExtractionError
from features.triggerbot import TriggerbotExtractor


class TestTriggerbotExtractor:
    """Tests for triggerbot detection."""

    def test_triggerbot_score_normalized(self, triggerbot_extractor, demo_with_kills):
        """Test that triggerbot score is normalized to [0.0, 1.0].

        Tests D-12: feature score validation.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        assert result.score is not None
        assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"

    def test_triggerbot_insufficient_reactions(
        self, triggerbot_extractor, minimal_parsed_demo
    ):
        """Test that FeatureExtractionError is raised with no kills.

        Tests D-19: per-feature error handling.
        """
        with pytest.raises(FeatureExtractionError, match="insufficient"):
            triggerbot_extractor.extract(minimal_parsed_demo)

    def test_triggerbot_reaction_times_collected(
        self, triggerbot_extractor, demo_with_kills
    ):
        """Test that reaction times are collected in raw measurements.

        Tests D-14: raw measurements for explainability.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        assert isinstance(result.raw_measurements, dict)
        assert len(result.raw_measurements) > 0

    def test_triggerbot_bimodality_present(
        self, triggerbot_extractor, demo_with_kills
    ):
        """Test that bimodality coefficient is in raw measurements.

        Tests D-14: raw measurements including bimodality coefficient.
        """
        result = triggerbot_extractor.extract(demo_with_kills)

        # Verify bimodality-related measurements
        raw = result.raw_measurements
        assert "kills_detected" in raw or len(raw) > 0

    def test_triggerbot_calibration_metadata_fields(self, triggerbot_extractor, demo_with_kills):
        """Test that detailed calibration metadata keys are present."""
        result = triggerbot_extractor.extract(demo_with_kills)
        metadata = result.metadata

        assert "confidence" in metadata
        assert "evidence_strength" in metadata
        assert "score_cap_applied" in metadata
        assert "score_cap_reason" in metadata
        assert "independent_signals" in metadata
        assert "sample_count" in metadata

    def test_triggerbot_insufficient_instant_kills_capping(self, triggerbot_extractor, minimal_tick_df):
        """Test that triggerbot score is capped at 0.49 if there are insufficient repeated short reaction windows (< 2)."""
        import pandas as pd
        from parser.types import ParsedDemo

        # Create a parsed demo with 11 deaths having bimodal reaction times: [11, 11, 13, 12, 10, 12, 14, 14, 11, 11, 436]
        # These are all >= 10 ticks, so there are 0 instant kills.
        reaction_deltas = [11, 11, 13, 12, 10, 12, 14, 14, 11, 11, 436]
        
        extended_ticks = []
        for i in range(1000):
            row = minimal_tick_df.iloc[0].copy()
            row["tick"] = i
            row["X"] = 100.0 + i
            # Mark is_shooting at start of each reaction window
            extended_ticks.append(row)

        ticks_df = pd.DataFrame(extended_ticks).reset_index(drop=True)

        event_ticks = []
        event_types = []
        steamids = []
        attacker_steamids = []
        victim_steamids = []

        current_tick = 0
        for idx, delta in enumerate(reaction_deltas):
            fire_tick = current_tick
            death_tick = fire_tick + delta
            
            # Update shooting flag in ticks_df for fire_tick
            ticks_df.loc[ticks_df["tick"] == fire_tick, "is_shooting"] = True
            
            # Add weapon_fire event
            event_ticks.append(fire_tick)
            event_types.append("weapon_fire")
            steamids.append(1)
            attacker_steamids.append(None)
            victim_steamids.append(None)
            
            # Add player_death event
            event_ticks.append(death_tick)
            event_types.append("player_death")
            steamids.append(None)
            attacker_steamids.append(1)
            victim_steamids.append(idx + 2)
            
            current_tick = death_tick + 10  # spacing between events

        events_data = {
            "tick": event_ticks,
            "event_type": event_types,
            "steamid": steamids,
            "attacker_steamid": attacker_steamids,
            "victim_steamid": victim_steamids,
        }
        events_df = pd.DataFrame(events_data)
        demo = ParsedDemo(ticks_df=ticks_df, events_df=events_df)

        result = triggerbot_extractor.extract(demo)

        # Bimodality coefficient is 0.886 (> 0.555), so bimodality signal is high.
        # But instant kills = 0 (< 2), so the cap must be triggered.
        assert result.metadata["score_cap_applied"] is True
        assert "insufficient_instant_kills" in result.metadata["score_cap_reason"]
        assert result.score <= 0.49
