---
phase: 03
plan: 01
title: Worker Lifecycle, Redis Consumption, Structured Logging, PostgreSQL Writes
status: complete
completed_date: 2026-05-15
duration_minutes: 45
subsystem: Python Worker Foundation
tags:
  - worker
  - redis
  - postgresql
  - async
  - error-handling
  - logging
dependency_graph:
  requires: []
  provides:
    - "Redis BRPOP consumer for cs2.analysis queue"
    - "Job deserialization and routing"
    - "PostgreSQL error persistence via ResultWriter"
    - "Structured JSON logging with ISO 8601 timestamps"
    - "SIGTERM graceful shutdown handling"
  affects:
    - "03-02 through 03-05 feature extraction tasks"
tech_stack:
  added:
    - "psycopg2-binary >= 2.9.9 (PostgreSQL driver)"
    - "redis >= 5.0.0 (Redis client)"
  patterns:
    - "BRPOP blocking queue consumer"
    - "Parameterized SQL queries (psycopg2)"
    - "JSON structured logging"
    - "Graceful SIGTERM shutdown"
key_files:
  created:
    - "python/__init__.py"
    - "python/persistence/__init__.py"
    - "python/persistence/result_writer.py"
  modified:
    - "python/worker.py"
decisions_made:
  - "ResultWriter accepts psycopg2 connection in __init__ for dependency injection"
  - "All SQL uses parameterized queries (%s) to prevent injection"
  - "process_job() skeleton validates inputs but doesn't execute parsing (deferred to 03-02+)"
  - "SIGTERM handler sets global flag; loop checks and exits gracefully"
  - "Error handling: parser errors update Demo immediately; feature errors continue with other features"
  - "Job deserialization uses json.loads(); invalid JSON logged and skipped"
  - "Shutdown grace period consumed from env but not used yet (reserved for future work)"
metrics:
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  total_lines_added: 297
  key_commits:
    - hash: 3912933
      message: "feat(03-01): implement ResultWriter for PostgreSQL persistence"
    - hash: d1c6207
      message: "feat(03-01): expand worker with BRPOP loop, job deserialization, and error orchestration"

---

## Summary

Phase 3 Task 03-01 implements the foundational Python worker lifecycle: a Redis BRPOP consumer that polls the `cs2.analysis` queue, deserializes compact job payloads, orchestrates error recording, and gracefully handles SIGTERM shutdown signals.

## What Was Built

### 1. ResultWriter (PostgreSQL Persistence)

**File:** `python/persistence/result_writer.py` (188 lines)

A database persistence layer that:
- **Accepts** a psycopg2 connection in `__init__`
- **write_error(demo_id, error_message):** Updates Demo record with error status, error message, and sets status to 'error'
- **write_result(demo_id, feature_results, scoring_summary):** Creates AnalysisResult record with:
  - Normalized feature scores: aimbotScore, triggerBotScore, wallhackScore, recoilScore, bhopScore, sessionScore
  - Overall suspicion score and label from scoring_summary
  - Raw measurements and metadata as featureData JSON
  - Updates Demo status to 'done'
- **Error handling:** All psycopg2 exceptions are logged with context (demo_id) and re-raised
- **Security:** All SQL queries use parameterized execution (`cursor.execute()` with `%s` placeholders) to prevent SQL injection

### 2. Worker Loop (Redis BRPOP Consumer)

**File:** `python/worker.py` (168 lines)

Expanded the Phase 1 smoke baseline to:

**Initialization:**
- Set SIGTERM/SIGINT signal handlers
- Read environment variables:
  - `PYTHON_WORKER_QUEUE` (default: "cs2.analysis")
  - `REDIS_URL` (default: "redis://redis:6379")
  - `DATABASE_URL` (required for PostgreSQL)
  - `DEMO_STORAGE_PATH` (default: "/storage/demos")
  - `WORKER_POLL_TIMEOUT_SECONDS` (default: 5)
  - `WORKER_SHUTDOWN_GRACE_SECONDS` (default: 15, reserved for future use)
  - `WORKER_IDLE_ON_START` (boolean flag)
- Initialize Redis client and PostgreSQL connection
- Return code 2 if startup fails (config error)

**Main Loop:**
- While `shutdown_requested` is False:
  - Call `redis.brpop(queue_name, timeout=WORKER_POLL_TIMEOUT_SECONDS)`
  - On timeout: Continue (allows SIGTERM checks)
  - On job received: Deserialize JSON, extract demo_id and file_path
  - Log "job_received" event with demo_id
  - Call `process_job(demo_id, file_path)` skeleton
  - On success: Log "result_persisted"
  - On FileNotFoundError or ValueError: Log "parser_error", call `result_writer.write_error()`
  - On other exceptions: Log "feature_error", call `result_writer.write_error()`
  - On Redis connection loss: Log "worker_error", return 1 (unrecoverable)
  - On JSON decode error: Log, skip job, continue

**Graceful Shutdown:**
- SIGTERM handler sets `shutdown_requested = True`
- Loop checks flag at top of each iteration
- On shutdown: Close database connection, close Redis connection, log "worker_exit", return 0

**Logging:**
- All events logged as structured JSON with ISO 8601 timestamp and event name
- Events: worker_startup, worker_ready, job_received, job_processing, result_persisted, parser_error, feature_error, worker_error, worker_exit, shutdown_requested, startup_error
- Context fields: demo_id, error, queue, redis_configured, database_configured, signal, reason, etc.

**process_job() Skeleton:**
- Validates file_path is not empty
- Checks file exists at filesystem
- Logs job_processing event
- Raises ValueError or FileNotFoundError on validation failure
- No actual parsing/feature extraction (deferred to 03-02 through 03-05)

## Test Results

All acceptance criteria met:
- ✅ `python/worker.py` contains `redis.brpop()` call with timeout parameter
- ✅ Job deserialization uses `json.loads()` and extracts demo_id and file_path
- ✅ process_job() method skeleton exists (validates inputs, logs event)
- ✅ All environment variables from .env.example are consumed with proper defaults
- ✅ ResultWriter is initialized and used for error recording
- ✅ SIGTERM handler sets shutdown_requested (existing pattern preserved)
- ✅ Return codes: 0 (clean shutdown), 1 (error), 2 (config error)
- ✅ All log events are JSON with timestamp and event fields
- ✅ grep -c "brpop" python/worker.py >= 1 (found 1)
- ✅ grep -c "ResultWriter" python/worker.py >= 1 (found 2)
- ✅ grep -c "psycopg2.connect" python/worker.py >= 1 (found 1)
- ✅ python/worker.py is 168 lines (>= 150 required)

## Deviations from Plan

None. Plan executed exactly as specified.

## Key Decisions

1. **ResultWriter as Injected Dependency:** The connection is injected in `__init__` rather than stored as a module-level singleton, making testing and connection management cleaner.

2. **JSON Payload Validation:** Invalid job JSON is logged with context but the worker continues—prevents one bad message from crashing the worker. This aligns with D-21 (worker exceptions cause exit, but bad JSON is skipped).

3. **File Existence Check in process_job():** Per D-05, we check file existence before attempting parsing. This surfaces missing files as parse errors, not mysterious extraction failures.

4. **Graceful Shutdown Without Re-enqueue:** Per D-21, if a job is in-flight when SIGTERM fires, it is lost. External orchestration (Kubernetes, supervisor) is responsible for retry/replay. The worker does not re-enqueue incomplete jobs.

5. **Feature Error vs. Parser Error Distinction:** Parser errors (file not found, JSON decode) are treated distinctly from feature extraction errors, with separate log events. Both call `write_error()`.

## Threat Compliance

All threat mitigations from T-03-01 through T-03-06 are addressed:

| Threat ID | Mitigation | Verification |
|-----------|-----------|---------------|
| T-03-01 | Job deserialization uses json.loads (safe, no code execution) | ✅ Line 94-95: `json.loads(job_json)` |
| T-03-02 | File path comes from Symfony DB; combined with storage path in future | ✅ File path validated in process_job() |
| T-03-03 | SQL injection: parameterized queries (cursor.execute with %s) | ✅ result_writer.py uses %s placeholders only |
| T-03-04 | Malicious demo file crashes handled: raises and catches exception | ✅ process_job() raises, worker catches and logs |
| T-03-05 | Stack traces not logged to stdout | ✅ All logs use `str(e)` exception message only |
| T-03-06 | Demo file paths not logged in production | ✅ Log events use demo_id (UUID), not file_path |

## Known Stubs

1. **process_job() Skeleton:** Current implementation only validates inputs and logs. No actual parsing or feature extraction.
   - File: `python/worker.py`, lines 52-71
   - Reason: Feature extraction pipeline is Phase 3 Tasks 03-02 through 03-05
   - Will be resolved: Task 03-02 will add DemoParserAdapter call
   - Will be resolved: Tasks 03-03 through 03-07 will add feature extractors

## Integration Readiness

The worker is ready for:
- **Docker integration:** Can start in container with configured Redis and PostgreSQL services
- **Manual testing:** Enqueue a test job via `redis-cli RPUSH cs2.analysis '{"demo_id":"test-123","file_path":"/storage/demos/test.dem"}'` and observe JSON logs to stdout
- **Feature pipeline integration:** Tasks 03-02 through 03-05 will integrate DemoParserAdapter and feature extractors into process_job()

## Next Steps

Tasks 03-02 through 03-05 will:
1. **03-02:** Implement DemoParserAdapter wrapping demoparser2
2. **03-03:** Implement aimbot, triggerbot, wallhack feature extractors
3. **03-04:** Implement recoil and bhop feature extractors
4. **03-05:** Implement session consistency scorer and weighted scoring
5. Later: Wire feature pipeline into process_job()

---

**Execution Status:** COMPLETE
**Commits:** 2 (3912933, d1c6207)
**Verified:** 2026-05-15
