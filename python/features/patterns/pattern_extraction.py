"""ML-learned recoil pattern extraction from CS2CD dataset.

Implements pattern extraction from real CS2 demo data, computing
quantile-based bounds for all weapon categories.
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from ..base import FeatureExtractionError
from .quantile_bounds import compute_quantile_bounds
from ml.dataset import load_cs2cd_dataset

logger = logging.getLogger(__name__)


class PatternExtractor:
    """Extract ML-learned recoil patterns from CS2CD dataset."""

    def __init__(
        self,
        hf_dataset_id: str = "CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection",
        dataset_version: str = "10.57967/hf/5654",
    ):
        """Initialize pattern extractor.

        Args:
            hf_dataset_id: HuggingFace dataset ID
            dataset_version: Dataset version string for reproducibility
        """
        self.hf_dataset_id = hf_dataset_id
        self.dataset_version = dataset_version
        self.dataset = None

    def _load_dataset(self) -> None:
        """Load CS2CD dataset from HuggingFace.

        This will cache locally in HF_HOME or HUGGINGFACE_HUB_CACHE.
        """
        if self.dataset is not None:
            return

        try:
            # Load entire dataset (no split) to access all weapon data
            self.dataset = load_cs2cd_dataset(split=None)
            logger.info(f"Loaded CS2CD dataset: {len(self.dataset)} samples")
        except Exception as e:
            logger.error(f"Failed to load dataset: {e}")
            raise

    def extract_patterns(
        self,
        output_dir: Path,
        weapons: Optional[list[str]] = None,
    ) -> dict[str, dict]:
        """Extract patterns for specified weapons.

        Args:
            output_dir: Output directory for JSON pattern files
            weapons: List of weapon names to extract. If None, extracts all common weapons.

        Returns:
            Dictionary mapping weapon_name -> bounds dict
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Load dataset if not already loaded
        self._load_dataset()

        # Default weapon list (primary rifles, SMGs, pistols, special)
        if weapons is None:
            weapons = [
                "AK-47",
                "M4A4",
                "M4A1-S",
                "MP9",
                "UMP45",
                "Deagle",
                "P250",
                "AWP",
            ]

        patterns = {}
        warnings = []

        for weapon in weapons:
            try:
                logger.info(f"Extracting pattern for {weapon}...")

                # Filter dataset for this weapon
                # Assume dataset has a 'weapon_name' column or similar
                weapon_rows = self.dataset.filter(
                    lambda row: row.get("weapon_name") == weapon
                )

                if len(weapon_rows) == 0:
                    warning = f"No samples found for {weapon}"
                    logger.warning(warning)
                    warnings.append(warning)
                    continue

                # Extract spray trajectory data
                spray_trajectories = self._extract_trajectories(weapon_rows)

                if len(spray_trajectories) == 0:
                    warning = f"Failed to extract trajectories for {weapon}"
                    logger.warning(warning)
                    warnings.append(warning)
                    continue

                # Compute quantile bounds
                bounds = compute_quantile_bounds(
                    spray_trajectories,
                    weapon_name=weapon,
                    dataset_version=self.dataset_version,
                )

                # Save to JSON file
                output_file = output_dir / f"{weapon.lower().replace('-', '_').replace(' ', '_')}.json"
                with open(output_file, "w") as f:
                    json.dump(bounds, f, indent=2)

                logger.info(f"Saved pattern: {output_file}")
                patterns[weapon] = bounds

            except Exception as e:
                warning = f"Error extracting {weapon}: {e}"
                logger.warning(warning)
                warnings.append(warning)
                continue

        return patterns

    def _extract_trajectories(self, weapon_rows) -> np.ndarray:
        """Extract spray trajectories from filtered dataset rows.

        Args:
            weapon_rows: Filtered dataset for a single weapon

        Returns:
            Array of shape (N, 2) with [yaw_delta, pitch_delta] spray points
        """
        trajectories = []

        for row in weapon_rows:
            # Assume dataset has 'yaw_deltas' and 'pitch_deltas' columns or similar
            # Adapt based on actual CS2CD dataset schema
            yaw_deltas = row.get("yaw_deltas")
            pitch_deltas = row.get("pitch_deltas")

            if yaw_deltas is None or pitch_deltas is None:
                continue

            # Convert to numpy if needed
            if isinstance(yaw_deltas, list):
                yaw_deltas = np.array(yaw_deltas, dtype=float)
            if isinstance(pitch_deltas, list):
                pitch_deltas = np.array(pitch_deltas, dtype=float)

            if len(yaw_deltas) > 0 and len(pitch_deltas) > 0:
                spray = np.column_stack((yaw_deltas, pitch_deltas))
                trajectories.append(spray)

        if trajectories:
            # Concatenate all trajectories
            return np.vstack(trajectories)
        else:
            return np.empty((0, 2), dtype=float)

    def validate_patterns(
        self,
        patterns: dict,
        reference_paper_patterns: Optional[dict] = None,
    ) -> dict:
        """Validate extracted patterns against reference (e.g., AntiCheatPT paper).

        Args:
            patterns: Extracted patterns dict
            reference_paper_patterns: Optional reference patterns for comparison

        Returns:
            Validation report: {"valid": bool, "warnings": list[str], "comparisons": dict}
        """
        report = {
            "valid": True,
            "warnings": [],
            "comparisons": {},
        }

        for weapon_name, pattern in patterns.items():
            num_sprays = pattern.get("num_sprays", 0)

            # Check for minimum sample size
            if num_sprays < 50:
                report["warnings"].append(
                    f"{weapon_name}: spray count {num_sprays} < 50, bounds may be unreliable"
                )

            # Check for outlier patterns (95th percentile)
            percentile_90 = pattern.get("percentile_90", 0)
            if percentile_90 > 5.0:  # Threshold depends on expected spray variance
                report["warnings"].append(
                    f"{weapon_name}: percentile_90 = {percentile_90} exceeds threshold, high variance"
                )

            # If reference patterns provided, compare quantiles
            if reference_paper_patterns and weapon_name in reference_paper_patterns:
                ref = reference_paper_patterns[weapon_name]
                extracted = pattern.get("quantiles", {}).get("q50", {})

                # Simple comparison: check if q50 values are within 50% of reference
                if isinstance(ref, dict) and "q50" in ref:
                    ref_q50 = ref.get("q50", {})
                    if isinstance(ref_q50, dict):
                        ref_yaw = ref_q50.get("yaw_offset", 0)
                        ref_pitch = ref_q50.get("pitch_offset", 0)

                        extracted_yaw = extracted.get("yaw_offset", 0)
                        extracted_pitch = extracted.get("pitch_offset", 0)

                        yaw_delta = abs(extracted_yaw - ref_yaw)
                        pitch_delta = abs(extracted_pitch - ref_pitch)

                        report["comparisons"][weapon_name] = {
                            "q50_yaw_delta": float(yaw_delta),
                            "q50_pitch_delta": float(pitch_delta),
                            "matches_reference": (
                                yaw_delta < 0.5 and pitch_delta < 0.5
                            ),
                        }

        return report


def main():
    """CLI entrypoint for pattern extraction."""
    parser = argparse.ArgumentParser(
        description="Extract ML-learned recoil patterns from CS2CD dataset"
    )
    parser.add_argument(
        "--dataset-version",
        default="10.57967/hf/5654",
        help="Dataset version (default: 10.57967/hf/5654)",
    )
    parser.add_argument(
        "--output-dir",
        default="data/recoil_patterns",
        help="Output directory for JSON patterns",
    )
    parser.add_argument(
        "--weapons",
        default="AK-47,M4A4,M4A1-S,MP9,UMP45,Deagle,P250,AWP",
        help="Comma-separated weapon names",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate patterns after extraction",
    )
    parser.add_argument(
        "--reference-paper",
        help="Path to reference paper patterns JSON (for validation)",
    )

    args = parser.parse_args()

    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Parse weapons list
    weapons = [w.strip() for w in args.weapons.split(",")]

    # Create extractor and extract patterns
    extractor = PatternExtractor(dataset_version=args.dataset_version)

    try:
        patterns = extractor.extract_patterns(
            output_dir=Path(args.output_dir),
            weapons=weapons,
        )

        # Validate if requested
        if args.validate:
            ref_patterns = None
            if args.reference_paper:
                with open(args.reference_paper) as f:
                    ref_patterns = json.load(f)

            report = extractor.validate_patterns(patterns, ref_patterns)
            print("\n=== Validation Report ===")
            print(f"Valid: {report['valid']}")
            if report["warnings"]:
                print("Warnings:")
                for warning in report["warnings"]:
                    print(f"  - {warning}")
            if report["comparisons"]:
                print("Comparisons with reference:")
                for weapon, comp in report["comparisons"].items():
                    print(f"  {weapon}: {comp}")

        # Print summary
        print(f"\n=== Extraction Summary ===")
        print(f"Extracted {len(patterns)} weapons")
        print(f"Output directory: {args.output_dir}")
        for weapon, pattern in patterns.items():
            print(
                f"  {weapon}: {pattern.get('num_sprays', 0)} sprays, "
                f"q50=({pattern['quantiles']['q50']['yaw_offset']:.3f}, "
                f"{pattern['quantiles']['q50']['pitch_offset']:.3f})"
            )

    except Exception as e:
        logger.error(f"Pattern extraction failed: {e}")
        raise


if __name__ == "__main__":
    main()
