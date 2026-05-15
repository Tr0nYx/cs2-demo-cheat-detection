"""Tests for SessionConsistencyExtractor."""

import pytest

from features.base import FeatureExtractionError
from features.session import SessionConsistencyExtractor


def test_session_extractor_initialization():
    """Test that SessionConsistencyExtractor can be instantiated."""
    extractor = SessionConsistencyExtractor()
    assert extractor is not None


def test_session_extractor_with_valid_demo(sample_parsed_demo):
    """Test SessionConsistencyExtractor with valid demo data."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert result.score is not None
    assert 0.0 <= result.score <= 1.0
    assert "rounds_analyzed" in result.raw_measurements
    assert "per_round_scores" in result.raw_measurements
    assert "consistency_variance" in result.raw_measurements
    assert "warmup_trend_correlation" in result.raw_measurements
    assert result.metadata["method"] == "session_variance_warmup_sigmoid"


def test_session_extractor_insufficient_rounds(minimal_parsed_demo):
    """Test that SessionConsistencyExtractor raises error with insufficient rounds."""
    extractor = SessionConsistencyExtractor()
    # minimal_parsed_demo has only 2 complete rounds
    with pytest.raises(FeatureExtractionError, match="insufficient"):
        extractor.extract(minimal_parsed_demo)


def test_session_extractor_variance_threshold():
    """Test that variance threshold is set correctly."""
    extractor = SessionConsistencyExtractor()
    assert extractor.CONSISTENCY_VARIANCE_THRESHOLD == 0.05


def test_session_extractor_warmup_trend_threshold():
    """Test that warmup trend threshold is set correctly."""
    extractor = SessionConsistencyExtractor()
    assert extractor.WARMUP_TREND_THRESHOLD == 0.0


def test_session_extractor_raw_measurements_structure(sample_parsed_demo):
    """Test that raw measurements contain required fields."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    required_fields = [
        "rounds_analyzed",
        "per_round_scores",
        "consistency_variance",
        "variance_threshold",
        "consistency_normalized",
        "warmup_trend_correlation",
        "warmup_trend_threshold",
        "warmup_trend_normalized",
        "round_numbers",
    ]

    for field in required_fields:
        assert field in result.raw_measurements


def test_session_extractor_metadata_structure(sample_parsed_demo):
    """Test that metadata contains required fields."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert "method" in result.metadata
    assert "version" in result.metadata
    assert "warnings" in result.metadata


def test_session_extractor_per_round_scores(sample_parsed_demo):
    """Test that per-round scores are computed."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    per_round_scores = result.raw_measurements["per_round_scores"]
    assert len(per_round_scores) > 0
    assert all(0.0 <= score <= 1.0 for score in per_round_scores)


def test_session_extractor_score_combination(sample_parsed_demo):
    """Test that score is a combination of consistency and warmup."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    raw = result.raw_measurements
    expected_approx = (
        0.6 * raw["consistency_normalized"]
        + 0.4 * raw["warmup_trend_normalized"]
    )

    assert abs(result.score - expected_approx) < 0.01


def test_session_extractor_round_count(sample_parsed_demo):
    """Test that round count is correctly recorded."""
    extractor = SessionConsistencyExtractor()
    result = extractor.extract(sample_parsed_demo)

    rounds_analyzed = result.raw_measurements["rounds_analyzed"]
    assert rounds_analyzed >= 3
    assert len(result.raw_measurements["per_round_scores"]) == rounds_analyzed
