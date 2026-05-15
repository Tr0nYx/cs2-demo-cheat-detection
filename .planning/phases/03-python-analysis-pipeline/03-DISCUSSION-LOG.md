# Phase 3: Python Analysis Pipeline - Discussion Log

**Date:** 2026-05-15
**Participants:** Tr0nYx (user), Claude (assistant)

## Gray Areas Discussed

### 1. Demo Parser Architecture

**Question:** Should we wrap demoparser2 in a validation adapter, or use it directly with inline error handling?

**Options:**
- Adapter pattern: Create a DemoParserAdapter that wraps demoparser2, validates structure, surfaces errors with context. Cleaner separation, easier to test.
- Direct usage: Call demoparser2 directly, catch exceptions inline. Simpler but mixes concerns.

**User Selection:** **Adapter pattern (recommended)**

**Rationale:** Clean separation of concerns, reusable, testable component. The adapter validates tick/event structure and surfaces parsing errors with context.

**Outcome:** Decision D-01 through D-05. DemoParserAdapter class to be created in python/ directory, wrapping demoparser2 and extracting requested tick properties and gameplay events with validation.

---

### 2. Feature Extractor Pattern

**Question:** How should feature extractors be structured for maintainability and testing?

**Options:**
- Abstract base class: Each feature inherits from AbstractFeatureExtractor with standardized interface (extract() → FeatureResult). Consistent, testable, predictable for new features.
- Functional modules: Standalone compute_score(data) functions per feature. Less ceremony, harder to enforce contract.

**User Selection:** **Abstract base class pattern (recommended)**

**Rationale:** Enforces consistent interface, enables isolation unit testing, makes adding new features predictable (e.g., for Phase 4 or extensions).

**Outcome:** Decision D-06 through D-09. AbstractFeatureExtractor base class in python/features/base.py. Each feature (aimbot, triggerbot, wallhack, recoil, bhop, session) inherits and implements extract(ParsedDemo) -> FeatureResult. Stateless, deterministic extraction.

---

### 3. Feature Score Normalization

**Question:** How should feature scores be normalized to a 0-1 scale?

**Options:**
- Per-feature statistical normalization: Each feature computes raw value, applies transformation (sigmoid, percentile rank, bounded scale). Feature-specific and documented. Flexible, enables Phase 4 refinement.
- Fixed thresholds: Hand-tuned thresholds per feature (e.g., snap_ratio > 0.8 → score 1.0). Faster, requires manual calibration.

**User Selection:** **Per-feature statistical normalization (recommended)**

**Rationale:** Flexible approach allows each feature to use the most appropriate normalization (bounded ranges, unbounded distributions, etc.). Documented transformations enable debugging and Phase 4 ML refinement without code changes.

**Outcome:** Decision D-10 through D-13. Each feature documents its normalization strategy in code comments. Raw values are in natural units; transformation to [0.0, 1.0] is per-feature and validated.

---

### 4. Result Explainability and Persistence

**Question:** What level of explainability data should we persist for results?

**Options:**
- Rich: Store raw feature measurements (snap ratios, reaction times, correlation values) alongside normalized scores as JSON. Enables retrospective analysis and debugging.
- Minimal: Store only final feature scores and overall label. Smaller DB, harder to debug or reweight later.

**User Selection:** **Rich: all intermediate values (recommended)**

**Rationale:** Retrospective analysis, debugging, and future ML model training benefit from raw measurements. AnalysisResult.featureData JSON stores all intermediate values; normalized scores go in first-class fields for query efficiency.

**Outcome:** Decision D-14 through D-17. AnalysisResult persists both normalized scores (aimbotScore, etc.) and raw featureData JSON. Missing features are explicit (not zeroed). Supports Phase 4 ML work.

---

### 5. Error Handling Strategy

**Question:** What should happen when a demo file has a parsing error—should we persist partial results if some features computed successfully, or fail the entire analysis?

**Options:**
- All-or-nothing: If parser fails or any required feature raises exception, mark entire analysis as error. No partial results. Simpler error model, consistent result sets.
- Partial results allowed: Store whatever features computed before error, mark as incomplete. More resilient, but complicates downstream usage.

**User Selection:** **All-or-nothing (recommended)**

**Rationale:** Simpler error model, consistent results. Clients don't need to handle incomplete data. Parser failures are fatal; feature extraction errors per-feature are handled by recording missing data (not zero).

**Outcome:** Decision D-18 through D-22. Parser failure → entire analysis marked error. Feature extractor failure → feature marked missing in JSON, analysis attempts to complete with available features. Worker exceptions exit with non-zero code; external orchestration handles retry.

---

### 6. Worker Loop and BRPOP Behavior

**Question:** For the BRPOP worker loop, how long should we wait for a job before re-checking shutdown?

**Options:**
- Use WORKER_POLL_TIMEOUT_SECONDS from .env: BRPOP with timeout (e.g., 5 sec), worker wakes to check SIGTERM. Clean shutdown with bounded latency.
- Block indefinitely: BRPOP with no timeout. Lower CPU, but SIGTERM shutdown waits for next job.

**User Selection:** **Use WORKER_POLL_TIMEOUT_SECONDS from env (recommended)**

**Rationale:** Configurable, responsive to SIGTERM, bounded grace-period shutdown. Aligns with existing .env contract (WORKER_POLL_TIMEOUT_SECONDS=5 already defined).

**Outcome:** Decision D-23 through D-26. Worker uses BRPOP(queue, timeout=POLL_TIMEOUT). SIGTERM handler sets shutdown_requested flag. Grace period is WORKER_SHUTDOWN_GRACE_SECONDS from .env. Single job at a time.

---

### 7. Testing and Fixtures

**Question:** Should we provide test fixtures (example .dem files) in the repository, or assume demo files come from external sources?

**Options:**
- Include minimal fixtures: 1-2 small valid .dem files in data/fixtures/ or gitignored volume. Tests are reliable and repeatable.
- No fixtures: Omit demo files, document external source. Smaller repo, harder to write reproducible tests.

**User Selection:** **Include minimal fixtures (recommended)**

**Rationale:** Reproducible integration tests without external dependencies. Tests can run offline. Unit tests for each feature are reliable and deterministic.

**Outcome:** Decision D-32 through D-34. Create python/fixtures/ with minimal demo files (or gitignored volume path). Each feature has unit tests using fixtures. Worker loop has integration tests mocking Redis and DB.

---

### 8. Recoil Pattern Data

**Question:** What should the recoil pattern data look like and where should it live?

**Options:**
- JSON files in data/recoil_patterns/: One file per weapon (ak47.json, m4a4.json). Version-controlled, part of repo. Worker loads at startup. Easy to iterate and test.
- Downloaded at runtime: Fetch from external source (S3, HuggingFace, data service). Flexible, but adds runtime dependency and latency.

**User Selection:** **JSON files in data/recoil_patterns/ (recommended)**

**Rationale:** Deterministic results, offline operation, version control makes patterns auditable. Runtime downloads are deferred to Phase 5+ (after core pipeline exists).

**Outcome:** Decision D-35 through D-37. Create data/recoil_patterns/ with JSON pattern files (weapon_name, spray_points array, version). Provide complete AK-47 pattern and stubs for M4A4/M4A1-S. Worker loads at startup.

---

## Key Decisions Summary

| Decision | Outcome |
|----------|---------|
| Parser architecture | Adapter pattern wrapping demoparser2 |
| Feature extractors | Abstract base class with standardized extract() interface |
| Score normalization | Per-feature statistical normalization to [0.0, 1.0] |
| Explainability | Rich data: raw measurements + normalized scores |
| Error handling | All-or-nothing parser failures; per-feature feature errors |
| Worker BRPOP | Configurable timeout from WORKER_POLL_TIMEOUT_SECONDS env |
| Test fixtures | Minimal demo files in data/fixtures/ or volume |
| Recoil patterns | Version-controlled JSON files in data/recoil_patterns/ |

## No Deferred Ideas

All gray areas were addressed. No scope creep detected. Phase 3 boundaries are clear.

---

*Discussion completed: 2026-05-15*
*Ready for: /gsd-plan-phase 3*
