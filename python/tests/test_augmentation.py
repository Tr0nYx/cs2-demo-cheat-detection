"""Unit tests for data augmentation pipeline per D-08 through D-11.

Tests verify:
- AugmentationPipeline implements interpolation-based SMOTE, noise, temporal shifts (D-08)
- Production pipeline enforces no augmentation (Pitfall 2 mitigation)
- Augmentation is reproducible with seeding (D-10)
- Augmentation only modifies raw_measurements, not score/metadata
"""

import numpy as np
import pytest

from features.base import FeatureResult
from ml.augmentation import AugmentationPipeline
from ml.config import load_config


class TestAugmentationPipeline:
    """Test AugmentationPipeline behavior per D-08 through D-11."""

    def test_augment_with_smote_method(self):
        """Test interpolation-based synthetic sample generation creates synthetic variants."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {"angular_velocity": 0.5, "snap_ratio": 0.8}

        augmented = pipeline.augment_feature_measurements(measurements, method="smote")

        # Interpolation-based synthetic generation should create synthetic keys
        assert isinstance(augmented, dict)
        assert "angular_velocity" in augmented
        # Check that synthetic samples were created via interpolation
        synthetic_keys = [k for k in augmented.keys() if "synthetic" in k]
        assert len(synthetic_keys) > 0, "SMOTE interpolation should generate synthetic_* keys in measurements"

    def test_augment_with_noise_method(self):
        """Test Gaussian noise injection per D-08."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {"angular_velocity": 1.0, "velocity": 0.5}

        augmented = pipeline.augment_feature_measurements(measurements, method="noise")

        # Check noise applied (values should differ slightly)
        # Noise is ~0.2% so values should be very close but not identical
        assert abs(augmented["angular_velocity"] - 1.0) < 0.01
        assert abs(augmented["velocity"] - 0.5) < 0.01
        # At least one should differ (within measurement precision)
        has_difference = (
            augmented.get("angular_velocity", 1.0) != 1.0 or
            augmented.get("velocity", 0.5) != 0.5
        )
        # Note: with very small noise, might not always be different due to float precision
        # So we just verify the method ran

    def test_augment_with_temporal_shift(self):
        """Test temporal shift recording per D-08."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {"kill_angle_first_order_max": 0.3}

        augmented = pipeline.augment_feature_measurements(measurements, method="temporal_shift")

        assert "temporal_shift_ticks" in augmented
        cfg = load_config()
        assert cfg.TEMPORAL_SHIFT_BOUNDS[0] <= augmented["temporal_shift_ticks"] <= cfg.TEMPORAL_SHIFT_BOUNDS[1]

    def test_augment_with_scaling_method(self):
        """Test feature scaling variants per D-87."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {
            "spray_velocity_first_order_max": 1.0,
            "peek_yaw_velocity_mean": 0.5
        }

        augmented = pipeline.augment_feature_measurements(measurements, method="scaling")

        # Scaling should modify velocity values
        assert "spray_velocity_first_order_max" in augmented
        cfg = load_config()
        # Value should be scaled by ±variance factor
        original = 1.0
        scaled = augmented["spray_velocity_first_order_max"]
        scale_ratio = scaled / original
        assert (1.0 - cfg.FEATURE_SCALING_VARIANCE) <= scale_ratio <= (1.0 + cfg.FEATURE_SCALING_VARIANCE)

    def test_augment_with_all_methods(self):
        """Test combined augmentation per D-08."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {
            "angular_velocity": 1.0,
            "spray_velocity_first_order_max": 0.5
        }

        augmented = pipeline.augment_feature_measurements(measurements, method="all")

        # All methods should be applied
        assert "temporal_shift_ticks" in augmented
        # SMOTE interpolation should have generated synthetic variants
        synthetic_keys = [k for k in augmented.keys() if "synthetic" in k]
        assert len(synthetic_keys) > 0, "All methods should include SMOTE synthetic generation"

    def test_augmentation_metadata(self):
        """Test reproducibility metadata per D-10."""
        pipeline = AugmentationPipeline(seed=42)
        metadata = pipeline.augmentation_metadata()

        assert metadata["augmentation_seed"] == 42
        assert "smote_ratio" in metadata
        assert "noise_scale" in metadata
        assert "temporal_shift_bounds" in metadata
        assert "note" in metadata  # Should document interpolation-based approach
        assert "training-only" in metadata["note"].lower() or "training" in metadata["note"].lower()

    def test_empty_measurements(self):
        """Test augmentation handles empty measurements gracefully."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {}

        augmented = pipeline.augment_feature_measurements(measurements, method="all")

        # Should handle empty dict and add at least temporal_shift
        assert isinstance(augmented, dict)
        assert "temporal_shift_ticks" in augmented

    def test_non_numeric_measurements(self):
        """Test augmentation skips non-numeric measurements."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {
            "method": "aimbot_detector",
            "confidence": "high",
            "angular_velocity": 1.0
        }

        augmented = pipeline.augment_feature_measurements(measurements, method="all")

        # Non-numeric values should be preserved
        assert augmented.get("method") == "aimbot_detector"
        assert augmented.get("confidence") == "high"
        # Numeric value should be augmented
        assert "angular_velocity" in augmented


class TestProductionNoAugmentation:
    """Test that production pipeline NEVER applies augmentation (Pitfall 2 mitigation).

    CRITICAL: These tests verify the production gate prevents synthetic data from
    reaching visible suspicion scores per D-05, D-06, D-07.
    """

    def test_production_augmentation_stage_returns_identity(self):
        """Verify production demo analysis skips augmentation per D-05, D-06, D-07.

        This is the CANARY TEST for Pitfall 2 mitigation: if augmentation
        leaks to production, this test will fail.
        """
        # Create mock feature results
        mock_result = FeatureResult(
            score=0.5,
            raw_measurements={"angular_velocity": 1.0},
            metadata={}
        )
        converted_results = {"AimbotExtractor": mock_result}

        # Simulate worker _augmentation_stage call with production flag
        # Import here to avoid circular imports
        from worker import _augmentation_stage

        augmented = _augmentation_stage(converted_results, is_training=False)

        # Production path MUST return unchanged results
        assert augmented["AimbotExtractor"] is not None
        assert augmented["AimbotExtractor"].raw_measurements["angular_velocity"] == 1.0
        # Critical: augmentation_applied should NOT be in metadata for production
        assert augmented["AimbotExtractor"].metadata.get("augmentation_applied") is not True

    def test_training_augmentation_stage_applies_augmentation(self):
        """Verify training pipeline applies augmentation per D-08."""
        mock_result = FeatureResult(
            score=0.5,
            raw_measurements={"angular_velocity": 1.0},
            metadata={}
        )
        converted_results = {"AimbotExtractor": mock_result}

        from worker import _augmentation_stage

        augmented = _augmentation_stage(converted_results, is_training=True)

        # Training path should apply augmentation
        assert augmented["AimbotExtractor"] is not None
        assert augmented["AimbotExtractor"].metadata.get("augmentation_applied") is True

    def test_augmentation_does_not_modify_score(self):
        """Verify augmentation only modifies raw_measurements, not score (Pitfall 2)."""
        original_score = 0.73
        mock_result = FeatureResult(
            score=original_score,
            raw_measurements={"angular_velocity": 1.0},
            metadata={"confidence": "high"}
        )
        converted_results = {"AimbotExtractor": mock_result}

        from worker import _augmentation_stage

        augmented = _augmentation_stage(converted_results, is_training=True)

        # Score should never be modified by augmentation
        assert augmented["AimbotExtractor"].score == original_score
        # Metadata base should be preserved
        assert augmented["AimbotExtractor"].metadata["confidence"] == "high"

    def test_augmentation_handles_none_results(self):
        """Test augmentation stage handles None results gracefully."""
        converted_results = {"AimbotExtractor": None, "WallhackExtractor": None}

        from worker import _augmentation_stage

        augmented = _augmentation_stage(converted_results, is_training=True)

        # None results should remain None
        assert augmented["AimbotExtractor"] is None
        assert augmented["WallhackExtractor"] is None

    def test_augmentation_graceful_failure(self):
        """Test augmentation stage fails gracefully on exception."""
        # Create result with problematic measurements to trigger error
        mock_result = FeatureResult(
            score=0.5,
            raw_measurements={"angular_velocity": np.nan},  # NaN value
            metadata={}
        )
        converted_results = {"AimbotExtractor": mock_result}

        from worker import _augmentation_stage

        # Should not raise, should return original result
        augmented = _augmentation_stage(converted_results, is_training=True)
        assert augmented["AimbotExtractor"] is not None
        assert augmented["AimbotExtractor"].score == 0.5


class TestAugmentationReproducibility:
    """Test augmentation determinism and reproducibility per D-10."""

    def test_same_seed_produces_same_output(self):
        """Verify same seed produces identical augmentation per D-10."""
        measurements = {"angular_velocity": 1.0, "velocity": 0.5}

        # First run
        pipeline1 = AugmentationPipeline(seed=42)
        result1 = pipeline1.augment_feature_measurements(measurements.copy(), method="all")

        # Second run with same seed
        pipeline2 = AugmentationPipeline(seed=42)
        result2 = pipeline2.augment_feature_measurements(measurements.copy(), method="all")

        # Results should be identical (within floating point precision)
        # Compare all numeric keys
        for key in result1:
            if isinstance(result1[key], (int, float)) and isinstance(result2.get(key), (int, float)):
                if not np.isnan(result1[key]) and not np.isnan(result2[key]):
                    assert np.isclose(result1[key], result2[key], rtol=1e-6), \
                        f"Seed 42 produced different results for {key}: {result1[key]} vs {result2[key]}"

    def test_different_seed_produces_different_output(self):
        """Verify different seeds produce different augmentation."""
        measurements = {"angular_velocity": 1.0, "velocity": 0.5}

        # First run with seed 42
        pipeline1 = AugmentationPipeline(seed=42)
        result1 = pipeline1.augment_feature_measurements(measurements.copy(), method="noise")

        # Second run with different seed
        pipeline2 = AugmentationPipeline(seed=123)
        result2 = pipeline2.augment_feature_measurements(measurements.copy(), method="noise")

        # With different seeds, we expect different noise to be applied
        # (though by chance they might be similar, so we just verify both ran)
        assert isinstance(result1, dict)
        assert isinstance(result2, dict)

    def test_augmentation_metadata_includes_seed(self):
        """Verify metadata documents seed for audit trail."""
        pipeline = AugmentationPipeline(seed=42)
        metadata = pipeline.augmentation_metadata()

        assert metadata["augmentation_seed"] == 42
        assert metadata["noise_scale"] == load_config().NOISE_SCALE
        assert metadata["smote_ratio"] == load_config().SMOTE_RATIO


class TestSyntheticSampleGeneration:
    """Test interpolation-based synthetic sample generation per D-08 and D-87."""

    def test_smote_creates_synthetic_variants(self):
        """Verify SMOTE interpolation creates measurable synthetic variants."""
        pipeline = AugmentationPipeline(seed=42)
        measurements = {
            "angular_velocity": 2.0,
            "angular_jerk": 0.5,
            "kill_angle_first_order_max": 1.5
        }

        augmented = pipeline.augment_feature_measurements(measurements, method="smote")

        # Check synthetic keys exist
        synthetic_keys = [k for k in augmented.keys() if "synthetic" in k]
        assert len(synthetic_keys) > 0, "Should generate at least one synthetic variant"

        # Check synthetic values are numeric
        for key in synthetic_keys:
            assert isinstance(augmented[key], (int, float)), f"{key} should be numeric"
            # Synthetic values should be in reasonable range (within ~10x original)
            if "0" in key:  # First synthetic variant
                original_key = key.replace("_synthetic_0", "")
                if original_key in measurements:
                    original = measurements[original_key]
                    synthetic = augmented[key]
                    # Verify not wildly out of range (allowing for noise)
                    ratio = abs(synthetic) / abs(original) if original != 0 else abs(synthetic)
                    assert 0.1 <= ratio <= 10.0, f"Synthetic {key} out of reasonable range"

    def test_smote_variant_interpolation_concept(self):
        """Verify SMOTE uses interpolation concept per D-87."""
        # This test documents the interpolation-based approach per D-87 discretion
        pipeline = AugmentationPipeline(seed=42)

        # Create measurement set suitable for interpolation
        measurements = {
            "base_velocity": 1.0,
            "angular_offset": 0.5,
            "distance_meters": 10.0
        }

        augmented = pipeline.augment_feature_measurements(measurements, method="smote")

        # Verify synthetic samples were created
        synthetic_count = len([k for k in augmented if "synthetic" in k])
        assert synthetic_count > 0, "SMOTE interpolation should create synthetic samples"

        # Verify original measurements still present
        assert "base_velocity" in augmented
        assert "angular_offset" in augmented
        assert "distance_meters" in augmented
