"""Tests for RecoilExtractor."""

import pytest

from features.base import FeatureExtractionError
from features.recoil import RecoilExtractor


def test_recoil_extractor_initialization():
    """Test that RecoilExtractor loads patterns on initialization."""
    extractor = RecoilExtractor()
    # Should load patterns from data/recoil_patterns/
    assert hasattr(extractor, "patterns")
    assert isinstance(extractor.patterns, dict)


def test_recoil_extractor_with_valid_demo(sample_parsed_demo):
    """Test RecoilExtractor with valid demo data."""
    extractor = RecoilExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert result.score is not None
    assert 0.0 <= result.score <= 1.0
    assert "sprays_detected" in result.raw_measurements
    assert "mean_correlation" in result.raw_measurements
    assert "consistency_variance" in result.raw_measurements
    assert result.metadata["method"] == "recoil_correlation_sigmoid"


def test_recoil_extractor_insufficient_sprays(minimal_parsed_demo):
    """Test that RecoilExtractor raises error with insufficient sprays."""
    extractor = RecoilExtractor()
    # minimal_parsed_demo has only 1 weapon_fire event
    with pytest.raises(FeatureExtractionError, match="insufficient"):
        extractor.extract(minimal_parsed_demo)


def test_recoil_extractor_spray_window_limit():
    """Test that spray window respects the 50-tick limit."""
    extractor = RecoilExtractor()
    assert extractor.SPRAY_WINDOW_MAX_TICKS == 50


def test_recoil_extractor_correlation_threshold():
    """Test that correlation threshold is set correctly."""
    extractor = RecoilExtractor()
    assert extractor.CORRELATION_THRESHOLD == 0.7


def test_recoil_extractor_consistency_variance_threshold():
    """Test that consistency variance threshold is set correctly."""
    extractor = RecoilExtractor()
    assert extractor.CONSISTENCY_VARIANCE_THRESHOLD == 0.1


def test_recoil_extractor_raw_measurements_structure(sample_parsed_demo):
    """Test that raw measurements contain required fields."""
    extractor = RecoilExtractor()
    result = extractor.extract(sample_parsed_demo)

    required_fields = [
        "sprays_detected",
        "spray_window_max_ticks",
        "mean_correlation",
        "correlation_values",
        "correlation_threshold",
        "consistency_variance",
        "consistency_normalized",
        "weapons_used",
        "sensitivity_px_per_deg",
    ]

    for field in required_fields:
        assert field in result.raw_measurements


def test_recoil_extractor_metadata_structure(sample_parsed_demo):
    """Test that metadata contains required fields."""
    extractor = RecoilExtractor()
    result = extractor.extract(sample_parsed_demo)

    assert "method" in result.metadata
    assert "version" in result.metadata
    assert "patterns_loaded" in result.metadata
    assert "correlation_formula" in result.metadata
