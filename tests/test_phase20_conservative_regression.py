"""Regression tests for Phase 20 conservative scoring and calibration behavior.

Ensures that weak proxy features, low-sample signals, and single features without
robust corroboration do not trigger blanket 'likely_cheating' labels across multiple
players. Also validates the exceptional single feature and multiple strong feature cases.
"""

import os
import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock

from parser.types import ParsedDemo
from features.base import FeatureResult
from scoring.weighted_scorer import WeightedScorer
from features.aimbot import AimbotExtractor
from features.wallhack import WallhackExtractor
from features.triggerbot import TriggerbotExtractor
from features.recoil import RecoilExtractor
from features.bhop import BhopExtractor
from features.session import SessionConsistencyExtractor


class TestPhase20ConservativeRegression:
    """Regression test suite for Phase 20 pipeline calibration and guardrails."""

    @pytest.fixture
    def scorer(self) -> WeightedScorer:
        """Weighted scorer instance."""
        return WeightedScorer()

    def test_phase20_conservative_behavior_weak_evidence_across_players(self, scorer):
        """Verify that weak proxy signals across multiple players do not inflate to 'likely_cheating'.

        Specifically tests that proxy-only or low-sample feature outputs are capped
        and their overall suspicion score stays below the 0.7 likely_cheating threshold.
        """
        # Scenario A: Player with pre-aim/sound wallhack proxy but no visual alignment
        player1_results = {
            "AimbotExtractor": FeatureResult(
                score=0.3,
                raw_measurements={},
                metadata={"confidence": "medium", "evidence_strength": "weak", "independent_signals": []}
            ),
            "WallhackExtractor": FeatureResult(
                score=0.49,  # Capped because visual_alignment was not present
                raw_measurements={},
                metadata={
                    "confidence": "medium",
                    "evidence_strength": "medium",
                    "score_cap_applied": True,
                    "score_cap_reason": "proxy_only_no_visual_confirmation",
                    "independent_signals": ["pre_aim", "sound_timeline"]
                }
            ),
            "TriggerbotExtractor": FeatureResult(
                score=0.2,
                raw_measurements={},
                metadata={"confidence": "medium", "evidence_strength": "weak"}
            ),
            "RecoilExtractor": FeatureResult(
                score=0.1,
                raw_measurements={},
                metadata={"confidence": "high", "evidence_strength": "weak"}
            ),
            "BhopExtractor": FeatureResult(
                score=0.15,
                raw_measurements={},
                metadata={"confidence": "high", "evidence_strength": "weak"}
            ),
            "SessionConsistencyExtractor": FeatureResult(
                score=0.2,
                raw_measurements={},
                metadata={"confidence": "high", "evidence_strength": "weak"}
            ),
        }

        p1_summary = scorer.score(player1_results)
        assert p1_summary.label in ["clean", "suspicious"]
        assert p1_summary.overall_score < 0.7
        assert p1_summary.label != "likely_cheating"

        # Scenario B: Player with high aimbot score but capped due to single signal (snap only) and low kill windows
        player2_results = {
            "AimbotExtractor": FeatureResult(
                score=0.49,  # Capped because < 2 kill windows or < 2 independent signals
                raw_measurements={},
                metadata={
                    "confidence": "low",
                    "evidence_strength": "weak",
                    "score_cap_applied": True,
                    "score_cap_reason": "insufficient_kill_windows",
                    "independent_signals": ["snap"]
                }
            ),
            "WallhackExtractor": FeatureResult(
                score=0.2,
                raw_measurements={},
                metadata={"confidence": "medium", "evidence_strength": "weak"}
            ),
            "TriggerbotExtractor": FeatureResult(
                score=0.1,
                raw_measurements={},
                metadata={"confidence": "medium", "evidence_strength": "weak"}
            ),
            "RecoilExtractor": FeatureResult(
                score=0.15,
                raw_measurements={},
                metadata={"confidence": "medium", "evidence_strength": "weak"}
            ),
            "BhopExtractor": FeatureResult(
                score=0.1,
                raw_measurements={},
                metadata={"confidence": "high", "evidence_strength": "weak"}
            ),
            "SessionConsistencyExtractor": FeatureResult(
                score=0.25,
                raw_measurements={},
                metadata={"confidence": "high", "evidence_strength": "weak"}
            ),
        }

        p2_summary = scorer.score(player2_results)
        assert p2_summary.label in ["clean", "suspicious"]
        assert p2_summary.overall_score < 0.7
        assert p2_summary.label != "likely_cheating"

    def test_phase20_conservative_behavior_multiple_strong_features(self, scorer):
        """Verify that multiple strong, corroborated feature families successfully trigger 'likely_cheating'."""
        player_results = {
            "AimbotExtractor": FeatureResult(
                score=0.85,
                raw_measurements={},
                metadata={
                    "confidence": "high",
                    "evidence_strength": "strong",
                    "independent_signals": ["snap", "velocity"]
                }
            ),
            "WallhackExtractor": FeatureResult(
                score=0.75,
                raw_measurements={},
                metadata={
                    "confidence": "high",
                    "evidence_strength": "strong",
                    "independent_signals": ["pre_aim", "visual_alignment"]
                }
            ),
            "TriggerbotExtractor": None,
            "RecoilExtractor": None,
            "BhopExtractor": None,
            "SessionConsistencyExtractor": None,
        }

        summary = scorer.score(player_results)
        assert summary.label == "likely_cheating"
        assert summary.overall_score >= 0.7

    def test_phase20_conservative_behavior_exceptional_single_feature(self, scorer):
        """Verify that a single exceptional, high-confidence score can trigger 'likely_cheating'.

        Requires score >= 0.9, evidence_strength='strong', confidence='high'.
        """
        # A. Satisfies exceptional criteria
        exceptional_results = {
            "AimbotExtractor": FeatureResult(
                score=0.92,
                raw_measurements={},
                metadata={
                    "confidence": "high",
                    "evidence_strength": "strong",
                    "independent_signals": ["snap", "velocity", "jerk"]
                }
            ),
            "WallhackExtractor": None,
            "TriggerbotExtractor": None,
            "RecoilExtractor": None,
            "BhopExtractor": None,
            "SessionConsistencyExtractor": None,
        }

        summary = scorer.score(exceptional_results)
        assert summary.label == "likely_cheating"
        assert summary.overall_score >= 0.7

        # B. High score but lacking strong/high metadata (capped)
        non_exceptional_results = {
            "AimbotExtractor": FeatureResult(
                score=0.92,
                raw_measurements={},
                metadata={
                    "confidence": "medium",
                    "evidence_strength": "medium",  # Lacks "strong"
                    "independent_signals": ["snap"]
                }
            ),
            "WallhackExtractor": None,
            "TriggerbotExtractor": None,
            "RecoilExtractor": None,
            "BhopExtractor": None,
            "SessionConsistencyExtractor": None,
        }

        summary2 = scorer.score(non_exceptional_results)
        assert summary2.label == "suspicious"
        assert summary2.overall_score < 0.7

    def test_phase20_conservative_behavior_problem_demo_replay_instructions(self):
        """Documented local replay check for the known problematic demo.

        Demo ID: `019e3a28-60a6-7c96-99c8-34ddd3231268`
        This test remains safe for CI by not failing if the demo is absent,
        but provides developer-facing execution and verification paths.
        """
        demo_id = "019e3a28-60a6-7c96-99c8-34ddd3231268"
        demo_filename = f"{demo_id}.dem"
        possible_paths = [
            demo_filename,
            os.path.join("data", "demos", demo_filename),
            os.path.join("tests", "fixtures", demo_filename),
        ]

        found_path = None
        for p in possible_paths:
            if os.path.exists(p):
                found_path = p
                break

        print("\n=== Phase 20 Local Verification Instructions ===")
        print(f"Problem Demo ID: {demo_id}")
        print("To verify this demo locally, ensure the demo is downloaded and run:")
        print(f"  $env:PYTHONPATH='python'; python python/worker.py --demo-id {demo_id}")
        print("Expected results after Phase 20 calibration:")
        print("  1. No 'steam_id = 0' records are populated as players in player slices.")
        print("  2. Weak or low-sample players are capped below 0.7 overall suspicion.")
        print("=================================================")

        if found_path:
            # If the demo is present locally, let's run a basic structural assertion on it.
            # (Note: In standard CI environments, the file will be absent, so this block is skipped).
            from parser.adapter import DemoParserAdapter
            adapter = DemoParserAdapter()
            parsed = adapter.parse_demo(found_path)
            
            # Assert no steam_id = 0 players are present
            unique_steam_ids = parsed.ticks_df["steamid"].unique()
            assert 0 not in unique_steam_ids, "Should not parse player actions with steamid 0"
            print(f"Verified local demo file {found_path}: successfully loaded and verified 'steamid != 0' players.")
        else:
            print(f"Local demo file {demo_filename} not found. Skipping active parsing (CI Mode).")
