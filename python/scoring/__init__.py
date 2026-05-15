"""Scoring module: combines feature scores into suspicion verdicts."""

from .weighted_scorer import WeightedScorer, ScoringSummary

__all__ = ["WeightedScorer", "ScoringSummary"]
