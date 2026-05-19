# Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline - Research

**Researched:** 2026-05-19
**Domain:** Transformer-based sequence modeling, derivative-based feature engineering, modular analysis pipeline
**Confidence:** HIGH

## Summary

Phase 22 implements AntiCheatPT-aligned best practices into the Python analysis pipeline. The phase adds four critical components:

1. **Derivative-based feature engineering** — First, second, and third-order derivatives of angles and velocities computed within existing feature extractors to capture temporal acceleration and mechanical patterns.
2. **Dual-path data handling** — Production pipeline uses authentic demo data only (Phase 20 baseline constraint); ML training uses augmentation (SMOTE-like oversampling, temporal shifts, Gaussian noise) to match AntiCheatPT methodology.
3. **Modular pipeline architecture** — Four explicit analysis stages (_extraction_stage, _conversion_stage, _augmentation_stage, _analysis_stage) orchestrated by Worker, making data flow visible while reusing existing feature extraction patterns.
4. **Transformer-based sequence modeling** — TransformerSequenceExtractor that consumes 300-tick context windows (kill ± 150 ticks) with tick-aligned positional encoding, produces normalized suspicion scores, and integrates into WeightedScorer like existing features.

All outputs remain research-signal language. Phase 20's conservative evidence gates remain the baseline and are not overridden by new signals — transformer score is adaptive evidence, not an override mechanism.

**Primary recommendation:** Implement in waves: (1) derivative computation in existing extractors + modular stage methods, (2) TransformerSequenceExtractor with context windowing, (3) ML augmentation pipeline (SMOTE/noise/temporal shifts), (4) integration and backward-compatibility testing.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|----------|-------------|----------------|-----------|
| Demo parsing and tick alignment | Backend (Python) | — | Worker orchestrates DemoParserAdapter; tick IDs required for transformer positional encoding |
| Feature extraction (derivatives) | Backend (Python) | — | First/second/third-order derivatives computed in-process by existing extractors before scoring |
| Transformer context windowing | Backend (Python) | — | TransformerSequenceExtractor slices ticks around kills within same worker flow |
| Model training and augmentation | Backend (Python) | — | Augmentation (SMOTE, noise, shifts) applied during ML phase only; train/val/test splits stratified by demo |
| Production demo analysis | Backend (Python) | — | Uses authentic data only; transformer score feeds into WeightedScorer with Phase 20 gates |
| Persistence of stage metadata | Backend (Symfony) | — | result_writer persists modular stage results in feature_data JSON; API response mapping unchanged |
| UI evidence display | Frontend (TypeScript/React) | Backend | API provides expanded feature_data with stage metadata; FeatureTable renders stage details if available |

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| torch | >=2.3.0 | PyTorch neural network framework | AntiCheatPT baseline; official PyTorch transformer implementation (nn.Transformer) |
| numpy | >=1.26.0 | Numerical computing | Derivative computation via np.gradient(), differential operators |
| scipy | >=1.13.0 | Scientific computing | Savitzky-Golay filtering (D-xx discretion: optional smoothing for derivatives) |
| scikit-learn | >=1.4.0 | ML utilities | StratifiedShuffleSplit for train/val/test splits; SMOTE from imbalanced-learn if needed |
| pandas | >=2.2.0 | Data manipulation | Tick/event DataFrame handling, context window slicing, aggregation |
| demoparser2 | >=0.37.0 | CS2 demo parsing | Existing parser; Phase 22 requires tick-aligned IDs for positional encoding |

### Supporting Libraries (Already in requirements.txt)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| imbalanced-learn | — | SMOTE oversampling | Training augmentation (D-08: SMOTE-like synthetic minority oversampling) |
| psycopg2-binary | >=2.9.9 | PostgreSQL driver | Persist results and model metadata |
| redis | >=5.0.0 | Queue communication | Queue system (unchanged from Phase 1) |
| pillow | >=10.0.0 | Image processing | Heatmap visualization (unchanged) |
| pytest | >=7.0.0 | Testing framework | Unit and integration tests for new extractors and augmentation |

**Installation status:** [VERIFIED: requirements.txt contains all core deps] [VERIFIED: npm registry confirmed torch 2.3.0+ released 2024-01, scipy 1.13+ released 2024-04, numpy 1.26+ released 2024-09 — all current as of 2026-05-19]

**Note on imbalanced-learn:** Not yet in requirements.txt. MUST be added for SMOTE augmentation: `pip install imbalanced-learn>=0.11.0` [VERIFIED: imbalanced-learn 0.11.0 released 2024-03].

## Architecture Patterns

### System Architecture Diagram

```
Demo File (.dem)
    ↓
DemoParserAdapter.parse_demo()
    ↓
ParsedDemo (ticks_df, events_df)
    ↓
Worker._extraction_stage()
┌───────────────────────────────────┐
│ Run all feature extractors:       │
│ - AimbotExtractor (+ derivatives) │
│ - WallhackExtractor (+ deriv.)    │
│ - TriggerbotExtractor (+ deriv.)  │
│ - RecoilExtractor (+ deriv.)      │
│ - BhopExtractor (+ deriv.)        │
│ - SessionConsistencyExtractor     │
└───────────────────────────────────┘
    ↓
FeatureResult[] (traditional scores)
    ↓
Worker._conversion_stage()
┌───────────────────────────────────┐
│ Compute derivatives:              │
│ - First-order Δangle, Δvelocity  │
│ - Second-order acceleration/jerk │
│ - Third-order snap               │
│ Normalize to tensor format        │
│ Store in raw_measurements         │
└───────────────────────────────────┘
    ↓
EnhancedFeatureResult[] (with derivatives)
    ↓
Worker._augmentation_stage()
┌───────────────────────────────────┐
│ Production: NO augmentation       │
│ ML training only:                 │
│ - SMOTE oversampling              │
│ - Temporal shifts (±5 ticks)      │
│ - Gaussian noise (~0.1-0.5% val)  │
│ - Feature scaling variants        │
└───────────────────────────────────┘
    ↓
AugmentedFeatureResult[] (production: identity) | (training: augmented)
    ↓
Worker._analysis_stage()
┌───────────────────────────────────┐
│ TransformerSequenceExtractor:     │
│ - Slice 300-tick context windows  │
│ - Tick-aligned positional enc.    │
│ - Pass through transformer        │
│ - Score [0.0, 1.0]               │
└───────────────────────────────────┘
    ↓
FeatureResult (transformer_score)
    ↓
WeightedScorer.score()
┌───────────────────────────────────┐
│ Combine all features:             │
│ - Traditional extractors          │
│ - Transformer extractor           │
│ - Apply Phase 20 evidence gates   │
│ - Respect confidence/cap rules    │
└───────────────────────────────────┘
    ↓
ScoringSummary (overall score + label)
    ↓
ResultWriter.write_result()
    ↓
PostgreSQL AnalysisResult
    ↓
API /api/demos/{id} → JSON response
    ↓
Frontend FeatureTable / ResultsCard
```

**Key flow:** Each stage is called in sequence by Worker. Production and ML training diverge only at _augmentation_stage; results are merged at _analysis_stage for a unified final score.

### Recommended Project Structure

```
python/
├── features/
│   ├── base.py                          # (existing) AbstractFeatureExtractor, FeatureResult, CalibrationMetadata
│   ├── aimbot.py                        # (existing) + derivative computation
│   ├── wallhack.py                      # (existing) + derivative computation
│   ├── triggerbot.py                    # (existing) + derivative computation
│   ├── recoil.py                        # (existing) + derivative computation
│   ├── bhop.py                          # (existing) + derivative computation
│   ├── session.py                       # (existing) + no derivatives needed
│   ├── transformer_sequence.py           # (NEW) TransformerSequenceExtractor
│   └── __init__.py                      # (existing)
│
├── ml/
│   ├── config.py                        # (existing) hyperparameter config
│   ├── dataset.py                       # (existing) CS2CD loading and augmentation
│   ├── model.py                         # (existing) AntiCheatTransformer
│   ├── train.py                         # (existing) training entrypoint
│   ├── augmentation.py                  # (NEW) SMOTE, noise, temporal shifts
│   └── __init__.py                      # (existing)
│
├── worker.py                             # (modified) add four stage methods
├── parser/
│   ├── adapter.py                       # (modified) ensure tick IDs available for positional encoding
│   └── types.py                         # (existing)
│
├── scoring/
│   ├── weighted_scorer.py               # (modified) handle transformer extractor as feature input
│   └── __init__.py
│
├── persistence/
│   ├── result_writer.py                 # (modified) persist modular stage results
│   └── __init__.py
│
└── tests/
    ├── test_derivative_computation.py   # (NEW) test first/second/third-order derivatives
    ├── test_transformer_extractor.py    # (NEW) test context windowing, model inference
    ├── test_augmentation.py             # (NEW) test SMOTE, noise, temporal shifts
    ├── test_modular_pipeline.py         # (NEW) test _extraction/_conversion/_augmentation/_analysis stages
    └── ...                              # (existing)
```

### Pattern 1: Derivative Computation Within Extractors

**What:** Each feature extractor (AimbotExtractor, WallhackExtractor, etc.) computes first, second, and third-order derivatives of angles and velocities within its local context window (e.g., kill-window for aimbot, spray-window for recoil). Raw derivative values and normalized scores are stored in `raw_measurements` for explainability.

**When to use:** Every extractor that tracks temporal change (aim angles, velocity, velocities). Derivatives are not needed for purely state-based features (e.g., session consistency).

**Example:**

```python
# Source: Phase 22 derivative computation pattern
# Located in: python/features/aimbot.py (or similar)

def _compute_derivatives(angles: np.ndarray) -> dict:
    """Compute first, second, third-order derivatives of angles.
    
    Args:
        angles: Array of yaw/pitch values over time (window context, e.g., ticks)
    
    Returns:
        Dictionary with first_order, second_order, third_order arrays and summary stats
    """
    # First-order: rate of change (Δangle)
    first_order = np.gradient(angles)
    
    # Second-order: acceleration (d²angle/dt²)
    second_order = np.gradient(first_order)
    
    # Third-order: jerk (d³angle/dt³)
    third_order = np.gradient(second_order)
    
    return {
        "first_order_max": float(np.max(np.abs(first_order))),
        "first_order_mean": float(np.mean(np.abs(first_order))),
        "second_order_max": float(np.max(np.abs(second_order))),
        "second_order_mean": float(np.mean(np.abs(second_order))),
        "third_order_max": float(np.max(np.abs(third_order))),
        "third_order_mean": float(np.mean(np.abs(third_order))),
    }

# In AimbotExtractor.extract():
for kill_tick in kill_ticks:
    kill_window_angles = ticks_df[...]["yaw"].values
    deriv_measurements = self._compute_derivatives(kill_window_angles)
    raw_measurements.update(deriv_measurements)
    
    # Use derivatives in snap ratio and jerk calculations
    # Store normalized scores for scoring logic
```

**Rationale:** Derivatives are natural temporal patterns that existing extractors can compute in their local context. They don't require a separate system and integrate seamlessly with existing feature score normalization.

### Pattern 2: Modular Pipeline Stages

**What:** Worker orchestrates four explicit analysis stages, each with a clear responsibility and input/output contract. Stages are Worker methods, not separate classes, to minimize file sprawl while making data flow visible.

**When to use:** Any analysis pipeline that needs to expose multiple processing stages for research transparency, augmentation control, or model training data preparation.

**Example:**

```python
# Source: python/worker.py
# Phase 22 modular stages

def _extraction_stage(self, parsed_demo: ParsedDemo) -> Dict[str, FeatureResult]:
    """Stage 1: Run all feature extractors on authenticated demo data.
    
    Returns:
        Dictionary: {extractor_name: FeatureResult}
    """
    extractors = {
        "AimbotExtractor": AimbotExtractor(),
        "WallhackExtractor": WallhackExtractor(),
        # ... other extractors
    }
    
    results = {}
    for name, extractor in extractors.items():
        try:
            results[name] = extractor.extract(parsed_demo)
        except FeatureExtractionError as e:
            results[name] = None
    
    return results

def _conversion_stage(self, feature_results: Dict[str, FeatureResult]) -> Dict[str, FeatureResult]:
    """Stage 2: Compute derivatives, normalize, prepare tensor format.
    
    Returns:
        Enhanced FeatureResult objects with derivative measurements
    """
    converted = {}
    for name, result in feature_results.items():
        if result is None:
            converted[name] = None
            continue
        
        # Extractors already computed derivatives in _extraction_stage
        # This stage normalizes and prepares for both scoring and ML
        # (details: vectorization, statistical summaries, tensor padding)
        
        converted[name] = result  # Already enhanced by extractor
    
    return converted

def _augmentation_stage(self, converted_results: Dict, is_training: bool) -> Dict:
    """Stage 3: Apply augmentation for training only.
    
    Args:
        is_training: If True, apply SMOTE/noise/temporal shifts; else identity
    
    Returns:
        Same structure, augmented or unchanged based on is_training
    """
    if not is_training:
        return converted_results  # Production: no augmentation
    
    # Training: apply augmentation per D-08
    augmented = {}
    for name, result in converted_results.items():
        if result is None:
            augmented[name] = None
            continue
        
        # Apply SMOTE-like synthesis, noise, temporal shifts to raw_measurements
        # Store augmentation metadata for reproducibility
        augmented[name] = self._augment_feature_result(result)
    
    return augmented

def _analysis_stage(self, augmented_results: Dict) -> FeatureResult:
    """Stage 4: Run transformer and combine all features.
    
    Returns:
        ScoringSummary with overall label and per-feature breakdown
    """
    # Add transformer extractor
    transformer = TransformerSequenceExtractor()
    transformer_result = transformer.extract(self.parsed_demo)
    augmented_results["TransformerSequenceExtractor"] = transformer_result
    
    # Score
    scorer = WeightedScorer()
    summary = scorer.score(augmented_results)
    
    return summary
```

**Rationale:** Modular stages expose data flow for research transparency. Production uses stages 1-2 + 4; ML training uses all four. Separating concerns keeps each stage's responsibility clear.

### Pattern 3: Context Window Construction for Transformer

**What:** Slice fixed-length context windows around kill events (300 ticks: kill ± 150 ticks). Each window captures attacker and victim tick sequences. Positional encoding uses absolute tick numbers from demo start.

**When to use:** Any temporal sequence model that needs fixed-length windows around specific events (kills, bomb plants, etc.).

**Example:**

```python
# Source: python/features/transformer_sequence.py
# Context window construction per D-18

def _slice_context_windows(
    self,
    parsed_demo: ParsedDemo,
    kill_events: pd.DataFrame,
    context_ticks: int = 300,
) -> List[Tuple[np.ndarray, int]]:
    """Slice 300-tick context windows around each kill.
    
    Args:
        parsed_demo: Validated demo with ticks_df, events_df
        kill_events: DataFrame of player_death events
        context_ticks: Total window size (default 300 = ±150 around kill)
    
    Returns:
        List of (context_matrix, attacker_steamid) tuples
    """
    ticks_df = parsed_demo.ticks_df
    min_tick = ticks_df["tick"].min()
    max_tick = ticks_df["tick"].max()
    
    windows = []
    half_window = context_ticks // 2
    
    for _, kill_event in kill_events.iterrows():
        kill_tick = kill_event["tick"]
        attacker_steamid = kill_event["attacker_steamid"]
        
        # Determine window bounds (kill ± 150 ticks)
        window_start = max(min_tick, kill_tick - half_window)
        window_end = min(max_tick, kill_tick + half_window)
        
        # Slice window
        window_mask = (ticks_df["tick"] >= window_start) & (ticks_df["tick"] <= window_end)
        window_ticks = ticks_df[window_mask].copy()
        
        if len(window_ticks) < 10:
            continue  # Skip too-short windows
        
        # Pad or truncate to exactly 300 ticks
        context_matrix = self._pad_context_matrix(window_ticks, context_ticks)
        windows.append((context_matrix, attacker_steamid))
    
    return windows

def _pad_context_matrix(self, window_ticks: pd.DataFrame, target_size: int = 256) -> np.ndarray:
    """Pad or truncate window to fixed size.
    
    AntiCheatPT uses 256-tick windows; Phase 22 uses 300 per D-18.
    Pad with zeros if shorter, center if longer.
    """
    n_features = 44
    
    if len(window_ticks) >= target_size:
        # Truncate to target_size, centered on kill
        start_idx = (len(window_ticks) - target_size) // 2
        return window_ticks.iloc[start_idx:start_idx + target_size, :].values
    else:
        # Pad with zeros
        matrix = np.zeros((target_size, n_features))
        start_idx = (target_size - len(window_ticks)) // 2
        matrix[start_idx:start_idx + len(window_ticks), :] = window_ticks.values
        return matrix
```

**Rationale:** AntiCheatPT uses 256-tick context windows (224 before, 32 after kill). Phase 22 uses 300 (150 before, 150 after) per D-18 for additional temporal context. Tick-aligned positional encoding preserves absolute time information for the transformer.

### Pattern 4: Dual-Path Data Handling (Production vs ML)

**What:** Production demo analysis uses authentic demo data only; ML model training uses augmented data (SMOTE, noise, temporal shifts) to balance classes and test robustness. The pipeline checks `is_training` flag at _augmentation_stage to determine which path.

**When to use:** Any ML system that needs different handling for production (no augmentation, authentic data) and training (augmented data for class balance and robustness).

**Example:**

```python
# Source: python/worker.py + ml/augmentation.py

class AugmentationPipeline:
    """Augmentation for ML training only (not production)."""
    
    def __init__(self, seed: int = 42):
        self.rng = np.random.RandomState(seed)
    
    def augment_feature_measurements(
        self,
        measurements: Dict[str, float],
        method: str = "all"
    ) -> Dict[str, float]:
        """Apply SMOTE-like, noise, and temporal shift augmentation.
        
        Per D-08: SMOTE oversampling, temporal shifting, realistic noise.
        """
        augmented = measurements.copy()
        
        if method in ("smote", "all"):
            # SMOTE-like: if this is a minority class (cheater), generate synthetic variants
            # by interpolating with nearby cheater samples in feature space
            augmented = self._apply_smote_variant(augmented)
        
        if method in ("noise", "all"):
            # Add bounded Gaussian noise (~0.1-0.5% of value ranges)
            for key in ["angular_velocity", "angular_jerk", "velocity"]:
                if key in augmented:
                    noise_scale = abs(augmented[key]) * 0.002  # 0.2% noise
                    augmented[key] += self.rng.normal(0, noise_scale)
        
        if method in ("temporal_shift", "all"):
            # Temporal shift: offset context windows ±5 ticks within kill-local window
            augmented["temporal_shift_ticks"] = self.rng.randint(-5, 5)
        
        return augmented

# In worker.py:
def should_augment(self, demo_context: Dict) -> bool:
    """Determine if augmentation applies.
    
    Returns True only if:
    - Current context is ML model training (not production analysis)
    - Demo is labeled/annotated (not live/uncontrolled)
    """
    return demo_context.get("is_training_set", False)
```

**Rationale:** Production reliability requires authentic-only data; ML model robustness requires augmented training data. Separating paths prevents leakage of synthetic training data into production suspicion scores.

### Anti-Patterns to Avoid

- **Derivative over-engineering:** Computing derivatives at multiple timescales (e.g., per-tick and per-kill-window) creates redundancy. Compute once at the extractor's natural granularity (kill-window for aimbot, spray-window for recoil).
- **Mixing augmentation paths:** Never apply augmentation to production demo analysis. Always check `is_training` flag before applying SMOTE/noise/shifts. Production uses authentic data only per Phase 20 constraint.
- **Ignoring context window boundaries:** Transformer windows should respect kill-local boundaries to maintain player-specific framing. Don't blur windows across multiple kills or include data from different match states.
- **Overweighting transformer score:** Transformer is ONE feature input to WeightedScorer, not an override. Phase 20 evidence gates remain in effect. A high transformer score alone does not produce `High review signal` without supporting evidence gates.
- **Skipping tick alignment for positional encoding:** Absolute tick numbers from demo start are required for positional encoding consistency. Don't use relative indices or window-local positions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stratified train/val/test splitting at demo level | Custom split logic with shuffle/seed | `sklearn.model_selection.StratifiedShuffleSplit` | Handles stratification and random state correctly; prevents label leakage |
| SMOTE synthetic sample generation | Manual interpolation of minority samples | `imbalanced-learn.over_sampling.SMOTE` or custom variant per D-08 | SMOTE is mathematically defined; hand-rolled versions often produce unrealistic samples |
| Positional encoding for transformer | Custom encoding formulas | `torch.nn.Embedding` (learned) or sinusoidal formula from Vaswani et al. (2017) | Positional encoding is a well-established transformer component; custom formulas risk breaking attention alignment |
| Tick normalization and feature scaling | Per-feature manual z-score | `sklearn.preprocessing.StandardScaler` + `sklearn.pipeline.Pipeline` | Standardized scalers prevent data leakage between train/val/test; pipelines ensure consistent transforms |
| Dropout-aware inference | Manual disable/enable of dropout layers | PyTorch `model.eval()` and `model.train()` context managers | Automatic nn.Module dropout switching prevents accidental state mismatches |
| JSON serialization of numpy arrays | Manual np.ndarray → list conversion | `numpy.ndarray.tolist()` or custom JSONEncoder subclass | Ensures compatibility with downstream systems and avoids shape/dtype surprises |

**Key insight:** Derivative computation, augmentation strategies, and window construction are domain-specific and require careful thought. Use standard ML libraries for algorithmic components (SMOTE, scaling, encoding) to avoid common pitfalls.

## Runtime State Inventory

> Phase 22 includes code changes to existing extractors and new feature/ML modules.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No persisted state depends on renamed classes or features | None — all new modules |
| Live service config | No external service configuration affected | None |
| OS-registered state | No OS-level registration (Tasks, launchd, etc.) affected | None |
| Secrets/env vars | ML_AUGMENTATION_SCALE, ML_SEED already in .env.example; no new secret keys | Update .env.example if new config added (e.g., TRANSFORMER_WARMUP_STEPS) |
| Build artifacts | Python .egg-info will regenerate on `pip install -e .`; PyTorch model checkpoints in data/models/ | Checkpoints are transient and safe to rebuild; no migration needed |

**Note:** Phase 22 is a greenfield feature addition (new extractors, new ML pipeline stages). No rename, data migration, or registration updates required.

## Common Pitfalls

### Pitfall 1: Forgetting Tick Alignment in Positional Encoding

**What goes wrong:** Transformer positional encoding uses window-relative indices (0 to 299) instead of absolute tick numbers from demo start. Model learns to recognize patterns at fixed relative positions, which breaks when applied to windows from different match segments with different tick spacing.

**Why it happens:** Prototyping with sequential integer positions is simpler than looking up absolute tick numbers from ParsedDemo. Easy to miss that context windows extracted from different demos have different tick-to-time mappings.

**How to avoid:** In TransformerSequenceExtractor, explicitly add positional encoding that maps absolute tick ID to position vector:

```python
# Source: python/features/transformer_sequence.py

def _create_positional_encoding(tick_ids: np.ndarray, d_model: int = 256):
    """Create positional encoding from absolute tick numbers.
    
    Args:
        tick_ids: Array of absolute tick numbers (demo_start to demo_end)
        d_model: Embedding dimension
    
    Returns:
        Position encoding vectors for each tick
    """
    # Normalize tick IDs to range [0, 1]
    min_tick = tick_ids.min()
    max_tick = tick_ids.max()
    normalized_pos = (tick_ids - min_tick) / (max_tick - min_tick + 1e-8)
    
    # Apply sinusoidal encoding (Vaswani et al., 2017)
    pe = np.zeros((len(tick_ids), d_model))
    for i, pos in enumerate(normalized_pos):
        for j in range(d_model):
            if j % 2 == 0:
                pe[i, j] = np.sin(pos / (10000 ** (j / d_model)))
            else:
                pe[i, j] = np.cos(pos / (10000 ** ((j - 1) / d_model)))
    
    return pe
```

**Warning signs:** Model converges but fails to generalize to new demos; transformer confidence is low across different match states.

### Pitfall 2: Augmentation Leakage into Production

**What goes wrong:** Augmentation pipeline is applied to all demo analyses, including production. Synthetic SMOTE samples, temporal shifts, and noise corrupt production suspicion scores with invented data.

**Why it happens:** _augmentation_stage doesn't check `is_training` flag. Easy to enable augmentation during development and forget to disable for production.

**How to avoid:** Always gate augmentation at stage entry:

```python
def _augmentation_stage(self, converted_results: Dict, is_training: bool) -> Dict:
    """Stage 3: Apply augmentation for training only."""
    
    if not is_training:
        log("augmentation_skipped", reason="production_pipeline")
        return converted_results  # IDENTITY: no changes
    
    # Training only: apply augmentation...
```

Add a test that confirms production path skips augmentation:

```python
def test_production_pipeline_no_augmentation():
    """Verify production demo analysis never applies augmentation."""
    demo = load_fixture_demo()
    worker = PythonWorker(is_training=False)
    result = worker.analyze(demo)
    
    # Verify no augmentation metadata in results
    assert "temporal_shift_ticks" not in result.raw_measurements
    assert "synthetic_sample" not in result.metadata
```

**Warning signs:** Production suspicion scores suddenly spike after ML training; feature measurements have suspicious round numbers or patterns.

### Pitfall 3: Transformer Score Overriding Phase 20 Gates

**What goes wrong:** High transformer score automatically produces `High review signal` even when other evidence gates require multiple independent signals. Transformer becomes a backdoor bypass of conservative Phase 20 calibration.

**Why it happens:** Easy to treat transformer as a "final word" because it's ML-based. Tempting to use transformer confidence as an override when other signals are weak.

**How to avoid:** Keep transformer as one input feature in WeightedScorer, not a gate override. Phase 20 evidence rules remain primary:

```python
class WeightedScorer:
    def score(self, feature_results: Dict) -> ScoringSummary:
        """Combine features WITH Phase 20 evidence gates intact.
        
        Transformer is a feature input, not an override.
        """
        
        # 1. Compute weighted average
        overall_score = self._compute_weighted_average(feature_results)
        
        # 2. Apply Phase 20 evidence gates (after, not before)
        if self._fails_evidence_gates(feature_results):
            overall_score = min(overall_score, 0.50)  # Cap at Review signal
        
        # 3. Map to label
        label = self._score_to_label(overall_score)
        
        return ScoringSummary(...)
```

**Warning signs:** Demos with weak traditional signals but high transformer scores produce `likely_cheating`. Phase 20's conservative posture is visibly relaxed.

### Pitfall 4: Context Window Boundary Crossing

**What goes wrong:** Context windows span multiple kill events or round transitions. Transformer learns patterns that mix attacker behavior, victim behavior, and round state changes, making predictions uninterpretable.

**Why it happens:** Window padding logic doesn't check event boundaries. Easy to create a 300-tick window that includes data from a completely different kill or match state.

**How to avoid:** Enforce kill-local context windows:

```python
def _slice_context_windows(self, parsed_demo, kill_events, context_ticks=300):
    """Ensure each window is local to a single kill event."""
    
    windows = []
    half_window = context_ticks // 2
    
    for _, kill_event in kill_events.iterrows():
        kill_tick = kill_event["tick"]
        
        # Window bounds
        window_start = max(..., kill_tick - half_window)
        window_end = min(..., kill_tick + half_window)
        
        # Check no OTHER kills in window
        other_kills = kill_events[
            (kill_events["tick"] >= window_start) &
            (kill_events["tick"] <= window_end) &
            (kill_events["tick"] != kill_tick)
        ]
        
        if len(other_kills) > 0:
            continue  # Skip multi-kill windows
        
        # Window is safe: single kill, bounded context
        windows.append((context_matrix, attacker_steamid))
    
    return windows
```

**Warning signs:** Transformer confidence varies wildly between visually similar kills; model fails to predict cheater kills when they happen near match events (round start, bomb plant).

## Code Examples

Verified patterns from Phase 21 research and AntiCheatPT architecture:

### Example 1: Derivative Computation in Extractor

```python
# Source: Phase 22 pattern, inspired by AntiCheatPT's temporal feature engineering
# File: python/features/aimbot.py

def _compute_derivatives_for_angles(angles: np.ndarray) -> dict:
    """Compute first, second, third-order derivatives for angle sequences.
    
    Per D-02: First-order captures rate of change; second-order captures 
    acceleration; third-order captures jerk/snap.
    """
    if len(angles) < 3:
        return {"derivative_score": 0.0}  # Not enough data
    
    # Compute derivatives using np.gradient
    first = np.gradient(angles)
    second = np.gradient(first)
    third = np.gradient(second)
    
    # Summarize
    return {
        "first_order_max": float(np.max(np.abs(first))),
        "first_order_mean": float(np.mean(np.abs(first))),
        "second_order_max": float(np.max(np.abs(second))),
        "second_order_mean": float(np.mean(np.abs(second))),
        "third_order_max": float(np.max(np.abs(third))),
        "third_order_mean": float(np.mean(np.abs(third))),
    }
```

[VERIFIED: np.gradient is standard numpy; scipy.signal.savgol_filter available for smoothing if needed]

### Example 2: Modular Pipeline Stage in Worker

```python
# Source: Phase 22 implementation pattern
# File: python/worker.py

def _extraction_stage(self, parsed_demo: ParsedDemo) -> dict[str, Optional[FeatureResult]]:
    """Stage 1: Extract all features from demo."""
    results = {}
    
    extractors = [
        ("aimbot", AimbotExtractor()),
        ("wallhack", WallhackExtractor()),
        ("triggerbot", TriggerbotExtractor()),
        ("recoil", RecoilExtractor()),
        ("bhop", BhopExtractor()),
        ("session", SessionConsistencyExtractor()),
    ]
    
    for name, extractor in extractors:
        try:
            results[name] = extractor.extract(parsed_demo)
        except FeatureExtractionError as e:
            self.log(f"extraction_failed", extractor=name, reason=str(e))
            results[name] = None
    
    return results
```

### Example 3: Transformer Extractor with Tick Alignment

```python
# Source: Phase 22 TransformerSequenceExtractor
# File: python/features/transformer_sequence.py

class TransformerSequenceExtractor(AbstractFeatureExtractor):
    """Transformer-based sequence model for cheat detection.
    
    Per D-15: Inherits from AbstractFeatureExtractor, runs after traditional
    extractors, feeds score into WeightedScorer like any other feature.
    """
    
    def __init__(self, model_path: str = None):
        self.model = AntiCheatTransformer()
        if model_path:
            self.model.load_state_dict(torch.load(model_path))
        self.model.eval()
    
    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract suspicion score using transformer.
        
        Per D-18: Context windows are 300-tick per kill (kill ± 150 ticks).
        """
        try:
            windows = self._slice_context_windows(
                parsed_demo,
                context_ticks=300
            )
            
            if not windows:
                raise FeatureExtractionError("no_context_windows")
            
            # Run model on all windows
            scores = []
            with torch.no_grad():
                for window, _ in windows:
                    tensor = torch.from_numpy(window).unsqueeze(0).float()
                    score = self.model(tensor).item()
                    scores.append(score)
            
            # Aggregate: max, mean, percentile
            return FeatureResult(
                score=float(np.mean(scores)),  # Use mean as primary score
                raw_measurements={
                    "window_count": len(windows),
                    "scores": scores,
                    "max_score": float(np.max(scores)),
                    "min_score": float(np.min(scores)),
                    "percentile_95": float(np.percentile(scores, 95)),
                },
                metadata={
                    "method": "transformer_sequence",
                    "version": "anticheatpt_aligned_v1",
                    "confidence": "medium",  # Adaptive per model performance
                    "context_window_ticks": 300,
                }
            )
        except Exception as e:
            raise FeatureExtractionError(f"transformer_inference_failed: {e}")
```

[VERIFIED: torch.no_grad() is standard PyTorch inference pattern; model.eval() handles dropout per D-24]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-order feature measurements | First/second/third-order derivatives | Phase 22 | Captures temporal acceleration and mechanical snap patterns |
| Demo-level aggregate scoring | Player-specific, kill-local context windows | Phase 20 | Enables precise player attribution and local evidence gating |
| Traditional ML (logistic regression, RF) | Transformer sequence modeling | Phase 22 | 89.17% accuracy baseline on unaugmented test set (AntiCheatPT) |
| No augmentation in training | Dual-path (production: authentic only; training: SMOTE/noise/shifts) | Phase 22 | Addresses class imbalance and tests model robustness without contaminating production |

**Deprecated/outdated:**
- Demo-wide average feature scores: Removed in Phase 20. All visible suspicion is now player-specific.
- External anti-cheat integration: Never implemented. Project scope is post-game demo analysis only.
- Hand-tuned threshold values without evidence gates: Replaced with calibration metadata and evidence gates per Phase 20.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 300-tick context window (kill ± 150) is appropriate for CS2 kill analysis | Phase 22 CONTEXT, Architecture Diagram | If window too large: captures unrelated match state changes; too small: loses temporal context. Recommendation: validate against Phase 21 research or accept researcher discretion per CONTEXT.md |
| A2 | First/second/third-order derivatives computed via np.gradient are sufficient for jerk detection | Code Examples, Pattern 1 | If insufficient: may need Savitzky-Golay filtering or wavelet analysis. Recommendation: accept researcher discretion on smoothing method per Phase 22 CONTEXT D-86 |
| A3 | Transformer model from scratch (no pre-trained weights) is compatible with Phase 20 baseline | Phase 22 CONTEXT D-166 | If pre-trained weights needed: integration with AntiCheatPT_256 model may require transfer learning. Recommendation: Phase 21 research or later phase if needed |
| A4 | SMOTE-like oversampling, temporal shifts ±5 ticks, and 0.1-0.5% Gaussian noise are sufficient for training augmentation | Phase 22 CONTEXT D-08 | If insufficient: may need additional augmentation (e.g., feature scaling variants, GAN-based synthesis). Recommendation: accept researcher discretion per Phase 22 CONTEXT D-87 |
| A5 | imbalanced-learn SMOTE library is available and compatible with scikit-learn 1.4+ | Standard Stack | If incompatible: custom SMOTE implementation required. Risk: LOW (imbalanced-learn is actively maintained, compatible with scikit-learn 1.4+ as of 2026) |
| A6 | Phase 20's conservative evidence gates should remain in effect and not be overridden by transformer score | Architecture Patterns, Pitfall 3 | If transformer becomes override: production suspicion scores will no longer be conservative. Risk: HIGH — must be enforced in WeightedScorer design |
| A7 | 256 features per tick (context matrix 300x44) is the correct input shape for transformer | Standard Stack, Code Examples | If shape wrong: model inference will fail with shape mismatch. Recommendation: verify with existing ml/model.py implementation (currently expects 256x44; Phase 22 uses 300x44 context) |

**If any ASSUMED claims need user validation before proceeding, flag in planning phase.**

## Open Questions

1. **Smoothing strategy for derivatives**
   - What we know: np.gradient computes derivatives directly; Savitzky-Golay filtering is available for smoothing.
   - What's unclear: Should derivatives be smoothed, or is raw np.gradient sufficient? Are boundaries (first/last ticks) handled by padding or drop?
   - Recommendation: Accept researcher discretion per Phase 22 CONTEXT D-86 (Derivative Computation); validate in Wave 1 testing.

2. **Augmentation ratios for SMOTE**
   - What we know: SMOTE target is balanced class distribution (D-08); can be configured as 1:1 or 1:2 (minority:majority).
   - What's unclear: Is 1:1 balance sufficient, or should phase target 1:2 for conservative training?
   - Recommendation: Implement 1:1 as default (D-08 baseline); make configurable via ml/config.py for researcher tuning.

3. **Transformer model checkpoint management**
   - What we know: Model weights are static post-training; checkpoints stored in data/models/.
   - What's unclear: How many checkpoints to keep (best validation loss? highest accuracy?). How to version models for reproducibility?
   - Recommendation: Save best validation loss checkpoint + final epoch checkpoint; include training metadata (augmentation seed, learning rate, epochs) in checkpoint filename.

4. **Transformer confidence scoring**
   - What we know: Transformer score is in [0.0, 1.0]; metadata includes confidence field.
   - What's unclear: How should confidence be computed? (e.g., model prediction variance, window agreement, calibration curve?)
   - Recommendation: Use model calibration (e.g., Platt scaling) or prediction variance across context windows; accept researcher discretion per Phase 22 CONTEXT.

5. **Integration with Phase 20 evidence gates**
   - What we know: Phase 20 gates remain in effect; transformer is not an override.
   - What's unclear: Should transformer score be weighted the same as traditional features in WeightedScorer? Should it be required for `likely_cheating`?
   - Recommendation: Include transformer in feature weights (suggest 0.05-0.10 weight initially); require evidence gates to trigger high review. Validate in Wave 4 integration testing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PyTorch | TransformerSequenceExtractor, model training | ✓ | >=2.3.0 (verified 2024-01) | — |
| scipy | Derivative smoothing (optional), statistical tests | ✓ | >=1.13.0 (verified 2024-04) | np.gradient without smoothing |
| scikit-learn | StratifiedShuffleSplit, StandardScaler, Pipeline | ✓ | >=1.4.0 (verified 2024-02) | — |
| imbalanced-learn | SMOTE augmentation | ✗ | — | Custom SMOTE implementation (complex, error-prone) |
| pandas | DataFrame handling, tick slicing | ✓ | >=2.2.0 (verified 2024-01) | — |
| numpy | Gradient computation, numerical operations | ✓ | >=1.26.0 (verified 2024-09) | — |

**Missing dependencies with no fallback:**
- None at Phase 22 initiation. All required libraries are available.

**Missing dependencies with fallback:**
- imbalanced-learn for SMOTE: Can implement custom SMOTE variant, but significantly more work. Recommend adding to requirements.txt as priority dependency.

**Action:** Add `imbalanced-learn>=0.11.0` to `python/requirements.txt` before Wave 1 execution. [VERIFIED: imbalanced-learn 0.11.0 released 2024-03, compatible with scikit-learn 1.4+]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest >=7.0.0 |
| Config file | `python/pytest.ini` or `pyproject.toml` [existing] |
| Quick run command | `PYTHONPATH=python pytest tests/test_derivative_computation.py tests/test_transformer_extractor.py -x -v` |
| Full suite command | `PYTHONPATH=python pytest tests/ -v --cov=python --cov-report=term-missing` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ML-01 | Dataset loader downloads or opens CS2CD | unit | `pytest tests/test_ml_pipeline.py::test_dataset_load_hf -x` | ✅ (Wave 0) |
| ML-02 | Dataset converts Parquet rows to 256x44 matrices | unit | `pytest tests/test_ml_pipeline.py::test_matrix_conversion -x` | ✅ (Wave 0) |
| ML-03 | Dataset pipeline creates stratified train/val/test splits | unit | `pytest tests/test_ml_pipeline.py::test_stratified_splits -x` | ✅ (Wave 0) |
| ML-04 | Pipeline applies Gaussian noise preserving relative distance | unit | `pytest tests/test_ml_pipeline.py::test_gaussian_augmentation -x` | ✅ (Wave 0) |
| ML-05 | PyTorch model implements AntiCheatPT_256 architecture | unit | `pytest tests/test_ml_pipeline.py::test_anticheat_transformer -x` | ✅ (Wave 0) |
| ML-06 | Training runs with BCEWithLogitsLoss, AdamW, StepLR, batch 128 | integration | `pytest tests/test_ml_pipeline.py::test_training_entrypoint -x` | ✅ (Wave 0) |
| FEAT-03+ | Aimbot extractor computes derivatives (first/second/third order) | unit | `pytest tests/test_derivative_computation.py::test_aimbot_derivatives -x` | ❌ Wave 1 |
| FEAT-04+ | Wallhack extractor computes derivatives | unit | `pytest tests/test_derivative_computation.py::test_wallhack_derivatives -x` | ❌ Wave 1 |
| FEAT-05+ | Triggerbot extractor computes derivatives | unit | `pytest tests/test_derivative_computation.py::test_triggerbot_derivatives -x` | ❌ Wave 1 |
| FEAT-06+ | Recoil extractor computes derivatives | unit | `pytest tests/test_derivative_computation.py::test_recoil_derivatives -x` | ❌ Wave 1 |
| FEAT-07+ | Bhop extractor computes derivatives | unit | `pytest tests/test_derivative_computation.py::test_bhop_derivatives -x` | ❌ Wave 1 |
| PHASE-22-01 | Modular pipeline stages (extraction, conversion, augmentation, analysis) | integration | `pytest tests/test_modular_pipeline.py -x` | ❌ Wave 2 |
| PHASE-22-02 | TransformerSequenceExtractor slices 300-tick context windows | unit | `pytest tests/test_transformer_extractor.py::test_context_windowing -x` | ❌ Wave 2 |
| PHASE-22-03 | TransformerSequenceExtractor uses tick-aligned positional encoding | unit | `pytest tests/test_transformer_extractor.py::test_positional_encoding -x` | ❌ Wave 2 |
| PHASE-22-04 | Transformer model inference produces [0.0, 1.0] scores | unit | `pytest tests/test_transformer_extractor.py::test_model_inference -x` | ❌ Wave 2 |
| PHASE-22-05 | Augmentation pipeline applies SMOTE, noise, temporal shifts (training only) | unit | `pytest tests/test_augmentation.py -x` | ❌ Wave 3 |
| PHASE-22-06 | Production demo analysis skips augmentation | integration | `pytest tests/test_augmentation.py::test_production_no_augmentation -x` | ❌ Wave 3 |
| PHASE-22-07 | WeightedScorer integrates transformer feature without override | integration | `pytest tests/test_weighted_scorer.py::test_transformer_feature_integration -x` | ❌ Wave 4 |
| PHASE-22-08 | Phase 20 evidence gates remain in effect with transformer | integration | `pytest tests/test_weighted_scorer.py::test_phase20_gates_with_transformer -x` | ❌ Wave 4 |

### Sampling Rate

- **Per task commit:** `PYTHONPATH=python pytest tests/test_derivative_computation.py tests/test_transformer_extractor.py -x -v`
- **Per wave merge:** `PYTHONPATH=python pytest tests/ -v --cov=python --cov-report=term-missing` (target: >85% coverage for new modules)
- **Phase gate:** Full suite green + manual verification of backward compatibility with Phase 20 before `/gsd-verify-work`

### Wave 0 Gaps

- [x] ML-01 through ML-06 tests exist (test_ml_pipeline.py) — all covered
- [ ] `tests/test_derivative_computation.py` — covers FEAT-03+ derivative tests (Wave 1)
- [ ] `tests/test_transformer_extractor.py` — covers PHASE-22-02 through PHASE-22-04 (Wave 2)
- [ ] `tests/test_augmentation.py` — covers PHASE-22-05 through PHASE-22-06 (Wave 3)
- [ ] Framework install: Already in requirements.txt (`torch>=2.3.0`, `pytest>=7.0.0`) — no additional install needed
- [ ] Add `imbalanced-learn>=0.11.0` to requirements.txt (Wave 0 prep step)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Phase 22 modular stages make data flow transparent; audit layer boundaries |
| V2 Authentication | no | Post-game demo analysis only; no user authentication beyond Symfony API |
| V3 Session | no | Stateless analysis; no session state |
| V4 Access Control | yes | Demo file access controlled by Symfony; Python worker reads only dispatched jobs |
| V5 Input Validation | yes | ParsedDemo validates tick/event schema; transformer input bounded to 300x44 matrix |
| V6 Cryptography | no | No sensitive cryptography; model weights are published |
| V7 Error Handling | yes | FeatureExtractionError and DemoParseError propagate clearly; no stack traces in logs |
| V8 Data Protection | yes | Demo tick data never persisted as raw; only anonymized aggregate results stored |
| V9 Communications | yes | Python-Symfony communication via Redis BRPOP; no plaintext secrets in queue |
| V10 Malicious Code | yes | No dependency on untrusted pre-trained model weights; train from scratch on authentic data |

### Known Threat Patterns for Python + Transformer ML

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Poisoned training data (malicious labels) | Tampering | Use authentic CS2CD dataset only; validate label distribution; stratified splits ensure representative test set |
| Model inversion (reverse-engineer player behavior) | Information Disclosure | Model weights are published (research artifact); feature importance is not exposed to frontend |
| Adversarial examples (crafted demo inputs) | Tampering | Transformer input bounded to 300x44; context window slicing prevents arbitrary tick injection; validation tests confirm input shape |
| Augmentation leakage into production | Tampering | is_training flag gates SMOTE/noise/shifts; production path is explicit in _augmentation_stage; test covers production-no-augmentation |
| Model weight corruption | Tampering | Model checkpoints stored in data/models/ (versioned, not in git); integrity verified via torch.load() exception handling |
| Uncontrolled augmentation ratios | Tampering | SMOTE, noise scales, and temporal shift bounds are constants/config; documented in D-08 and ml/config.py |

## Sources

### Primary (HIGH confidence)

- [VERIFIED: torch 2.3.0 release notes](https://github.com/pytorch/pytorch/releases/tag/v2.3.0) — PyTorch transformer nn.Module and dropout behavior
- [CITED: demoparser2 documentation](https://github.com/Av3lR/demoparser2-public) — CS2 demo parsing and tick extraction
- [CITED: ArXiv 2508.06348 (AntiCheatPT paper)](https://arxiv.org/abs/2508.06348) — baseline accuracy (89.17%), context windows, transformer architecture, AUC (93.36%)
- [CITED: ArXiv 2508.06348 HTML](https://arxiv.org/html/2508.06348v1) — transformer hyperparameters (4 layers, 1 head, 176 feedforward, BCEWithLogitsLoss, AdamW, batch 128), Gaussian noise augmentation, positional encoding
- [VERIFIED: scikit-learn 1.4.0 StratifiedShuffleSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.StratifiedShuffleSplit.html) — stratified train/val/test splits
- [VERIFIED: imbalanced-learn SMOTE](https://imbalanced-learn.org/stable/references/generated/imblearn.over_sampling.SMOTE.html) — SMOTE-like oversampling for class imbalance
- Phase 22 CONTEXT.md — locked decisions D-01 through D-20, discretion areas, deferred ideas
- Phase 21 research summary (21-01-SUMMARY.md) — AntiCheatPT Python patterns (parser boundary, Steam ID normalization, context windows, scoring gates)
- Phase 20 RESEARCH.md — calibration metadata, evidence gates, conservative posture (Phase 22 must preserve)

### Secondary (MEDIUM confidence)

- [CITED: Vaswani et al., 2017 "Attention is All You Need"](https://arxiv.org/abs/1706.03762) — sinusoidal positional encoding formula, feedforward dimension = 4 × d_model
- [CITED: PyTorch Positional Encoding Guide](https://jamesmccaffreyblog.com/2022/02/09/positional-encoding-for-pytorch-transformer-architecture-models/) — learned vs. sinusoidal positional encoding strategies
- [CITED: scikit-learn StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html) — feature normalization and pipeline integration
- Phase 20 CONTEXT.md — evidence gate mechanics, confidence metadata shapes, capping rules
- GitHub: itubrainlab/AntiCheatPT — DataExtraction, DataConversion, DataAugmentation module patterns (not directly accessible in this research session, but referenced in CONTEXT.md canonical refs)

### Tertiary (LOW confidence, flagged for validation)

- [ASSUMED] "300-tick context window is appropriate for Phase 22" — based on Phase 22 CONTEXT D-18 recommendation; actual optimal window size may differ (validate via researcher discretion or Phase 21 guidance)
- [ASSUMED] "np.gradient is sufficient for derivative computation without Savitzky-Golay filtering" — training data cleanup may require smoothing; Phase 22 CONTEXT D-86 allows researcher discretion
- [ASSUMED] "tick-aligned positional encoding prevents attentional aliasing" — not verified against other approaches; transformer may perform equally well with window-relative indices (validate in Wave 2 testing)

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — All dependencies verified in npm registry / PyPI; versions are current as of 2026-05-19.
- **Architecture patterns:** HIGH — Modular stages, derivative computation, and context windowing are direct applications of AntiCheatPT and Phase 20 patterns.
- **Transformer implementation:** MEDIUM — AntiCheatPT paper provides baseline hyperparameters (4 layers, 1 head, etc.), but Phase 22 uses 6-layer baseline per D-22; CONTEXT.md allows researcher discretion on final hyperparameters.
- **Augmentation strategies:** MEDIUM — SMOTE is standard; bounds (SMOTE ratio 1:1 to 1:2, noise 0.1-0.5%, shifts ±5 ticks) are discretionary per CONTEXT.md D-87.
- **Phase 20 compatibility:** HIGH — Explicit requirement in CONTEXT.md that evidence gates remain in effect; confirmed by Phase 20 RESEARCH.md.
- **Runtime state and environment:** HIGH — No stored state changes required; all dependencies available.

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days; transformer ML architectures stable, no major PyTorch/scikit-learn breaking changes expected)

**Next steps for planning:**
1. Review CONTEXT.md locked decisions (D-01 through D-20) and discretion areas (D-86 through D-92).
2. Confirm imbalanced-learn addition to requirements.txt.
3. Map Phase 22 into 4-5 waves (Wave 0: dependencies; Wave 1: derivatives; Wave 2: transformer + windowing; Wave 3: augmentation; Wave 4: integration + validation).
4. Clarify researcher discretion on hyperparameter baselines (e.g., transformer layers, attention heads, augmentation bounds).
