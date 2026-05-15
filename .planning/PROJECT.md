# CS2 Demo Cheat Detection

## What This Is

CS2 Demo Cheat Detection is a post-game analysis system for Counter-Strike 2 `.dem` files. It parses demo telemetry, extracts statistical and ML-ready behavior signals, and reports player-level suspicion scores for patterns such as aimbot, wallhack, triggerbot, spinbot-like aim behavior, bhop automation, and recoil compensation.

The project is research-oriented and explicitly avoids live cheating, memory reading, client tampering, or invasive anti-cheat behavior. The product foundation combines a Symfony backend, async Python analysis workers, PostgreSQL storage, Redis queues, and Docker Compose infrastructure.

## Core Value

Users can upload or point to a CS2 demo and receive a reproducible, explainable, player-level cheat suspicion analysis based only on post-game demo data.

## Requirements

### Validated

- [x] Docker Compose runs PHP-FPM, Nginx, PostgreSQL, Redis, and Python worker services without root application containers. Validated in Phase 1: Container Foundation.
- [x] Symfony 7 backend exposes demo upload, demo status/result, and player history API endpoints. Validated in Phase 2: Symfony API and Domain.
- [x] Symfony dispatches demo analysis work to Redis without waiting for long-running Python analysis. Validated in Phase 2: Symfony API and Domain.
- [x] Backend persists Demo, Player, and AnalysisResult records and ingests player-level results or errors. Validated in Phase 2: Symfony API and Domain.

### Active

- [ ] Python worker consumes analysis jobs, parses CS2 demos, extracts detection features, and writes results or errors to PostgreSQL.
- [ ] Detection pipeline implements aimbot, triggerbot, wallhack, recoil, bhop, and session-consistency scoring with documented weighting.
- [ ] ML preparation supports CS2CD loading, AntiCheatPT-compatible context vectors, stratified splits, augmentation, and a PyTorch transformer baseline.
- [ ] Project includes developer ergonomics: Makefile, `.env.example`, recoil pattern seed data, README, and test targets.

### Out of Scope

- Live cheat detection - the system is intentionally post-game only.
- Memory reading, client process inspection, kernel drivers, or anti-cheat bypass research - not needed for demo analysis and outside the ethical boundary.
- API Platform - explicitly excluded in favor of simple Symfony controllers.
- Production cloud object storage in v1 - storage is abstracted, but local Docker volume is the default.
- Prometheus, Grafana, and Loki in v1 - planned later after the analysis pipeline exists.

## Context

The source brief is `tasks/setup.md`. It defines a greenfield project with a desired `cs2-cheat-detection/` structure, DDD-style Symfony folders, a Python feature extraction package, Docker infrastructure, recoil pattern data, and a complete README.

The research basis is AntiCheatPT, a transformer-based CS2 cheat detection paper submitted to arXiv on 2025-08-08. Its abstract describes AntiCheatPT_256, the public CS2CD dataset, 90,707 context windows, and reported 89.17% accuracy with 93.36% AUC on an unaugmented test set. The Hugging Face CS2CD organization hosts the dataset, context windows, and AntiCheatPT_256 model artifacts. The current dataset page lists DOI `10.57967/hf/5654`, which differs from the brief's `10.57967/hf/5315`; implementation should use the live dataset identifier unless the user provides a different pinned dataset.

The backend and worker communicate through Redis queue payloads instead of HTTP because analysis is long-running and should not be tied to web request timeouts. PostgreSQL is the source of truth for demo state and analysis results.

## Constraints

- **Tech stack**: Symfony 7, PHP 8.3-FPM, Python 3.12, PostgreSQL 16, Redis 7, Nginx, Docker Compose - explicitly requested in the brief.
- **Architecture**: Symfony owns API, persistence, job dispatch, and web UI; Python owns demo parsing, feature extraction, scoring, and ML training - keeps language responsibilities clear.
- **Queueing**: Symfony Messenger writes analysis jobs to Redis and Python consumes via BRPOP - avoids an additional Python HTTP service.
- **Storage**: Local Docker volume is the default, behind a storage interface - allows MinIO or S3 later without changing domain code.
- **Security**: Secrets must come from environment variables only, containers must avoid root, and demo files must not be committed.
- **Quality**: Python code must use type hints, docstrings, abstract feature extractor classes, structured JSON logging, and no placeholder TODO implementations.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Post-game demo analysis only | Preserves ethical boundary and avoids invasive client-side anti-cheat work | Pending |
| Symfony plus Python split | Symfony is strong for API, queueing, DB, and UI; Python is strong for parsing, statistics, and ML | Validated in Phase 1 container split |
| Redis BRPOP worker contract | Long-running demo analysis does not need synchronous HTTP and can fail independently | Symfony publishes compact jobs in Phase 2; Python consumption pending Phase 3 |
| Coarse GSD roadmap | The setup brief is broad and foundational; larger phases keep planning navigable | Pending |
| Use live CS2CD DOI `10.57967/hf/5654` unless pinned otherwise | Hugging Face currently reports this DOI for the dataset page | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
## Version Status

**Milestone v1.0** (2026-05-15): Foundation, API, ML Infrastructure, Developer Ready
- Infrastructure: Docker Compose with 5 services ✓
- Symfony API: REST endpoints for demo management ✓
- ML Preparation: CS2CD loader, augmentation, transformer model ✓
- Developer Experience: Makefile, README, test commands ✓
- Status: **COMPLETE** — All v1 requirements satisfied

**Next:** Milestone v2 will add Python Analysis Pipeline (Phase 3) with worker, parser, feature extractors, and detection scoring.

---

*Last updated: 2026-05-15 after v1 milestone completion*
