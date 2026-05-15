"""Tests for BhopExtractor."""

import pytest

from features.base import FeatureExtractionError
from features.bhop import BhopExtractor


def test_bhop_extractor_initialization():
    """Test that BhopExtractor can be instantiated."""
    extractor = BhopExtractor()
    assert extractor is not None


def test_bhop_extractor_with_valid_demo(sample_parsed_demo):
    """Test BhopExtractor with valid demo data."""
    extractor = BhopExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert result.score is not None
    assert 0.0 <= result.score <= 1.0
    assert "total_jumps" in result.raw_measurements
    assert "timing_consistency_cv" in result.raw_measurements
    assert "perfect_jump_ratio" in result.raw_measurements
    assert "max_sequence_length" in result.raw_measurements
    assert result.metadata["method"] == "bhop_timing_sequence_sigmoid"


def test_bhop_extractor_insufficient_jumps(minimal_parsed_demo):
    """Test that BhopExtractor raises error with insufficient jumps."""
    extractor = BhopExtractor()
    # minimal_parsed_demo has no jump events
    with pytest.raises(FeatureExtractionError, match="insufficient"):
        extractor.extract(minimal_parsed_demo)


def test_bhop_extractor_cv_threshold():
    """Test that CV threshold is set correctly."""
    extractor = BhopExtractor()
    assert extractor.CV_THRESHOLD == 0.2


def test_bhop_extractor_perfect_jump_ratio_threshold():
    """Test that perfect jump ratio threshold is set correctly."""
    extractor = BhopExtractor()
    assert extractor.PERFECT_JUMP_RATIO_THRESHOLD == 0.7


def test_bhop_extractor_sequence_length_threshold():
    """Test that sequence length threshold is set correctly."""
    extractor = BhopExtractor()
    assert extractor.SEQUENCE_LENGTH_THRESHOLD == 10


def test_bhop_extractor_perfect_jump_gap():
    """Test that perfect jump gap is set correctly."""
    extractor = BhopExtractor()
    assert extractor.PERFECT_JUMP_GAP_TICKS == 2


def test_bhop_extractor_raw_measurements_structure(sample_parsed_demo):
    """Test that raw measurements contain required fields."""
    extractor = BhopExtractor()
    result = extractor.extract(sample_parsed_demo)

    required_fields = [
        "total_jumps",
        "flight_times_ticks",
        "flight_time_mean",
        "flight_time_std",
        "timing_consistency_cv",
        "cv_threshold",
        "perfect_jump_ratio",
        "perfect_jump_threshold",
        "perfect_jump_count",
        "max_sequence_length",
        "sequence_threshold",
        "normalized_cv",
        "normalized_perfect",
        "normalized_sequence",
    ]

    for field in required_fields:
        assert field in result.raw_measurements


def test_bhop_extractor_metadata_structure(sample_parsed_demo):
    """Test that metadata contains required fields."""
    extractor = BhopExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert "method" in result.metadata
    assert "version" in result.metadata
    assert "warnings" in result.metadata


def test_bhop_extractor_score_combination(sample_parsed_demo):
    """Test that score is a combination of CV, perfect ratio, and sequence."""
    extractor = BhopExtractor()
    result = extractor.extract(sample_parsed_demo)

    # Score should be combination of three normalized values
    raw = result.raw_measurements
    expected_approx = (
        0.3 * raw["normalized_cv"]
        + 0.3 * raw["normalized_perfect"]
        + 0.4 * raw["normalized_sequence"]
    )

    assert abs(result.score - expected_approx) < 0.01
