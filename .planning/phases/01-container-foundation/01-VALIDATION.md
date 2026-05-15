---
phase: 1
slug: container-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-15
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Docker Compose, PowerShell file checks, Python compile check |
| **Config file** | `docker-compose.yml`, `.env.example` |
| **Quick run command** | `node "$HOME/.codex/get-shit-done/bin/gsd-tools.cjs" verify plan-structure .planning/phases/01-container-foundation/01-01-PLAN.md --raw` |
| **Full suite command** | `docker compose --env-file .env.example config` |
| **Estimated runtime** | ~10 seconds after Docker files exist |

---

## Sampling Rate

- **After every task commit:** Run the task-specific `Select-String`, `Test-Path`, or compile command in the plan.
- **After every plan wave:** Run `docker compose --env-file .env.example config`.
- **Before `$gsd-verify-work`:** Compose config and all file-existence checks must be green.
- **Max feedback latency:** 30 seconds for config checks, excluding image builds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-05 | T-02 | `.env` and `*.dem` ignored | file check | `Select-String -Path .gitignore -Pattern '\*.dem'` | yes | pending |
| 01-01-02 | 01 | 1 | INFR-04 | T-01 | Env contract centralizes service values | file check | `Select-String -Path .env.example -Pattern 'DATABASE_URL','REDIS_URL','PYTHON_WORKER_QUEUE'` | yes | pending |
| 01-01-03 | 01 | 1 | INFR-01, INFR-02 | T-01 | Compose parses and healthchecks exist | config check | `docker compose --env-file .env.example config` | yes | pending |
| 01-02-01 | 02 | 2 | INFR-03 | T-05 | PHP runtime uses non-root user | file check | `Select-String -Path docker/php/Dockerfile -Pattern 'USER app'` | yes | pending |
| 01-02-02 | 02 | 2 | INFR-01 | T-04 | PHP upload limits are explicit | file check | `Select-String -Path docker/php/php.ini -Pattern 'upload_max_filesize = 2G'` | yes | pending |
| 01-02-03 | 02 | 2 | INFR-01 | T-06 | Nginx proxies to PHP and denies hidden files | file check | `Select-String -Path docker/nginx/nginx.conf -Pattern 'fastcgi_pass php:9000'` | yes | pending |
| 01-03-01 | 03 | 2 | INFR-01 | T-08 | Dependency baseline exists | file check | `Select-String -Path python/requirements.txt -Pattern 'demoparser2','torch','datasets'` | yes | pending |
| 01-03-02 | 03 | 2 | INFR-03 | T-09 | Python runtime uses non-root user | file check | `Select-String -Path docker/python/Dockerfile -Pattern 'USER app'` | yes | pending |
| 01-03-03 | 03 | 2 | INFR-05 | T-08 | Worker reads storage/queue env and compiles | compile check | `python -m py_compile python/worker.py` | yes | pending |

---

## Wave 0 Requirements

Existing local tooling is enough for Phase 1 validation:

- [x] PowerShell file checks available in the current shell.
- [x] Node available for GSD plan-structure validation.
- [x] Docker Compose expected for final execution verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Image build performance | INFR-01 | Python ML dependencies may be large and machine-dependent | Observe whether `docker compose build python` is acceptable locally; optimize later if needed. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or file checks
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing validation infrastructure
- [x] No watch-mode flags
- [x] Feedback latency target < 30s for config checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-15
