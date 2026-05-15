# Feature Schema (Canonical)

This document defines the exact ordering and meaning of the 44 context features used in all 256×44 matrices throughout Phase 4 and beyond.

## Feature Indices 0-43

### Player State (0-9)

Player's own position, orientation, health, and armor.

- 0: X position (units, float32)
- 1: Y position (units, float32)
- 2: Z position (units, float32)
- 3: Pitch (angle, degrees, float32)
- 4: Yaw (angle, degrees, float32)
- 5: Velocity X (units/tick, float32)
- 6: Velocity Y (units/tick, float32)
- 7: Velocity Z (units/tick, float32)
- 8: Health (HP, 0-100, float32)
- 9: Armor Value (armor, 0-100, float32)

### Weapon and Movement (10-14)

Player's weapon state, scope status, and network latency.

- 10: Is Shooting (binary 0/1, float32)
- 11: Is Scoped (binary 0/1, float32)
- 12: Is Airborne (binary 0/1, float32)
- 13: Active Weapon ID (categorical as float, float32)
- 14: Ping (network latency, ms, float32)

### Opponent Context (15-29)

Nearest opponent's state (same structure as player state, 0-14).

- 15: Opponent X position (units, float32)
- 16: Opponent Y position (units, float32)
- 17: Opponent Z position (units, float32)
- 18: Opponent Pitch (angle, degrees, float32)
- 19: Opponent Yaw (angle, degrees, float32)
- 20: Opponent Velocity X (units/tick, float32)
- 21: Opponent Velocity Y (units/tick, float32)
- 22: Opponent Velocity Z (units/tick, float32)
- 23: Opponent Health (HP, 0-100, float32)
- 24: Opponent Armor Value (0-100, float32)
- 25: Opponent Is Shooting (binary 0/1, float32)
- 26: Opponent Is Scoped (binary 0/1, float32)
- 27: Opponent Is Airborne (binary 0/1, float32)
- 28: Opponent Active Weapon ID (categorical as float, float32)
- 29: Opponent Ping (network latency, ms, float32)

### Additional Spatial Features (30-43)

Distance metrics, visibility flags, or time-since-last-seen features.

- 30: Distance to Opponent (units, float32)
- 31: Horizontal Distance (units, float32)
- 32: Vertical Distance (units, float32)
- 33: Opponent Visible (binary 0/1, float32)
- 34: Opponent Last Seen Ticks Ago (ticks, float32)
- 35: Angle to Opponent (degrees, float32)
- 36: Relative Yaw (degrees, float32)
- 37: Relative Pitch (degrees, float32)
- 38: Time in Combat (seconds, float32)
- 39: Opponent Team Flag (0=same/1=other, float32)
- 40: Demo Frame Index (normalized to [0, 1], float32)
- 41: Round Time (seconds, float32)
- 42: Reserved (float32)
- 43: Reserved (float32)

## Invariants

1. **All features are float32** — Ensures consistent dtype across all operations
2. **Feature order is fixed and immutable** — Once locked, migrations require versioning
3. **Zero-padding is used for missing ticks** — Pad feature values to 0.0 for short demos
4. **No feature reordering between training and inference** — Strict canonical order
5. **All augmentation noise is applied to copies** — Original matrices are never modified
6. **Relative attacker-victim distance is preserved** — Same noise vector applied to both position features during augmentation

## Dataset Integration

- Features are extracted in canonical order from Parquet rows
- Matrix shape: (batch_size, 256, 44) where 256=ticks, 44=features
- Augmentation is applied per-feature based on training set statistics (see `python/ml/augmentation.py`)
- This schema is referenced by all downstream code (dataset.py, model.py, train.py, augmentation.py)

## Changes and Versioning

When the CS2CD dataset is loaded in Wave 2, this schema will be verified against actual Parquet column names and order. If any mismatches are found:

1. Document the actual feature names and order
2. Create a mapping table from this schema to actual column names
3. Update extraction logic in `dataset.py` to use the mapping
4. Versioning: Keep this document frozen; create `FEATURE_SCHEMA_v2.md` if breaking changes occur

## Notes for Implementation

- Features 30-43 are placeholders for distance and spatial metrics computed from the core player/opponent state. Exact definitions will be finalized during dataset loading and inspection.
- The feature set is designed to support both player-level analysis (individual tick context) and demo-level aggregation (training on matrix sequences).
- All position values use the same coordinate system (CS2 world units).
- All angles use degrees (not radians).
- All times use ticks (CS2 demo frames) unless explicitly noted as seconds.

---

**Last updated:** Phase 4, Wave 1
**Canonical reference for:** Dataset conversion, model training, inference pipelines
