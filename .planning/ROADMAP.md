# Roadmap: CS2 Demo Cheat Detection

## Current State

**Milestone v1** (complete) provides the foundational infrastructure, REST API backend, ML preparation framework, and developer ergonomics. [Full details →](./milestones/v1-ROADMAP.md)

The repository is ready for developers to use following the README. Docker Compose runs all services, the Symfony API accepts demo uploads, and the ML training infrastructure is prepared.

## Next Milestone: v2 (Python Analysis Pipeline)

Build the core detection engine that consumes queued demos, parses CS2 data, computes feature scores, and labels suspicion levels.

### Completed Phases

- [x] **Phase 3: Python Analysis Pipeline** — Worker, parser, feature extractors, scoring, error handling (Complete 2026-05-15)
- [x] **Phase 6: Frontend Application Interface** — Web UI for demo upload, analysis results visualization, history dashboard (Complete 2026-05-15)
- [x] **Phase 7: Enhanced ML & Production** — Upgrade recoil patterns, deployment, observability (Complete 2026-05-15)
- [x] **Phase 8: Demo Download per Sharecode** — Multi-platform sharecode import (Steam, Faceit, ESEA), async queue worker, real-time progress UI (Complete 2026-05-16)

### Phase 8 Plans (All Complete)

- [x] 08-01-PLAN.md — Database schema, SharecodeImport entity, validation (Wave 1) ✓
- [x] 08-02-PLAN.md — POST /api/demos/import-sharecode endpoint, rate limiting (Wave 1) ✓
- [x] 08-03-PLAN.md — Python worker, multi-platform fetchers, retry logic (Wave 2) ✓
- [x] 08-04-PLAN.md — React UI, progress tracking, import history (Wave 3) ✓

### Completed Phases (Current Milestone)

- [x] **Phase 9: TRACE Rating System** — Player impact scoring, component calculation, trust multiplier, persistence layer (Complete 2026-05-16)
- [x] **Phase 10: TRACE API & Frontend** — Expose `/api/demos/{id}/trace` endpoint (Wave 1), render TRACE Card with component breakdown (Wave 2) (Complete 2026-05-16)
- [x] **Phase 11: TRACE Advanced Visualizations** — Component percentiles, historical trends, calibration context, interactive charts (Complete 2026-05-17)
- [x] **Phase 12: TRACE Leaderboards** — Global, per-map, time-windowed, and team rankings with 4-metric player comparison (Complete 2026-05-17)
- [x] **Phase 13: 2D Demo Viewer + Heatmap Module** — Interactive post-game radar viewer, server-rendered heatmaps, tick/event APIs, grenade inspector, and cheat-suspicion overlays (Complete 2026-05-17)

### In Progress Phases

- [x] **Phase 14: Landing Page + Steam Login** (3/4 waves complete; Wave 4 just finished)

### Phase 14 Plans (Execution In Progress)

**Phase 14: Landing Page + Steam Login**

Goal: Build a public landing page with Steam API authentication, user session management, and personalized dashboard for logged-in users.

Depends on: Phase 13 (Demo Viewer), Phase 6 (Frontend), Phase 2 (Symfony Backend)

**Wave 1: Landing Page UI** ✅
- [x] 14-01-PLAN.md — Hero section, features cards, public metrics display, responsive design (Complete 2026-05-17)

**Wave 2: Steam Authentication** ✅
- [x] 14-02-PLAN.md — Custom Steam OpenID 2.0 provider with next-auth, backend validation, JWT token generation (Complete 2026-05-17)

**Wave 3: User Persistence** ✅
- [x] 14-03-PLAN.md — Doctrine User entity, PostgreSQL migrations, refresh token storage, repository methods (Complete 2026-05-17)

**Wave 4: Dashboard & Demo History** ✅
- [x] 14-04-PLAN.md — Authenticated dashboard, personalized demo history with pagination/sorting, quick upload, public metrics caching (Complete 2026-05-17)

Cross-wave structure:
- Wave 1 is independent (landing page UI only)
- Wave 2 depends on Wave 1 (adds login button functionality)
- Wave 3 depends on Wave 2 (database for user persistence)
- Wave 4 depends on all prior waves (dashboard uses auth from W2, user data from W3)

### Backlog

- Advanced analytics and trend detection (sensitivity analysis, player profiling, trend forecasting)
- Production deployment guide (Kubernetes, cloud storage)
- Observability stack (Prometheus, Grafana, Loki)
- API versioning and OpenAPI documentation
- Admin dashboard for system monitoring
- Batch analysis API for bulk demos

## Version History

| Version | Status | Completed | Link |
|---------|--------|-----------|------|
| v1.0 | Complete | 2026-05-15 | [Roadmap →](./milestones/v1-ROADMAP.md) |

---

*Last updated: 2026-05-17 after Phase 14 Wave 4 completion; Phase 14 in progress (4/4 waves complete, all features deployed)*
