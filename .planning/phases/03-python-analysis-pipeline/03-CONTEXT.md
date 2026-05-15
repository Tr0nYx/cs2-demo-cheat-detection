# Phase 3: Python Analysis Pipeline - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the Python analysis worker: a Redis-backed consumer that accepts queued demo jobs, parses CS2 demo files, extracts behavioral features (aimbot, triggerbot, wallhack, recoil, bhop, session consistency), computes normalized suspicion scores, and persists explainable results to PostgreSQL. The worker handles long-running async analysis, graceful shutdown via SIGTERM, and comprehensive error recording. It does not implement ML model training (Phase 4), production observability (v2), or cloud storage backends (v2).

</domain>

<decisions>
## Implementation Decisions

### Demo Parser Architecture
- **D-01:** Create a `DemoParserAdapter` class that wraps `demoparser2`, validates tick and event data structure, and surfaces parsing errors with context. The adapter is testable, reusable, and cleanly separates parser concerns from the worker loop.
- **D-02:** The adapter extracts requested tick properties: X, Y, Z, pitch, yaw, velocity_X, velocity_Y, velocity_Z, health, armor_value, is_shooting, is_scoped, is_airborne, active_weapon_name, and ping.
- **D-03:** The adapter extracts gameplay events: player_death (with attacker/victim), weapon_fire, player_footstep, player_jump, player_land, round_start, and round_end.
- **D-04:** Parser validation is shallow in Phase 3: checks that demoparser2 returns data, ticks are ordered by tick_number, and required event types are present. Deep CS2 demo format validation is deferred.
- **D-05:** If `demoparser2` cannot open the file or returns empty ticks/events, the parser raises a clear exception (not a silent empty result). The worker records the error and marks the demo as error status.

### Feature Extractor Pattern
- **D-06:** Each feature extractor inherits from `AbstractFeatureExtractor` with a standardized interface: `extract(parsed_data: ParsedDemo) -> FeatureResult`. The abstract class enforces consistent return types and encourages isolated unit testing.
- **D-07:** `FeatureResult` is a dataclass containing: `score` (float 0.0-1.0), `raw_measurements` (dict of intermediate values for explainability), and `metadata` (extraction method, version, warnings).
- **D-08:** Feature extractors are stateless; they do not persist state between calls. Each call is independent and deterministic.
- **D-09:** Each feature module (aimbot.py, wallhack.py, etc.) is in `python/features/` and implements one or more extractors. Base class is in `python/features/base.py`.

### Feature Score Normalization
- **D-10:** Each feature computes a raw value in its natural units (e.g., snap_ratio 0.0-1.0, reaction time in ms, angular velocity in degrees/tick), then applies a per-feature transformation to normalize to 0.0-1.0.
- **D-11:** Transformation strategy per feature is documented in code comments and in the RESEARCH artifacts for later phases. Common approaches: sigmoid for unbounded values, percentile rank for distributions, linear scaling for bounded ranges.
- **D-12:** Normalization is feature-specific and validated during feature extraction (e.g., final score must be in [0.0, 1.0] or raises ValueError).
- **D-13:** Do not apply dataset-wide normalization or reweighting in Phase 3. Phase 4 (ML) will handle data augmentation and model-based score refinement.

### Result Explainability and Persistence
- **D-14:** Persist rich explainability data: store raw feature measurements (e.g., all snap ratios, reaction times, correlation values) as JSON in the `AnalysisResult` entity `featureData` field.
- **D-15:** `featureData` JSON schema is flexible and feature-specific; each feature includes its raw_measurements dict. This enables retrospective debugging, reweighting, and future model training.
- **D-16:** Store normalized scores in first-class `AnalysisResult` fields (aimbotScore, wallhackScore, etc.) for efficient queries and dashboards. The JSON featureData is supplemental.
- **D-17:** If a feature fails (e.g., insufficient data for statistical inference), record that in featureData (e.g., `"wallhack": { "error": "insufficient_footsteps", "score": null }`). Do not impute zeros; explicit missing data is traceable.

### Error Handling Strategy
- **D-18:** If the demo parser fails (file not found, demoparser2 exception, invalid format), mark the entire analysis as error. Do not persist partial results.
- **D-19:** If a feature extractor raises an exception (e.g., division by zero, index error), treat it as a missing feature but continue with other features. Record the error in featureData but attempt to compute the weighted score from available features.
- **D-20:** If all features fail or the demo has insufficient data for any meaningful analysis, mark the demo as error and record the reason in Demo.errorMessage.
- **D-21:** Worker exceptions (database write failures, Redis connection loss) are logged with context and cause the worker to exit with a non-zero code. The failed job is not re-enqueued; external orchestration (k8s, supervisor) is responsible for restart.
- **D-22:** All exceptions logged to stdout as structured JSON with `event: "error"` or `event: "warning"`, including stack trace as optional field.

### Worker Loop and SIGTERM Handling
- **D-23:** Worker polls Redis with `BRPOP(cs2.analysis, timeout=WORKER_POLL_TIMEOUT_SECONDS)` from `.env` (default 5 sec). On timeout, the loop wakes to check `shutdown_requested` flag set by SIGTERM handler, then re-blocks.
- **D-24:** SIGTERM handler sets the global shutdown flag, allowing the worker to finish the current job gracefully (if one is in progress) and exit cleanly. Grace period for in-flight work is WORKER_SHUTDOWN_GRACE_SECONDS from `.env`.
- **D-25:** When shutting down, the worker does not re-enqueue the current job. If a job is incomplete when SIGTERM fires, it will be lost; external orchestration must handle retry/replay if needed.
- **D-26:** Worker processes one job at a time (no batch processing in Phase 3). This keeps the loop simple and makes graceful shutdown predictable.

### Weighted Scoring and Verdict
- **D-27:** After all feature scores are computed (or marked as missing), a `WeightedScorer` combines them into an overall suspicion label: `clean`, `suspicious`, or `likely_cheating`.
- **D-28:** Scoring weights (e.g., aimbot 30%, wallhack 25%, triggerbot 20%, recoil 15%, bhop 5%, session 5%) are configurable via JSON or Python constants in the scorer. Weights are not hardcoded in individual features.
- **D-29:** The scorer returns a `ScoringSummary` with overall score (float 0.0-1.0), label, and per-feature contributing scores. This is merged into the result JSON.
- **D-30:** Threshold mapping is explicit: clean < 0.3, suspicious 0.3-0.7, likely_cheating >= 0.7. These thresholds are documented and can be adjusted by reweighting.
- **D-31:** If a feature is missing (due to error or insufficient data), the scorer either skips it (proportional weight redistribution) or treats it as neutral (0.5). The strategy is recorded in the SummaryScore output for transparency.

### Testing and Fixtures
- **D-32:** Create minimal demo file fixtures in `python/fixtures/` (or a gitignored volume path). These are valid but small CS2 demos for unit and integration testing, not loaded from the cloud.
- **D-33:** Each feature extractor has unit tests using fixtures; the worker loop has integration tests that mock Redis and database writes.
- **D-34:** Worker exit codes: 0 (clean shutdown), 1 (unrecoverable error), 2 (configuration error). Tests verify these.

### Recoil Pattern Data
- **D-35:** Store recoil patterns in `data/recoil_patterns/` as JSON files, one per weapon (ak47.json, m4a4.json, m4a1_s.json, etc.). Format: `{ "weapon_name": "AK-47", "spray_points": [[x1, y2], ...], "version": "cs2_2025" }`.
- **D-36:** Recoil patterns are version-controlled as part of the repo. The worker loads them at startup from the filesystem, not from a network source. This guarantees deterministic results and offline operation.
- **D-37:** In Phase 3, provide a complete pattern for AK-47 and stub patterns for M4A4/M4A1-S (matching the DEVX requirement). Phase 5 will document how to extend patterns for other weapons.

### Log Format and Observability
- **D-38:** All logs are JSON-structured (using python-json-logger or manual dict serialization) with fields: `timestamp` (ISO 8601), `event` (string), and context fields (demo_id, feature_name, error, etc.).
- **D-39:** Log levels: INFO for startup/shutdown/job start/completion, WARNING for feature extraction issues or missing data, ERROR for worker failures and parser exceptions.
- **D-40:** Do not log the full demo file path in production (security); log a hash or UUID instead if needed for debugging.

### the agent's Discretion
- Exact field names and JSON serialization format for FeatureResult and ScoringSummary, as long as schema is consistent and documented.
- Exact feature extraction algorithms for each detector (snap ratio calculation, reaction time computation, etc.), as long as the final normalized score is 0.0-1.0 and raw measurements are captured.
- Exact Python package structure (feature modules, scoring module, parser module), while preserving the base class pattern and DDD-like separation.
- Exact weight values for the weighted scorer, as long as they are configurable and documented.
- Exact regex or pattern matching for active_weapon_name extraction from demoparser2 output, as long as it is reliable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 3 goal, requirements, success criteria, and planned plan split.
- `.planning/REQUIREMENTS.md` - `WORK-01` through `WORK-05` (worker lifecycle), `FEAT-01` through `FEAT-09` (features and scoring) define Phase 3 requirements.
- `.planning/PROJECT.md` - Project-level constraints for Symfony/Python split, Redis queueing, local storage, ethics, and quality (type hints, docstrings, abstract patterns).

### Prior Phase Contracts
- `.planning/phases/02-symfony-api-and-domain/02-CONTEXT.md` - Locked Redis queue contract: `cs2.analysis` queue, job payload format `{"demo_id": "...", "file_path": "..."}`, result ingest contract, and Demo/Player/AnalysisResult entity schemas.
- `.planning/phases/02-symfony-api-and-domain/02-VERIFICATION.md` - Evidence that Symfony API and queue dispatch work correctly.
- `.planning/phases/01-container-foundation/01-CONTEXT.md` - Locked Docker, environment, and non-root runtime decisions.

### Source Brief
- `tasks/setup.md` - Requested feature extractors (aimbot, triggerbot, wallhack, recoil, bhop, session), tick/event data to extract, AnalysisResult schema, demo storage integration, and README expectations.

### Domain References (Optional Context)
- AntiCheatPT paper (arXiv 2508.06348) - Research foundation for feature selections and ML scoring rationale.
- CS2CD dataset documentation (HuggingFace) - Expected data format for Phase 4 ML preparation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `python/worker.py`: Baseline worker with SIGTERM handling, JSON structured logging, environment variable consumption, and graceful shutdown signal handler. Phase 3 expands this loop to consume BRPOP and process jobs.
- `python/requirements.txt`: Dependencies already pinned: demoparser2, pandas, numpy, scikit-learn, torch, psycopg2-binary, redis, datasets, python-json-logger.
- `.env.example`: Worker configuration already defined: `PYTHON_WORKER_QUEUE=cs2.analysis`, `WORKER_POLL_TIMEOUT_SECONDS=5`, `WORKER_SHUTDOWN_GRACE_SECONDS=15`, `WORKER_LOG_LEVEL=INFO`, `WORKER_IDLE_ON_START`.
- `docker-compose.yml` and `docker/python/Dockerfile`: Python 3.12 runtime, non-root user, volume mounts for demo storage and worker code.

### Established Patterns
- Redis queue integration: Symfony writes compact JSON jobs; Python consumes via BRPOP.
- Structured JSON logging as the worker baseline (ISO 8601 timestamps, event field, context fields).
- PostgreSQL source of truth for all results.
- Non-root application users in containers.

### Integration Points
- `PYTHON_WORKER_QUEUE` from `.env` is the queue name for BRPOP.
- `REDIS_URL` from `.env` is the connection string for Redis.
- `DEMO_STORAGE_PATH` from `.env` is the filesystem path to demo files.
- `DATABASE_URL` from `.env` is the PostgreSQL connection string for writing AnalysisResult and error records.
- Symfony pushes jobs to Redis; Python worker consumes and sends result to Symfony via result-ingest message or direct DB write.

</code_context>

<specifics>
## Specific Ideas

- User confirmed all recommended architectural choices: adapter pattern for parser, abstract base class for features, per-feature statistical normalization, rich explainability data, all-or-nothing error handling, configurable BRPOP timeout, test fixtures, and version-controlled recoil patterns.
- The foundation (worker loop, logging, SIGTERM handling) is already in place; Phase 3 fills in the parsing, feature extraction, and scoring logic.
- Feature extractors should be designed to work offline (no network I/O during analysis) and produce deterministic results.
- Recoil pattern data is part of the codebase, not fetched at runtime; this ensures reproducibility and offline operation.

</specifics>

<deferred>
## Deferred Ideas

- Parser header validation (deep CS2 format checking) belongs to Phase 4 or later when we have real demo files.
- Demo deduplication by content hash can be added in a future phase if needed.
- Batch job processing (multiple demos in parallel within the worker) is deferred; Phase 3 is single-job-at-a-time.
- Reweighting scores based on ML model predictions is Phase 4 work.
- Prometheus, Grafana, and Loki observability is v2.
- S3/MinIO storage backend (behind a storage interface) is v2.
- Production Docker override profile is deferred until after Phase 3 core functionality exists.

</deferred>

---

*Phase: 03-Python Analysis Pipeline*
*Context gathered: 2026-05-15*
