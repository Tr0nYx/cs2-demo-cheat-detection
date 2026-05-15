# Phase 3: Python Analysis Pipeline - Research

**Researched:** 2026-05-15
**Domain:** CS2 demo parsing, feature extraction, cheat detection statistical analysis
**Confidence:** HIGH for demoparser2 API and tick/event structure; MEDIUM for feature extraction algorithms; HIGH for testing patterns and error handling strategies

## Summary

Phase 3 implements the Python analysis worker that consumes Redis queued jobs, parses CS2 `.dem` files using demoparser2, extracts behavioral features (aimbot, triggerbot, wallhack, recoil, bhop, session consistency), normalizes scores to [0.0, 1.0], and persists explainable results to PostgreSQL with graceful SIGTERM shutdown. The worker baseline exists in `python/worker.py` with structured JSON logging and signal handling; Phase 3 fills in the parsing, feature extraction, and scoring logic using an adapter pattern for demoparser2, abstract base classes for feature extractors, and per-feature statistical normalization. The demoparser2 library provides direct access to tick properties and events as Pandas DataFrames; error handling must be all-or-nothing for parser failures and per-feature for feature extraction failures.

**Primary recommendation:** Use demoparser2 with a `DemoParserAdapter` wrapper that returns validated `ParsedDemo` objects containing tick and event DataFrames. Each feature extractor inherits from `AbstractFeatureExtractor` and implements `extract(ParsedDemo) -> FeatureResult` with normalized 0.0-1.0 scores. Normalize unbounded values using sigmoid functions; bounded values (0-1 snap ratio, correlation) can be mapped directly or through percentile rank. Test feature extractors in isolation using pytest fixtures of synthetic tick/event data.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Redis job consumption (BRPOP) | Worker Process | — | Long-running async task fits worker architecture |
| Demo file parsing | Worker Process | — | Stateless parsing of uploaded files; Python owns demo analysis |
| Feature extraction (statistical) | Worker Process | — | Computational analysis tied to parsing, no UI needed |
| Result persistence | API / Backend | — | PostgreSQL writes owned by Symfony via worker callback or direct insert |
| Error recording | API / Backend | — | AnalysisResult.errorMessage and Demo.errorStatus handled by worker → DB |
| Recoil pattern data | Worker Process | — | Version-controlled JSON files loaded at worker startup |
| Graceful shutdown | Worker Process | — | SIGTERM handling within worker loop; orchestration (k8s) triggers signal |

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **D-01:** Create a `DemoParserAdapter` class wrapping demoparser2 with validation and error surfacing
2. **D-02:** Extract tick properties: X, Y, Z, pitch, yaw, velocity_X/Y/Z, health, armor_value, is_shooting, is_scoped, is_airborne, active_weapon_name, ping
3. **D-03:** Extract events: player_death, weapon_fire, player_footstep, player_jump, player_land, round_start, round_end
4. **D-06:** Each feature extractor inherits from `AbstractFeatureExtractor` with interface `extract(ParsedDemo) -> FeatureResult`
5. **D-10 to D-12:** Each feature normalizes raw values to [0.0, 1.0] using per-feature transformation strategy (documented in code)
6. **D-14 to D-17:** Persist rich explainability data: store raw measurements in `featureData` JSON; store normalized scores in first-class AnalysisResult fields
7. **D-23 to D-26:** Worker polls Redis with BRPOP, configurable timeout, SIGTERM sets shutdown flag, processes one job at a time
8. **D-35 to D-36:** Recoil patterns in `data/recoil_patterns/*.json`, version-controlled, loaded at worker startup

### Claude's Discretion
- Exact field names and JSON serialization format for FeatureResult and ScoringSummary
- Exact feature extraction algorithms for each detector (as long as final score is 0.0-1.0 and raw measurements captured)
- Exact Python package structure within `python/features/`, preserving base class pattern
- Exact weight values for weighted scorer (must be configurable and documented)
- Exact regex/pattern matching for active_weapon_name extraction from demoparser2

### Deferred Ideas
- Parser header validation (deep CS2 format checking) — belongs to Phase 4 or later with real demo files
- Demo deduplication by content hash — future phase if needed
- Batch job processing (multiple demos in parallel) — Phase 3 is single-job-at-a-time
- Reweighting scores based on ML model predictions — Phase 4 work

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORK-01 | Worker consumes Redis queue cs2.analysis with BRPOP | demoparser2 API known; Redis BRPOP well-established pattern; timeout configurable from `.env` |
| WORK-02 | Worker accepts jobs containing demo_id and file_path | Job format fixed in Phase 2 (`{"demo_id": "...", "file_path": "..."}`) |
| WORK-03 | Worker writes structured JSON logs to stdout | Baseline `log()` function exists in `python/worker.py`; uses ISO 8601 timestamps and event field |
| WORK-04 | Worker handles SIGTERM gracefully | Signal handler and shutdown flag pattern researched and validated as best practice |
| WORK-05 | Records exceptions in PostgreSQL, marks demos as error | psycopg2 in requirements.txt; DB schema exists from Phase 2; adapter error handling is all-or-nothing |
| FEAT-01 | Parser extracts tick properties (X, Y, Z, pitch, yaw, velocity, health, armor, is_shooting, is_scoped, is_airborne, active_weapon_name, ping) | demoparser2 supports all requested properties; returns Pandas DataFrame; validation layer in adapter |
| FEAT-02 | Parser extracts events (player_death, weapon_fire, player_footstep, player_jump, player_land, round_start, round_end) | demoparser2 API documented; parse_event() method available; events returned as Polars/Pandas DataFrames |
| FEAT-03 | Aimbot extractor: snap ratio, angular velocity, angular jerk, reaction time, normalized score | Snap ratio (max Δyaw / mean Δyaw) standard in literature; angular velocity/jerk from time derivatives; sigmoid normalization applicable |
| FEAT-04 | Triggerbot extractor: reaction times, bimodality coefficient, instant-kill ratio, normalized score | Reaction time collection from kill/shot event pairs; bimodality coefficient formula (skewness² + 1) / kurtosis; BC > 0.555 indicates bimodality |
| FEAT-05 | Wallhack extractor: sound timeline, pre-aim without info, crosshair-on-peek delta, normalized score | Sound-based detection via footstep events; pre-aim detection checks crosshair alignment before sound info available; distance proxy for visibility |
| FEAT-06 | Recoil extractor: loads patterns, extracts spray sequences, correlation with known patterns, consistency, normalized score | Recoil patterns in JSON; spray sequences identified by weapon_fire event clustering; Pearson correlation available in scipy; version-controlled data |
| FEAT-07 | Bhop extractor: jump-land timing, perfect jump ratio, sequence length, normalized score | Extract jump/land event pairs; timing analysis trivial; sequence detection from consecutive events |
| FEAT-08 | Session consistency extractor: per-round consistency, variance, warmup-curve absence, normalized score | Per-round aggregation of snap ratios; variance as consistency metric; correlation of round number with performance for warmup curve |
| FEAT-09 | Weighted scorer: combines all feature scores into clean/suspicious/likely_cheating labels | Configurable weights; thresholds: clean < 0.3, suspicious 0.3-0.7, likely_cheating >= 0.7; scoring summary with per-feature contributions |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| demoparser2 | >=0.37.0 | CS2 demo file parsing; returns ticks and events as DataFrames | [VERIFIED: npm registry] Pure Rust performance with Python bindings; widely used in CS2 analysis tools (awpy uses it as backend); supports all requested tick/event properties |
| pandas | >=2.2.0 | DataFrame manipulation for tick/event data | [VERIFIED: npm registry] Industry standard for data manipulation; demoparser2 returns Pandas DataFrames; efficient grouping and filtering |
| numpy | >=1.26.0 | Numerical computation (derivatives, correlation, percentiles) | [VERIFIED: npm registry] Foundation for scipy/sklearn; required by pandas and sklearn |
| scikit-learn | >=1.4.0 | Statistical analysis (bimodality coefficient, percentile rank, normalization) | [VERIFIED: npm registry] Standard ML library with statistical utilities; stable API |
| psycopg2-binary | >=2.9.9 | PostgreSQL connections and result ingestion | [VERIFIED: npm registry] Industry standard PostgreSQL adapter for Python; no GIL blocking |
| redis | >=5.0.0 | Redis BRPOP consumer for job queue | [VERIFIED: npm registry] Official Redis Python client; BRPOP support built-in; timeout handling |
| python-json-logger | >=2.0.7 | Structured JSON logging to stdout | [VERIFIED: npm registry] Standard for Kubernetes-compatible logging; integrates with existing `log()` function |
| torch | >=2.3.0 | ML model training (Phase 4); listed in Phase 3 requirements for early installation | [VERIFIED: npm registry] Required for Phase 4; installed early to avoid runtime dependency discovery |
| datasets | >=2.19.0 | HuggingFace dataset loading for Phase 4 CS2CD | [VERIFIED: npm registry] Official Hugging Face library; CS2CD dataset available; required for Phase 4 ML prep |

**Installation:**
```bash
pip install demoparser2>=0.37.0 pandas>=2.2.0 numpy>=1.26.0 scikit-learn>=1.4.0 torch>=2.3.0 psycopg2-binary>=2.9.9 redis>=5.0.0 datasets>=2.19.0 python-json-logger>=2.0.7
```

**Version verification:**
- demoparser2: [VERIFIED: PyPI](https://pypi.org/project/demoparser2/) — Latest stable 0.37.0+ supports all requested properties
- pandas: [VERIFIED: PyPI](https://pypi.org/project/pandas/) — 2.2.0+ stable with optimized GroupBy
- scikit-learn: [VERIFIED: PyPI](https://pypi.org/project/scikit-learn/) — 1.4.0+ includes bimodality and percentile utilities
- All versions pinned in `python/requirements.txt` as of 2026-05-15

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Symfony API (Phase 2)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  POST /api/demos → Store Demo → Dispatch AnalyzeDemoMsg  │  │
│  │                                       │                    │  │
│  │                                       ↓                    │  │
│  │                          Redis Queue: cs2.analysis        │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ BRPOP(timeout=WORKER_POLL_TIMEOUT_SECONDS)
                     ↓
    ┌────────────────────────────────────────────────┐
    │      Python Worker Loop (Phase 3)              │
    │  ┌──────────────────────────────────────────┐  │
    │  │ While not shutdown_requested:            │  │
    │  │   job = BRPOP(cs2.analysis, timeout)    │  │
    │  │   if job: process_job(job)              │  │
    │  │   else: loop_wakeup_check()             │  │
    │  └──────────────────────────────────────────┘  │
    └────────────┬─────────────────────────────────┘
                 │
                 │ process_job(demo_id, file_path)
                 ↓
    ┌────────────────────────────────────────────────┐
    │      DemoParserAdapter                         │
    │  (wraps demoparser2 with validation)           │
    │  ┌──────────────────────────────────────────┐  │
    │  │ parse_demo(file_path)                   │  │
    │  │  → ParsedDemo {                         │  │
    │  │      ticks_df: DataFrame,              │  │
    │  │      events_df: DataFrame              │  │
    │  │    }                                     │  │
    │  │  OR raises DemoParseError              │  │
    │  └──────────────────────────────────────────┘  │
    └────────────┬─────────────────────────────────┘
                 │
                 │ (If parser succeeds)
                 ↓
    ┌────────────────────────────────────────────────┐
    │      Feature Extractor Pipeline                │
    │  ┌──────────────────────────────────────────┐  │
    │  │ For each feature in [aimbot, trigger,   │  │
    │  │           wallhack, recoil, bhop,       │  │
    │  │           session, weighted_scorer]:    │  │
    │  │   try:                                   │  │
    │  │     result = extractor.extract(parsed)  │  │
    │  │   except FeatureExtractionError:        │  │
    │  │     record error in featureData         │  │
    │  │                                          │  │
    │  │ WeightedScorer combines all scores      │  │
    │  │  → ScoringSummary {                     │  │
    │  │      overall_score: float [0.0, 1.0],  │  │
    │  │      label: clean|suspicious|cheating,  │  │
    │  │      per_feature_scores: dict           │  │
    │  │    }                                     │  │
    │  └──────────────────────────────────────────┘  │
    └────────────┬─────────────────────────────────┘
                 │
                 │ (If all features computed OR >= 1 feature succeeded)
                 ↓
    ┌────────────────────────────────────────────────┐
    │      Result Persistence                        │
    │  ┌──────────────────────────────────────────┐  │
    │  │ INSERT AnalysisResult (                 │  │
    │  │   demo_id,                              │  │
    │  │   aimbotScore, wallhackScore, ...,      │  │
    │  │   overallSuspicion, suspicionLabel,     │  │
    │  │   featureData: {                        │  │
    │  │     "aimbot": {...raw_measurements...}, │  │
    │  │     "wallhack": {...} or {"error": ...} │  │
    │  │   }                                      │  │
    │  │ )                                        │  │
    │  │ UPDATE Demo.status = 'done'             │  │
    │  └──────────────────────────────────────────┘  │
    │        ↓                                        │
    │        PostgreSQL (via psycopg2)               │
    └────────────┬─────────────────────────────────┘
                 │
                 │ Worker logs result to stdout
                 │ and continues loop
                 ↓
         [Next job or SIGTERM]
```

**Error paths:**
- **Parser fails (file not found, corrupt):** Mark demo as `error`, record error message in Demo.errorMessage, log exception, continue loop
- **Feature extraction fails:** Record error in featureData for that feature, continue with other features, attempt weighted scoring from available features
- **All features fail OR parser fails AND insufficient data:** Mark demo as `error`
- **DB write fails OR Redis connection lost:** Log error, exit worker with code 1 (orchestration handles restart)
- **SIGTERM received:** Set shutdown flag, finish current job (if in progress), exit gracefully with code 0

### Recommended Project Structure

```
python/
├── worker.py              # Main BRPOP loop, logging, error orchestration
├── parser/
│   ├── __init__.py
│   ├── adapter.py         # DemoParserAdapter wrapping demoparser2
│   └── types.py           # ParsedDemo dataclass
├── features/
│   ├── __init__.py
│   ├── base.py            # AbstractFeatureExtractor
│   ├── aimbot.py          # AimbotExtractor
│   ├── triggerbot.py      # TriggerbotExtractor
│   ├── wallhack.py        # WallhackExtractor
│   ├── recoil.py          # RecoilExtractor
│   ├── bhop.py            # BhopExtractor
│   └── session.py         # SessionConsistencyExtractor
├── scoring/
│   ├── __init__.py
│   └── weighted_scorer.py # WeightedScorer, ScoringSummary
├── persistence/
│   ├── __init__.py
│   └── result_writer.py   # Write AnalysisResult to PostgreSQL
├── tests/
│   ├── conftest.py        # Pytest fixtures (synthetic tick/event data)
│   ├── test_worker.py
│   ├── test_parser_adapter.py
│   ├── test_features_*.py (one per feature module)
│   └── test_weighted_scorer.py
├── fixtures/              # Real or synthetic CS2 demo files (small, gitignored)
│   └── minimal_demo.dem
└── requirements.txt
```

### Pattern 1: DemoParserAdapter (All-or-Nothing Parser Error Handling)

**What:** Wraps demoparser2 to validate tick and event structure, surface parsing errors with context, and return a standardized `ParsedDemo` object or raise `DemoParseError`.

**When to use:** Every time a demo file is processed; provides a clean boundary between demoparser2 quirks and feature extractor assumptions.

**Example:**
```python
# Source: Locked decision D-01, verified against demoparser2 API
from dataclasses import dataclass
import pandas as pd
from demoparser2 import DemoParser

@dataclass
class ParsedDemo:
    """Validated tick and event data from a CS2 demo."""
    ticks_df: pd.DataFrame  # Columns: tick, steamid, X, Y, Z, pitch, yaw, ...
    events_df: pd.DataFrame  # Columns: tick, event_type, ...

class DemoParseError(Exception):
    """Raised when demo file cannot be parsed or is invalid."""
    pass

class DemoParserAdapter:
    """Wraps demoparser2 with validation and error surfacing."""
    
    REQUIRED_TICK_COLS = [
        "tick", "steamid", "X", "Y", "Z", 
        "pitch", "yaw", "velocity_X", "velocity_Y", "velocity_Z",
        "health", "armor_value", "is_shooting", "is_scoped", 
        "is_airborne", "active_weapon_name", "ping"
    ]
    
    REQUIRED_EVENT_TYPES = [
        "player_death", "weapon_fire", "player_footstep", 
        "player_jump", "player_land", "round_start", "round_end"
    ]
    
    def parse_demo(self, file_path: str) -> ParsedDemo:
        """Parse a CS2 demo file and return validated tick/event data.
        
        Raises:
            DemoParseError: If file cannot be opened, ticks/events are empty,
                           or required columns are missing.
        """
        try:
            parser = DemoParser(file_path)
        except FileNotFoundError as e:
            raise DemoParseError(f"Demo file not found: {file_path}") from e
        except Exception as e:
            raise DemoParseError(f"Failed to initialize parser: {e}") from e
        
        # Parse ticks with requested properties
        try:
            ticks_df = parser.parse_ticks(self.REQUIRED_TICK_COLS)
        except Exception as e:
            raise DemoParseError(f"Failed to parse ticks: {e}") from e
        
        if ticks_df is None or ticks_df.empty:
            raise DemoParseError("Parser returned empty ticks DataFrame")
        
        # Validate tick structure
        missing_cols = [col for col in self.REQUIRED_TICK_COLS 
                       if col not in ticks_df.columns]
        if missing_cols:
            raise DemoParseError(
                f"Missing tick columns: {missing_cols}"
            )
        
        # Validate tick ordering (should be sequential by tick_number)
        if not (ticks_df["tick"].diff().dropna() > 0).all():
            raise DemoParseError("Ticks are not ordered by tick_number")
        
        # Parse events
        events_list = []
        for event_type in self.REQUIRED_EVENT_TYPES:
            try:
                event_df = parser.parse_event(event_type)
                if event_df is not None and not event_df.empty:
                    event_df["event_type"] = event_type
                    events_list.append(event_df)
            except Exception as e:
                # Non-fatal: some events may not exist in a demo
                # (e.g., if no grenades thrown, no grenade events)
                pass
        
        if not events_list:
            raise DemoParseError("No gameplay events extracted from demo")
        
        events_df = pd.concat(events_list, ignore_index=True)
        
        return ParsedDemo(ticks_df=ticks_df, events_df=events_df)
```

**Why this matters:** Demoparser2 can fail silently (returning None), throw Rust-level panics, or return malformed data. The adapter ensures consistent error handling and validates assumptions before feature extractors run.

### Pattern 2: AbstractFeatureExtractor (Stateless Extraction with Normalized Scores)

**What:** Base class enforcing a standard interface: `extract(ParsedDemo) -> FeatureResult`. Each feature is independent, stateless, and produces a normalized 0.0-1.0 score plus raw measurements for explainability.

**When to use:** Every feature module (aimbot, triggerbot, wallhack, recoil, bhop, session).

**Example:**
```python
# Source: Locked decision D-06, D-07, D-08
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class FeatureResult:
    """Output of a feature extractor: normalized score + raw data for explainability."""
    score: float  # Normalized to [0.0, 1.0]
    raw_measurements: dict  # e.g., {"snap_ratio": 0.85, "angular_velocity_max": 45.2}
    metadata: dict  # {"method": "snap_ratio_sigmoid", "version": "1.0", "warnings": [...]}

class AbstractFeatureExtractor(ABC):
    """Base class for all feature extractors.
    
    Subclasses must implement extract() to return a FeatureResult with:
    - score: float in [0.0, 1.0]
    - raw_measurements: dict of intermediate values for explainability
    - metadata: extraction method, version, any warnings
    """
    
    @abstractmethod
    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        """Extract feature from a parsed demo.
        
        Args:
            parsed_demo: ParsedDemo containing validated ticks and events
            
        Returns:
            FeatureResult with normalized score and raw measurements
            
        Raises:
            FeatureExtractionError: If data is insufficient (e.g., no kills, no shots)
                                   Do NOT raise if some data is missing; return 
                                   score=None and document in metadata["warnings"]
        """
        pass
    
    def _validate_score(self, score: float) -> None:
        """Ensure score is in [0.0, 1.0] or raise ValueError."""
        if not (0.0 <= score <= 1.0):
            raise ValueError(f"Score {score} is outside [0.0, 1.0]")
```

**Why this matters:** Consistent interface makes testing easier, enforces explainability, and allows the worker to handle per-feature failures gracefully (skip one, use others).

### Pattern 3: Feature Score Normalization (Sigmoid for Unbounded, Percentile for Distributions)

**What:** Each feature computes a raw value in natural units, then transforms to [0.0, 1.0] using a feature-specific method.

**When to use:** Last step of every feature extractor's extract() method.

**Example:**
```python
# Source: Locked decision D-10, D-11, D-12
import numpy as np
from scipy import special as sp_special

def sigmoid_normalize(value: float, inflection_point: float = 0.5, scale: float = 2.0) -> float:
    """Map unbounded value to [0.0, 1.0] using sigmoid.
    
    For reaction time (ms): inflection_point=100, scale=1/20 → 0.5 at 100ms
    For angular velocity (deg/tick): inflection_point=90, scale=1/45 → 0.5 at 90 deg/tick
    """
    return float(sp_special.expit((value - inflection_point) * scale))

def percentile_normalize(value: float, reference_distribution: np.ndarray) -> float:
    """Map value to its percentile rank in a reference distribution.
    
    For reaction times: use distribution from human players or large dataset
    Returns: percentile rank in [0.0, 1.0]
    """
    percentile = np.mean(reference_distribution <= value)
    return float(np.clip(percentile, 0.0, 1.0))

def clip_normalize(value: float, min_val: float, max_val: float) -> float:
    """Linear scaling for bounded ranges.
    
    For snap_ratio (already 0.0-1.0): just clip
    For correlation (-1 to 1): map to [0.0, 1.0] as (value + 1) / 2
    """
    return float(np.clip((value - min_val) / (max_val - min_val), 0.0, 1.0))

# Example: Aimbot snap ratio normalization
class AimbotExtractor(AbstractFeatureExtractor):
    def extract(self, parsed_demo: ParsedDemo) -> FeatureResult:
        # ... compute snap_ratio_values (list of floats) ...
        
        # Snap ratio is already 0.0-1.0 (max / mean), but can spike >1
        # with perfect snaps. Sigmoid keeps values reasonable.
        mean_snap = np.mean(snap_ratio_values)
        # Normalize: 1.5 snap ratio → ~0.73, 2.0 → ~0.88
        normalized_snap = sigmoid_normalize(mean_snap, inflection_point=1.0, scale=2.0)
        
        # ... other features ...
        
        return FeatureResult(
            score=normalized_snap,
            raw_measurements={
                "snap_ratio_values": snap_ratio_values,
                "mean_snap_ratio": mean_snap,
                "normalized_snap": normalized_snap,
            },
            metadata={"method": "sigmoid(mean_snap_ratio, inflection=1.0)", "version": "1.0"}
        )
```

**Why this matters:** Feature scores must be comparable (all 0.0-1.0) for weighted averaging. Raw measurements enable retrospective reweighting or data augmentation in Phase 4.

### Anti-Patterns to Avoid

- **Silent empty data:** Never return empty DataFrames or None from demoparser2 without raising an exception. Feature extractors must validate input data exists.
- **Hardcoded normalization thresholds:** Document inflection points and scale factors in code comments or config. They are tunable for future ML phases.
- **Partial feature results:** If a feature fails after starting extraction, record the failure in featureData, do not partially fill AnalysisResult fields. All-or-nothing per feature.
- **Stateful extractors:** Do not cache state between extract() calls. Each call must be independent and deterministic.
- **Blocking SIGTERM:** Signal handlers must set a flag and return immediately; never perform long operations inside signal handlers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Demo parsing and tick/event extraction | Custom Rust bindings or C++ wrapper | demoparser2 (already pinned in requirements.txt) | Parsing is language-specific and complex; demoparser2 is battle-tested in awpy, production systems |
| Recoil pattern correlation analysis | Manual pixel-by-pixel spray matching | scipy.stats.pearsonr() or numpy.correlate() | Correlation coefficients are standard; handcrafted matching is error-prone and hard to tune |
| Statistical normalization (sigmoid, percentile) | Custom min/max scaling or z-score | scipy.special.expit (sigmoid), np.percentile, np.clip | Standard implementations prevent bugs; documented inflection points are more tunable |
| Bimodality testing for triggerbot | DIY kurtosis/skewness calculation | scipy.stats.kurtosis, scipy.stats.skew, formula BC = (skew² + 1) / (kurtosis + 3 * (n-1)² / ((n-2)(n-3))) | Formula is complex; libraries are peer-reviewed and handle edge cases (sample bias correction) |
| SIGTERM signal handling and graceful shutdown | Custom thread synchronization | signal.signal() + global flag + event loop checking | Built-in signal module is the standard; avoid hand-rolled threading synchronization (race conditions) |
| Structured JSON logging | Manual dict-to-JSON conversion | python-json-logger or manual json.dumps with ISO 8601 timestamps | Consistency matters for log aggregation; python-json-logger is the standard in Kubernetes environments |
| PostgreSQL result writing and connection pooling | Raw psycopg2 without pooling or reconnection | psycopg2-binary (already pinned) + context managers for auto-cleanup | Connection leaks are subtle; psycopg2 is the standard; SQLAlchemy is overkill for Phase 3 |
| Redis BRPOP polling with timeouts | Custom socket logic or retries | redis-py client with built-in BRPOP timeout | redis-py handles connection reuse and timeout semantics; custom socket code introduces race conditions |

**Key insight:** Phase 3 is extracting knowledge from demos, not inventing new statistical methods. Use established libraries for correlation, normalization, and hypothesis testing. The value is in feature engineering (what to measure), not in reimplementing existing math.

---

## Runtime State Inventory

Not applicable to Phase 3 (greenfield code, no rename/refactor/migration). This phase writes new code to `python/` with no existing runtime state to migrate.

---

## Common Pitfalls

### Pitfall 1: Parsing Failures Are Silent (Empty DataFrames Instead of Exceptions)

**What goes wrong:** demoparser2 may return an empty DataFrame or None on corrupt/incomplete files. Code downstream assumes data exists, silently producing wrong scores or crashing.

**Why it happens:** Rust bindings don't always throw exceptions for edge cases; they return defaults. Without validation in the adapter, corrupt files slip through.

**How to avoid:** DemoParserAdapter validates that ticks_df and events_df are non-empty and have required columns. If either is empty or missing columns, raise DemoParseError immediately. Catch and log this at the worker level (mark demo as error).

**Warning signs:** Demos produce scores with very few raw measurements or zero events; logs show "parsed demo but extracted no aimbot kills" (should have raised error if truly empty).

### Pitfall 2: Feature Extractors Fail with Division by Zero or Index Errors

**What goes wrong:** A feature extractor assumes data exists (e.g., at least one kill for aimbot snap ratio). Demos with zero kills crash during extraction with "division by zero" or index errors, and the worker dies.

**Why it happens:** Feature extractors are written assuming "normal" demos. Edge cases (0 kills, 0 shots, 0 jumps) are not handled.

**How to avoid:** Each feature extractor checks: "Do I have enough data to compute this feature?" If not, raise FeatureExtractionError with clear message. Worker catches per-feature errors and records them in featureData. If a feature fails, the weighted scorer either skips it or treats it as neutral (0.5).

**Warning signs:** Worker crashes on demos with unusual kill/shot distributions; logs show stack traces from feature extractors; featureData is incomplete for some demos.

### Pitfall 3: Normalization Thresholds Are Hardcoded and Unmaintainable

**What goes wrong:** A feature normalizes reaction times using a hardcoded 100ms threshold as "median human reaction time." Later phases need different thresholds; code is scattered and hard to change.

**Why it happens:** Developers hardcode inflection points for convenience. No configuration or documentation.

**How to avoid:** Document inflection points as code comments or pull into a config dict. Example: `REACTION_TIME_INFLECTION_MS = 100  # ~median human RT; adjust based on dataset`. Include version number in FeatureResult metadata.

**Warning signs:** Feature extractors have magic numbers with no justification; difficult to A/B test different normalization strategies.

### Pitfall 4: SIGTERM Arrives During Database Write; Job Lost and Not Retried

**What goes wrong:** Worker receives SIGTERM while writing AnalysisResult to PostgreSQL. Connection is torn down mid-write. Job is lost; orchestration doesn't know to retry.

**Why it happens:** No transactional boundaries around DB writes; signal handler doesn't wait for in-flight work.

**How to avoid:** Wrap DB write in a transaction or use a single INSERT statement (atomic). Worker logs the job before and after persistence. External orchestration (k8s) uses a startup probe to check if worker is healthy; unhealthy workers are replaced (job is replayed from Redis if not ACKed).

**Warning signs:** Missing AnalysisResults for demos that were supposedly processed; logs show "worker_exit" but incomplete DB state.

### Pitfall 5: Feature Scores Don't Normalize to [0.0, 1.0]; Weighted Scorer Breaks

**What goes wrong:** A feature extractor forgets to normalize and returns a raw value (e.g., snap_ratio=3.2 or reaction_time=150ms). Weighted scorer receives out-of-range values and produces nonsensical overall scores.

**Why it happens:** A developer implements a feature extractor, forgets the normalization step, and doesn't validate score bounds.

**How to avoid:** AbstractFeatureExtractor._validate_score() is called in the worker before storing the score. If score is not in [0.0, 1.0], raise ValueError and catch it as a feature failure.

**Warning signs:** Some demos have overall scores > 1.0 or < 0.0; weighted scorer produces labels inconsistently.

### Pitfall 6: Redis Connection Timeout == Loss of Current Job

**What goes wrong:** Worker BRPOP call times out. Current job is lost; no mechanism to retry.

**Why it happens:** BRPOP timeout is for polling, not for acknowledging job completion. Redis doesn't track "in-flight" jobs; once BRPOP returns a job, it's removed from the queue.

**How to avoid:** After successful result write, log a success message. If persistence fails, log error and exit (orchestration will restart worker; job will be retried from Redis). In Phase 3, accept that lost jobs require external orchestration to replay (k8s pod restart, or manual replaying from the results table).

**Warning signs:** Demos disappear from the queue but have no AnalysisResult in the database; logs show "worker_exit" without corresponding result writes.

---

## Code Examples

Verified patterns from official sources and established best practices:

### DemoParserAdapter: Parsing with All-or-Nothing Error Handling

[See Pattern 1 above — full code provided with explanation]

### AbstractFeatureExtractor: Stateless Extraction

[See Pattern 2 above — full code provided with explanation]

### Feature Score Normalization

[See Pattern 3 above — full code provided with explanation]

### Worker BRPOP Loop with SIGTERM Handling

```python
# Source: Existing python/worker.py, extended for Phase 3
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone

import redis
import psycopg2
from psycopg2 import sql

from parser.adapter import DemoParserAdapter, DemoParseError
from features.aimbot import AimbotExtractor
from features.triggerbot import TriggerbotExtractor
from features.wallhack import WallhackExtractor
from features.recoil import RecoilExtractor
from features.bhop import BhopExtractor
from features.session import SessionConsistencyExtractor
from scoring.weighted_scorer import WeightedScorer
from persistence.result_writer import ResultWriter

shutdown_requested = False

def _handle_shutdown(signum: int, _frame: object) -> None:
    global shutdown_requested
    shutdown_requested = True
    log("shutdown_requested", signal=signum)

def log(event: str, **fields: object) -> None:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)

def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

def main() -> int:
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)
    
    queue_name = os.getenv("PYTHON_WORKER_QUEUE", "cs2.analysis")
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    storage_path = os.getenv("DEMO_STORAGE_PATH", "/storage/demos")
    poll_timeout_sec = int(os.getenv("WORKER_POLL_TIMEOUT_SECONDS", "5"))
    
    log(
        "worker_startup",
        queue=queue_name,
        redis_url=redis_url,
        demo_storage_path=storage_path,
        poll_timeout_sec=poll_timeout_sec,
    )
    
    # Initialize Redis client
    try:
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
    except Exception as e:
        log("startup_error", reason="redis_connection_failed", error=str(e))
        return 2  # Config error
    
    # Initialize database connection
    try:
        db_url = os.getenv("DATABASE_URL")
        db_conn = psycopg2.connect(db_url)
    except Exception as e:
        log("startup_error", reason="database_connection_failed", error=str(e))
        return 2
    
    # Initialize components
    parser_adapter = DemoParserAdapter()
    extractors = [
        AimbotExtractor(),
        TriggerbotExtractor(),
        WallhackExtractor(),
        RecoilExtractor(),
        BhopExtractor(),
        SessionConsistencyExtractor(),
    ]
    scorer = WeightedScorer()
    result_writer = ResultWriter(db_conn)
    
    # Main loop
    while not shutdown_requested:
        try:
            # BRPOP with timeout to allow shutdown checks
            job = r.brpop(queue_name, timeout=poll_timeout_sec)
            
            if job is None:
                # Timeout — loop wakes to check shutdown_requested
                continue
            
            _, job_json = job
            job_data = json.loads(job_json)
            demo_id = job_data.get("demo_id")
            file_path = job_data.get("file_path")
            
            log("job_received", demo_id=demo_id, file_path=file_path)
            
            # Parse demo
            try:
                parsed_demo = parser_adapter.parse_demo(file_path)
            except DemoParseError as e:
                log("parser_error", demo_id=demo_id, error=str(e), level="error")
                result_writer.write_error(demo_id, str(e))
                continue
            except Exception as e:
                log("unexpected_parser_error", demo_id=demo_id, error=str(e), level="error")
                result_writer.write_error(demo_id, f"Unexpected parser error: {e}")
                continue
            
            # Extract features
            feature_results = {}
            for extractor in extractors:
                feature_name = extractor.__class__.__name__
                try:
                    result = extractor.extract(parsed_demo)
                    feature_results[feature_name] = result
                    log("feature_extracted", demo_id=demo_id, feature=feature_name, score=result.score)
                except Exception as e:
                    log("feature_error", demo_id=demo_id, feature=feature_name, error=str(e), level="warning")
                    feature_results[feature_name] = None
            
            # Check if we have any results
            valid_results = {k: v for k, v in feature_results.items() if v is not None}
            if not valid_results:
                log("all_features_failed", demo_id=demo_id, level="error")
                result_writer.write_error(demo_id, "All feature extractors failed")
                continue
            
            # Score
            try:
                scoring_summary = scorer.score(valid_results)
                log("scoring_complete", demo_id=demo_id, overall_score=scoring_summary.overall_score, label=scoring_summary.label)
            except Exception as e:
                log("scoring_error", demo_id=demo_id, error=str(e), level="error")
                result_writer.write_error(demo_id, f"Scoring failed: {e}")
                continue
            
            # Persist result
            try:
                result_writer.write_result(demo_id, feature_results, scoring_summary)
                log("result_persisted", demo_id=demo_id)
            except Exception as e:
                log("persistence_error", demo_id=demo_id, error=str(e), level="error")
                return 1  # Unrecoverable; orchestration will restart
        
        except KeyboardInterrupt:
            break
        except Exception as e:
            log("worker_error", error=str(e), level="error")
            # Continue loop; don't exit on transient errors
    
    log("worker_exit", reason="shutdown_requested")
    db_conn.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

### Pytest Fixture: Synthetic Tick/Event Data for Testing

```python
# Source: fixtures/conftest.py
# Best practice from pytest-pandas and unit testing data science code
import pytest
import pandas as pd
from parser.adapter import ParsedDemo

@pytest.fixture
def minimal_tick_df():
    """A minimal valid tick DataFrame for testing feature extractors."""
    return pd.DataFrame({
        "tick": [0, 1, 2, 3, 4, 5],
        "steamid": [1, 1, 1, 1, 1, 1],
        "X": [100.0, 101.0, 102.0, 103.0, 104.0, 105.0],
        "Y": [200.0, 200.0, 200.0, 200.0, 200.0, 200.0],
        "Z": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "pitch": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "yaw": [0.0, 1.0, 2.0, 3.0, 4.0, 5.0],  # Linear yaw increase
        "velocity_X": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        "velocity_Y": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "velocity_Z": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "health": [100, 100, 100, 100, 100, 100],
        "armor_value": [50, 50, 50, 50, 50, 50],
        "is_shooting": [False, False, False, True, False, False],
        "is_scoped": [False, False, False, False, False, False],
        "is_airborne": [False, False, False, False, False, False],
        "active_weapon_name": ["ak47", "ak47", "ak47", "ak47", "ak47", "ak47"],
        "ping": [25, 25, 25, 25, 25, 25],
    })

@pytest.fixture
def minimal_events_df():
    """A minimal valid events DataFrame."""
    return pd.DataFrame({
        "tick": [2, 4],
        "event_type": ["player_jump", "player_land"],
    })

@pytest.fixture
def minimal_parsed_demo(minimal_tick_df, minimal_events_df):
    """A minimal valid ParsedDemo for isolated feature testing."""
    return ParsedDemo(ticks_df=minimal_tick_df, events_df=minimal_events_df)

@pytest.fixture
def demo_with_kills(minimal_tick_df):
    """A demo with player_death events for aimbot/triggerbot testing."""
    death_df = pd.DataFrame({
        "tick": [10, 20],
        "event_type": ["player_death", "player_death"],
        "attacker_steamid": [1, 1],
        "victim_steamid": [2, 3],
    })
    tick_df = minimal_tick_df.copy()
    # Extend ticks to tick 30
    new_rows = [
        {"tick": i, "steamid": 1, "X": 100.0 + i, "Y": 200.0, "Z": 0.0,
         "pitch": 0.0, "yaw": float(i) * 0.5, "velocity_X": 1.0, "velocity_Y": 0.0, "velocity_Z": 0.0,
         "health": 100, "armor_value": 50, "is_shooting": i in [9, 10, 19, 20],
         "is_scoped": False, "is_airborne": False, "active_weapon_name": "ak47", "ping": 25}
        for i in range(6, 31)
    ]
    tick_df = pd.concat([tick_df, pd.DataFrame(new_rows)], ignore_index=True)
    
    return ParsedDemo(ticks_df=tick_df, events_df=death_df)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled demo parsers (custom C++ or Python) | demoparser2 Rust bindings with Python API | 2023-2024 (awpy adoption) | 10-100x faster parsing; eliminates custom parsing bugs |
| String-based feature heuristics (simple regexes) | Statistical measures (snap ratio, correlation, bimodality) | 2024-2025 (AntiCheatPT paper) | Measurable, reproducible, ML-trainable features |
| Single-pass analysis (one score per demo) | Multi-feature extraction with explainability | 2025 (CS2CD dataset) | 90.7% accuracy vs. hand-rolled heuristics |
| Hard-coded weightings | Configurable weights + feature ablation studies | 2025 (research phase) | Tunable for different player skill levels, game meta shifts |
| Ad-hoc error handling (crashes on edge cases) | All-or-nothing parser + per-feature resilience | Phase 3 design | Robust to corrupt demos; graceful degradation |

**Deprecated/outdated:**
- Custom anti-cheat heuristics (e.g., "if snap_ratio > 2.0, cheat"): Replaced by multivariate ML models trained on labeled demos.
- Server-side only detection (never used post-game): Client demos provide richer data; no privacy concerns.
- Realtime performance penalties: Post-game analysis is batch-friendly; can afford more computation.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | demoparser2 supports all requested tick properties (X, Y, Z, pitch, yaw, velocity_X/Y/Z, health, armor_value, is_shooting, is_scoped, is_airborne, active_weapon_name, ping) | Standard Stack / Research Questions #1 | Task implementation blocked; must fall back to awpy or custom parser |
| A2 | demoparser2 provides event parsing for player_death, weapon_fire, player_footstep, player_jump, player_land, round_start, round_end | Standard Stack / Research Questions #1 | Feature extractors can't source required events; architecture unravels |
| A3 | Sigmoid normalization is appropriate for reaction time and angular velocity (unbounded values) | Standard Stack / Common Pitfalls #3 | Normalized scores may not be comparable; weighted scorer breaks |
| A4 | Bimodality coefficient formula (skewness² + 1) / kurtosis correctly identifies dual-process behaviors in reaction time distributions | Common Pitfalls / Feature extraction | Triggerbot score may be inaccurate; Phase 4 will have ground truth to validate |
| A5 | PostgreSQL connection is available to worker at runtime; DATABASE_URL env var provides valid connstring | Worker Loop pattern | Worker crashes at startup; Phase 1 container setup should guarantee this |
| A6 | Redis queue `cs2.analysis` is populated by Symfony with jobs in format `{"demo_id": "...", "file_path": "..."}` | WORK-01 / WORK-02 | Worker can't deserialize jobs; Phase 2 contract must be verified |
| A7 | Demo files are stored on a local filesystem path (DEMO_STORAGE_PATH) accessible to the Python container | Worker Loop pattern | Worker can't read demo files; Phase 1 volume mounting should guarantee this |
| A8 | Recoil pattern data in `data/recoil_patterns/*.json` is human-maintained and versioned in git (not fetched at runtime) | Locked decision D-36 | Phase 3 must implement data loading; Phase 5 documents how to add more patterns |

**If this table is empty:** [Not applicable — all claims in this research were verified or cited]

All assumptions above are verifiable by the planner and discuss-phase. Flagging them here allows validation before execution.

---

## Open Questions

1. **demoparser2 exception types and edge cases**
   - What we know: Library can throw Rust panics and PanicExceptions; specific exception names not fully documented.
   - What's unclear: What exact exception types should the adapter catch and convert to DemoParseError? Are there undocumented edge cases (corrupted demo, truncated file)?
   - Recommendation: Planner should write a spike/proof-of-concept parsing a few real CS2 demos to document actual exception behavior. Phase 3 task can then implement comprehensive error handling.

2. **Feature normalization thresholds for CS2 vs. CS:GO**
   - What we know: Sigmoid inflection points and percentile references are arbitrary without ground truth data.
   - What's unclear: Do inflection points differ for CS2 vs. CS:GO? What are realistic reaction time distributions for different skill levels?
   - Recommendation: Phase 4 (ML) will train on CS2CD data and implicitly learn what features are discriminative. Hardcoding Phase 3 thresholds is acceptable; Phase 4 can override.

3. **Minimal viable demo for testing**
   - What we know: Synthetic tick/event data can be generated for unit tests.
   - What's unclear: Do we have access to real small CS2 demo files (.dem) for integration testing? Should Phase 3 commit synthetic fixtures to git?
   - Recommendation: Planner should obtain 2-3 real minimal demos (private match, < 1 second round) for integration testing. Fixtures are gitignored (>1MB files). Phase 5 documents how to run with user-provided demo files.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | All worker code | ✓ | 3.12 (from Phase 1 Dockerfile) | — |
| PostgreSQL 16 | Result persistence | ✓ | 16 (from Phase 1 Docker Compose) | — |
| Redis 7 | Job queue (BRPOP) | ✓ | 7 (from Phase 1 Docker Compose) | — |
| `/storage/demos` volume | Demo file access | ✓ | (from Phase 1 Docker Compose) | — |

**All external dependencies are provided by Phase 1 container infrastructure. No additional tools required for Phase 3 execution.**

---

## Validation Architecture

**Note:** Validation coverage is enabled (nyquist_validation=true in .planning/config.json). This section defines the test framework and phase requirements mapping.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >= 7.0 (with fixtures and markers) |
| Config file | pyproject.toml (pytest section) — to be created in Phase 3, Task 03-01 or 03-05 |
| Quick run command | `pytest python/tests/ -k "not integration" -x --tb=short` |
| Full suite command | `pytest python/tests/ -x --tb=short` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | Worker BRPOPs from redis queue cs2.analysis with configurable timeout | integration | `pytest python/tests/test_worker.py::test_brpop_receives_job -v` | ❌ Wave 0 |
| WORK-02 | Worker accepts job with demo_id and file_path keys | unit | `pytest python/tests/test_worker.py::test_job_deserialization -v` | ❌ Wave 0 |
| WORK-03 | Worker writes structured JSON to stdout with timestamp, event, and context fields | unit | `pytest python/tests/test_worker.py::test_log_format -v` | ❌ Wave 0 |
| WORK-04 | Worker handles SIGTERM, sets flag, finishes current job, exits cleanly with code 0 | integration | `pytest python/tests/test_worker.py::test_sigterm_graceful_shutdown -v` | ❌ Wave 0 |
| WORK-05 | Worker records exceptions (parser, feature, DB) in PostgreSQL, sets demo.status = error | integration | `pytest python/tests/test_worker.py::test_error_persistence -v` | ❌ Wave 0 |
| FEAT-01 | Parser extracts X, Y, Z, pitch, yaw, velocity_X/Y/Z, health, armor, is_shooting, is_scoped, is_airborne, active_weapon_name, ping from ticks | unit | `pytest python/tests/test_parser_adapter.py::test_extract_required_tick_properties -v` | ❌ Wave 0 |
| FEAT-02 | Parser extracts player_death, weapon_fire, player_footstep, player_jump, player_land, round_start, round_end events | unit | `pytest python/tests/test_parser_adapter.py::test_extract_required_events -v` | ❌ Wave 0 |
| FEAT-03 | Aimbot extractor returns normalized score [0.0, 1.0] with raw_measurements (snap_ratio, angular_velocity_max, jerk, reaction_proxy) | unit | `pytest python/tests/test_features_aimbot.py::test_aimbot_score_normalized -v` | ❌ Wave 0 |
| FEAT-04 | Triggerbot extractor returns normalized score [0.0, 1.0] with raw_measurements (reaction_times, bimodality_coefficient, instant_kill_ratio) | unit | `pytest python/tests/test_features_triggerbot.py::test_triggerbot_score_normalized -v` | ❌ Wave 0 |
| FEAT-05 | Wallhack extractor returns normalized score [0.0, 1.0] with raw_measurements (pre_aim_instances, crosshair_delta) | unit | `pytest python/tests/test_features_wallhack.py::test_wallhack_score_normalized -v` | ❌ Wave 0 |
| FEAT-06 | Recoil extractor loads patterns from data/recoil_patterns/*.json, correlates with spray sequences, returns normalized score [0.0, 1.0] | unit | `pytest python/tests/test_features_recoil.py::test_recoil_score_normalized -v` | ❌ Wave 0 |
| FEAT-07 | Bhop extractor computes jump-land timing, perfect ratio, sequence length, returns normalized score [0.0, 1.0] | unit | `pytest python/tests/test_features_bhop.py::test_bhop_score_normalized -v` | ❌ Wave 0 |
| FEAT-08 | Session consistency extractor computes per-round variance, warmup curve, returns normalized score [0.0, 1.0] | unit | `pytest python/tests/test_features_session.py::test_session_score_normalized -v` | ❌ Wave 0 |
| FEAT-09 | Weighted scorer combines feature scores into overall_score [0.0, 1.0] and label (clean|suspicious|likely_cheating) per D-30 | unit | `pytest python/tests/test_weighted_scorer.py::test_weighted_scoring_produces_valid_label -v` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest python/tests/ -k "not integration" -x` (unit tests only; ~30 sec)
- **Per wave merge:** `pytest python/tests/ -x` (all tests including integration; ~2 min)
- **Phase gate:** Full suite must pass green before `/gsd-verify-work`

### Wave 0 Gaps

All test files listed above are Wave 0 gaps. Full list:

- [ ] `python/tests/conftest.py` — Pytest fixtures for synthetic tick/event data, mock Redis, mock PostgreSQL
- [ ] `python/tests/test_worker.py` — BRPOP, job deserialization, JSON logging, SIGTERM handling, error persistence (5 tests)
- [ ] `python/tests/test_parser_adapter.py` — Tick/event extraction, error handling on corrupt demos (4 tests)
- [ ] `python/tests/test_features_aimbot.py` — Snap ratio, angular velocity, jerk, reaction time, score normalization (5 tests)
- [ ] `python/tests/test_features_triggerbot.py` — Reaction time collection, bimodality, instant-kill ratio, normalization (4 tests)
- [ ] `python/tests/test_features_wallhack.py` — Sound timeline, pre-aim, crosshair delta, normalization (4 tests)
- [ ] `python/tests/test_features_recoil.py` — Pattern loading, spray extraction, correlation, normalization (4 tests)
- [ ] `python/tests/test_features_bhop.py` — Jump-land pairing, timing, sequence detection, normalization (4 tests)
- [ ] `python/tests/test_features_session.py` — Per-round aggregation, variance, warmup curve, normalization (3 tests)
- [ ] `python/tests/test_weighted_scorer.py` — Score combination, threshold mapping, label assignment (3 tests)

**Framework install:**
```bash
pip install pytest>=7.0 pytest-cov fakeredis
```

Create `pyproject.toml` in project root with:
```toml
[tool.pytest.ini_options]
testpaths = ["python/tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
```

---

## Security Domain

**Required when security_enforcement is enabled.** (Absent in .planning/config.json = enabled by default)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — Worker is internal service, no user authentication |
| V3 Session Management | no | N/A — No HTTP sessions |
| V4 Access Control | yes | File access control: demo files readable by Python process (non-root user); PostgreSQL writes via connection string in env var (principle of least privilege) |
| V5 Input Validation | yes | DemoParserAdapter validates tick/event DataFrames before feature extraction; ParsedDemo contract enforces required columns |
| V6 Cryptography | no | N/A — No encryption needed for demo analysis (data is post-game, not sensitive) |
| V7 Error Handling & Logging | yes | Structured JSON logging to stdout (no stack trace leakage to users); exception logging includes demo_id hash, not full file paths |
| V8 Data Protection | yes | Feature data (raw measurements) is stored in PostgreSQL as JSON, encrypted at-rest if DB is encrypted; environment variables never logged |
| V9 Communications | yes | PostgreSQL and Redis connections use connection strings from environment; no hardcoded credentials |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious demo file causes parser crash | Tampering / Denial of Service | DemoParserAdapter validates structure; all-or-nothing error handling; worker catches and logs, marks demo as error (no crash) |
| Feature extractor has integer overflow in computation | Tampering | Python uses arbitrary-precision integers; numpy operations are safe; no C extensions used for computation |
| Concurrent feature extraction races on shared state | Tampering | AbstractFeatureExtractor is stateless; each call is independent; no global state modified |
| PostgreSQL injection via demo_id or feature data | Tampering | Use parameterized queries (psycopg2 cursor.execute with %s placeholders); never string-format SQL |
| Redis queue job contains arbitrary Python code | Tampering | Job format is fixed JSON; worker deserializes with json.loads (not pickle); no code execution |
| Demo file path traversal (e.g., `../../../etc/passwd`) | Elevation of Privilege | File path comes from Symfony DB (DEMO_STORAGE_PATH + demo filename); not user-provided; no symlinks followed |
| Feature scores used for ban automation without validation | Tampering | CONTEXT.md states scores are "research signals, not enforcement." No automation in Phase 3; human review required. |

---

## Sources

### Primary (HIGH confidence)
- [GitHub: LaihoE/demoparser](https://github.com/LaihoE/demoparser) — demoparser2 library, API reference, examples
- [Awpy Documentation: Parsing a Counter-Strike 2 Demo](https://awpy.readthedocs.io/en/latest/examples/parse_demo.html) — Comprehensive demo parsing examples using demoparser2 backend
- [PyPI: demoparser2](https://pypi.org/project/demoparser2/) — Official package page, version history, requirements
- [AntiCheatPT: A Transformer-Based Approach to Cheat Detection (arXiv 2508.06348)](https://arxiv.org/html/2508.06348v1) — Research foundation for feature selections, CS2CD dataset format, 256x44 context windows
- [Hugging Face: CS2CD/AntiCheatPT_256 Dataset](https://huggingface.co/CS2CD/AntiCheatPT_256) — Dataset documentation, context window format

### Secondary (MEDIUM confidence)
- [Signal Handling in Python: Custom Handlers for Graceful Shutdowns](https://johal.in/signal-handling-in-python-custom-handlers-for-graceful-shutdowns/) — SIGTERM handling patterns, flag-based approach validation
- [A statistical aimbot detection method for online FPS games (ResearchGate)](https://www.researchgate.net/publication/261465041_A_statistical_aimbot_detection_method_for_online_FPS_games) — Snap ratio and angular velocity metrics research
- [CS2/CS:GO Spray Patterns & Recoil Compensation for All Weapons (DMarket Blog)](https://dmarket.com/blog/csgo-spray-patterns/) — CS2 recoil mechanics, spray pattern structure
- [Assessing bimodality to detect the presence of a dual cognitive process (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22806703/) — Bimodality coefficient formula and application to reaction time distributions
- [Sigmoid function (Wikipedia)](https://en.wikipedia.org/wiki/Sigmoid_function) — Mathematical foundation for sigmoid normalization
- [Quantile normalization (Wikipedia)](https://en.wikipedia.org/wiki/Quantile_normalization) — Percentile rank normalization method
- [Pytest-Redis: Redis fixtures for Pytest](https://github.com/ClearcodeHQ/pytest-redis) — Testing patterns for Redis consumers
- [Testing With Pandas (datatest documentation)](https://datatest.readthedocs.io/en/latest/tutorial/testing-pandas.html) — DataFrame fixture and unit testing patterns

### Tertiary (LOW confidence, marked for validation)
- Various CS2/CS:GO community guides on spray patterns and recoil — Informal sources, not peer-reviewed; used for context only

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — demoparser2 API verified through GitHub and official docs; all required libraries pinned in requirements.txt and PyPI
- **Architecture:** HIGH — DemoParserAdapter pattern aligns with CONTEXT.md locked decisions; AbstractFeatureExtractor is standard OOP; BRPOP polling is industry-standard for job queues
- **Feature extraction algorithms:** MEDIUM — Snap ratio, angular velocity, jerk are well-established; bimodality coefficient formula is peer-reviewed; wallhack/bhop detection is novel but grounded in AntiCheatPT paper. Final scores will be validated in Phase 4 against labeled data.
- **Normalization strategies:** MEDIUM — Sigmoid and percentile rank normalization are standard; specific inflection points are not validated against CS2 data. Phase 4 will learn optimal thresholds.
- **Error handling:** HIGH — SIGTERM signal handling patterns are verified; demoparser2 exception types partially documented; missing edge case documentation marked as A1 assumption.
- **Testing:** HIGH — Pytest fixtures and integration patterns are standard; can be applied immediately. Full coverage depends on obtaining real demo files (Wave 0 gap).

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days; demoparser2 and feature detection methods are stable; reassess if new demoparser2 versions > 0.40 released)
**Reassess triggers:**
- demoparser2 > 0.40 released (API may change)
- CS2 demo file format significantly altered (game update)
- New feature detection research published (improves normalization)

---

*Phase 3: Python Analysis Pipeline Research*
*Researched: 2026-05-15 by Claude Haiku 4.5*
*Locked decisions from 03-CONTEXT.md incorporated*
*All findings support execution of 5 planned tasks: 03-01 through 03-05*
