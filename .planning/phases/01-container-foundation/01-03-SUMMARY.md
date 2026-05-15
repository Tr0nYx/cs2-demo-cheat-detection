---
phase: 01-container-foundation
plan: 03
subsystem: infra
tags: [python, docker, worker, ml, storage]

requires:
  - phase: 01-container-foundation
    provides: Compose service graph and environment contract from Plan 01
provides:
  - Python 3.12 worker Docker runtime
  - Python dependency baseline for parsing, statistics, ML, Redis, and PostgreSQL
  - Structured JSON startup entrypoint for worker smoke checks
affects: [python-analysis-pipeline, ml-dataset-and-transformer-prep, container-foundation]

tech-stack:
  added: [python-3.12, demoparser2, pandas, numpy, scikit-learn, torch, psycopg2-binary, redis-py, datasets]
  patterns: [non-root-python-runtime, structured-json-worker-logs, env-driven-worker-config]

key-files:
  created: [docker/python/Dockerfile, python/requirements.txt, python/worker.py]
  modified: []

key-decisions:
  - "Python runtime uses a non-root app user and prepares /storage/demos."
  - "Worker startup logs only non-sensitive metadata as structured JSON."
  - "Phase 1 worker is a smoke entrypoint only; BRPOP behavior remains Phase 3 scope."

patterns-established:
  - "Python worker reads queue, Redis, and storage settings from environment variables."
  - "Python dependency baseline is colocated in python/requirements.txt and installed by the Dockerfile."

requirements-completed: ["INFR-01", "INFR-03", "INFR-05"]

duration: 7min
completed: 2026-05-15
---

# Phase 1 Plan 03: Python Worker Runtime Summary

**Python 3.12 worker image with analysis dependencies, non-root runtime, and JSON startup probe**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-15T07:02:00Z
- **Completed:** 2026-05-15T07:09:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added `python/requirements.txt` with the requested parsing, statistics, ML, Redis, and PostgreSQL dependency baseline.
- Added `docker/python/Dockerfile` based on `python:3.12-slim` with build tools, dependency install, storage paths, and non-root `app` user.
- Added `python/worker.py` as a Phase 1 smoke entrypoint that reads env vars and emits structured JSON.
- Set the Compose-facing worker default to idle on startup so `restart: unless-stopped` does not produce a restart loop.

## Task Commits

Each task was committed atomically:

1. **Task 1-3: Python dependencies, Dockerfile, and worker startup** - `d46cdb3` (chore)

## Files Created/Modified
- `python/requirements.txt` - Dependency baseline for parser, ML, database, Redis, and logging work.
- `docker/python/Dockerfile` - Python 3.12 image with non-root user and storage directory preparation.
- `python/worker.py` - Structured JSON startup probe.
- `.env.example` - Updated worker startup default for Compose-friendly idling.

## Decisions Made

- Used `datasets>=2.19.0` rather than an unsupported package extra notation.
- Kept the worker free of Redis BRPOP behavior because that belongs to Phase 3.
- Set `WORKER_IDLE_ON_START=true` in `.env.example` so the dev Compose stack can stay up.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prevented Python service restart loop**
- **Found during:** Phase verification after Python image build
- **Issue:** `WORKER_IDLE_ON_START=false` combined with Compose `restart: unless-stopped` would restart the smoke worker repeatedly.
- **Fix:** Set `.env.example` to `WORKER_IDLE_ON_START=true` for the local Compose stack.
- **Files modified:** `.env.example`, `.planning/phases/01-container-foundation/01-03-SUMMARY.md`
- **Verification:** `docker compose --env-file .env.example config` shows `WORKER_IDLE_ON_START: "true"`.
- **Committed in:** this fix commit

---

**Total deviations:** 1 auto-fixed (1 blocking runtime issue).
**Impact on plan:** Improves Phase 1 startup behavior without adding Phase 3 queue-processing scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The Python analysis phase can replace the smoke startup path with a real Redis BRPOP worker while keeping the existing image, env names, storage mount, and dependency baseline.

## Self-Check: PASSED

---
*Phase: 01-container-foundation*
*Completed: 2026-05-15*
