# Roadmap: CS2 Demo Cheat Detection

## Current State

**Milestone v1** (complete) provides the foundational infrastructure, REST API backend, ML preparation framework, and developer ergonomics. [Full details ->](./milestones/v1-ROADMAP.md)

The repository supports a post-game CS2 demo research workflow: upload/import demos, parse and score player behavior, show explainable suspicion signals, visualize TRACE impact, review demo events, and explore authenticated advanced analytics.

## Next Milestone: v2 (Python Analysis Pipeline)

Build the core detection engine that consumes queued demos, parses CS2 data, computes feature scores, and labels suspicion levels.

### Completed Phases

- [x] **Phase 3: Python Analysis Pipeline** - Worker, parser, feature extractors, scoring, error handling (Complete 2026-05-15)
- [x] **Phase 6: Frontend Application Interface** - Web UI for demo upload, analysis results visualization, history dashboard (Complete 2026-05-15)
- [x] **Phase 7: Enhanced ML & Production** - Upgrade recoil patterns, deployment, observability (Complete 2026-05-15)
- [x] **Phase 8: Demo Download per Sharecode** - Multi-platform sharecode import (Steam, Faceit, ESEA), async queue worker, real-time progress UI (Complete 2026-05-16)
- [x] **Phase 9: TRACE Rating System** - Player impact scoring, component calculation, trust multiplier, persistence layer (Complete 2026-05-16)
- [x] **Phase 10: TRACE API & Frontend** - Expose `/api/demos/{id}/trace` endpoint and render TRACE Card with component breakdown (Complete 2026-05-16)
- [x] **Phase 11: TRACE Advanced Visualizations** - Component percentiles, historical trends, calibration context, interactive charts (Complete 2026-05-17)
- [x] **Phase 12: TRACE Leaderboards** - Global, per-map, time-windowed, and team rankings with player comparison (Complete 2026-05-17)
- [x] **Phase 13: 2D Demo Viewer + Heatmap Module** - Interactive post-game radar viewer, server-rendered heatmaps, tick/event APIs, grenade inspector, and suspicion overlays (Complete 2026-05-17)
- [x] **Phase 14: Landing Page + Steam Login** - Public landing page, Steam OpenID 2.0 auth, user persistence, protected dashboard, demo history, public metrics caching (Complete 2026-05-17)
- [x] **Phase 15: Advanced Analytics & User Scoping** - User-scoped demo filters, sensitivity tuner and validation, trend metrics, and filtered TRACE leaderboards (Complete 2026-05-17)

### Phase 8 Plans (All Complete)

- [x] 08-01-PLAN.md - Database schema, SharecodeImport entity, validation (Wave 1)
- [x] 08-02-PLAN.md - POST /api/demos/import-sharecode endpoint, rate limiting (Wave 1)
- [x] 08-03-PLAN.md - Python worker, multi-platform fetchers, retry logic (Wave 2)
- [x] 08-04-PLAN.md - React UI, progress tracking, import history (Wave 3)

### Phase 14 Plans (All Complete)

Goal: Build a public landing page with Steam API authentication, user session management, and personalized dashboard for logged-in users.

Depends on: Phase 13 (Demo Viewer), Phase 6 (Frontend), Phase 2 (Symfony Backend)

- [x] 14-01-PLAN.md - Hero section, feature cards, public metrics display, responsive design
- [x] 14-02-PLAN.md - Custom Steam OpenID 2.0 provider with next-auth, backend validation, JWT token generation
- [x] 14-03-PLAN.md - Doctrine User entity, PostgreSQL migrations, refresh token storage, repository methods
- [x] 14-04-PLAN.md - Authenticated dashboard, personalized demo history with pagination/sorting, quick upload, public metrics caching

### Phase 15 Plans (All Complete)

Goal: Enable users to customize analysis scope, explore sensitivity of detection models, and identify player profiling trends.

Depends on: Phase 14 (User persistence), Phase 12 (Leaderboards), Phase 9 (TRACE)

- [x] 15-01a-PLAN.md - Authenticated filtered demo API, metadata, and persistence support
- [x] 15-01b-PLAN.md - Dashboard sidebar, filtered demos hook, and local filter history
- [x] 15-02-PLAN.md - Demo detail feature vectors and frontend threshold preview
- [x] 15-03-PLAN.md - Backend sensitivity comparison endpoint, validation, and rate limiting
- [x] 15-04-PLAN.md - Consistency, arc, weapon trend endpoints and cache invalidation
- [x] 15-05-PLAN.md - Dynamic filtered TRACE rankings and route-mocked integration spec

### Phase 16 Plans (Not started)

Goal: hltv demo scrape

Depends on: Phase 15

### Backlog

- Trend forecasting beyond current consistency/arc/weapon analytics
- Production deployment guide (Kubernetes, cloud storage)
- Observability stack (Prometheus, Grafana, Loki)
- API versioning and OpenAPI documentation
- Admin dashboard for system monitoring
- Batch analysis API for bulk demos

## Version History

| Version | Status | Completed | Link |
|---------|--------|-----------|------|
| v1.0 | Complete | 2026-05-15 | [Roadmap ->](./milestones/v1-ROADMAP.md) |

---

*Last updated: 2026-05-17 after Phase 15 completion*
