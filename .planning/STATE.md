# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15)

**Core value:** Users can upload or point to a CS2 demo and receive a reproducible, explainable, player-level cheat suspicion analysis based only on post-game demo data.
**Current focus:** Phase 14: Landing Page + Steam Login (Planned)

## Current Position

Phase: 14 (Landing Page + Steam Login) - COMPLETE ✅
Status: Phase 14 executed with 4 waves all complete + UAT passed
- Wave 1 (Landing Page UI): ✅ Complete
- Wave 2 (Steam Authentication): ✅ Complete
- Wave 3 (User Persistence + Refresh Tokens): ✅ Complete
- Wave 4 (Dashboard + Demo History + Metrics): ✅ Complete
- UAT: ✅ APPROVED FOR PRODUCTION
- Delivered: Public landing page, Steam OpenID 2.0 auth, user persistence, protected dashboard, demo history with pagination, public metrics caching
- Architecture: Next.js middleware auth, JWT + refresh tokens, httpOnly cookies, Symfony User entity, Redis metrics cache
- Security: Dashboard protected, public metrics safe, httpOnly/Secure/SameSite=Strict, refresh token rotation
- Testing: 4 backend integration tests, 10 Playwright E2E tests, all functional paths verified
Last activity: 2026-05-17 - Phase 14 complete; UAT.md created; 14-04-SUMMARY.md with full execution details

Progress: [##############] v2 Core Complete → [##############] Phase 13 Complete → [##############] Phase 14 Complete

## Performance Metrics

**Velocity:**
- Total plans completed: 21 (Phase 14 Wave 4 just added 1 plan)
- Average duration: 12 minutes
- Total execution time: 4.2 hours (v2 core features + authentication/dashboard in ~1 day)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1: Container Foundation | 3 | 21 min | 7 min |
| Phase 2: Symfony API and Domain | 4 | 48 min | 12 min |
| Phase 3: Python Analysis Pipeline | - | (archived, precomputed) | - |
| Phase 4: ML Dataset and Transformer | 4 | 61 min | 15 min |
| Phase 5: Developer Readiness | 3 | 37 min | 12 min |
| Phase 6: Frontend Application Interface | 2 | 145 min | 72 min |
| Phase 7: Enhanced ML & Production | 4 | 180 min | 45 min |
| Phase 8: Demo Download per Sharecode | 1 | 25 min | 25 min |
| Phase 9: TRACE Rating System | 2 | 32 min | 16 min |
| Phase 10: TRACE API & Frontend | 1 | 28 min | 28 min |
| Phase 11: TRACE Advanced Visualizations | 2 | 45 min | 22 min |
| Phase 12: TRACE Leaderboards | 4 | 98 min | 24 min |
| Phase 13: 2D Demo Viewer + Heatmap | 6 | 154 min | 25 min |
| Phase 14: Landing Page + Steam Login (in progress) | 4 | 47 min (W1-W4) | 12 min |

**Recent Trend:**
- Last 5 plans: 06-01 (infrastructure setup), 06-02 (feature development), verification, bug fix, archival
- Trend: Completed v2 core features (analysis pipeline + frontend). Frontend required longer execution time due to comprehensive component implementation, testing, and Docker integration.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initialization: Use Symfony 7 plus Python 3.12 split with Redis queue and PostgreSQL result persistence.
- Initialization: Keep the project demo-only and research-oriented.
- Initialization: Treat the live CS2CD dataset DOI as `10.57967/hf/5654` unless a pinned alternative is supplied.
- Phase 1: Keep the Python smoke worker idle by default in Compose so the full stack remains running.

### Pending Todos

None yet.

### Blockers/Concerns

- `gsd-sdk` was not available on PATH during initialization, so planning artifacts were generated inline rather than through SDK helpers.

### Roadmap Evolution

- Phase 6 completed: Frontend application interface with Next.js, React Query, Playwright testing
- Phase 7 context locked: Enhanced ML & Production
  - Recoil: Hybrid ML + fallback models, all weapon types, movement sensitivity, quantile-based bounds
  - Deployment: Docker Compose on self-hosted VPS (Kubernetes deferred to v3)
  - Observability: Prometheus + Grafana + Loki stack, 30-day retention
  - Model serving: Graceful shutdown updates, retry backoff, versioned results
- Phase 8 added: Demo download per Sharecode — Automated CS2 demo import via Sharecode links
- Phase 13 added: 2D Demo Viewer + Heatmap Module from `tasks/analyse.md`
- Phase 13 planned: 6 waves covering Python viewer foundation, Symfony APIs/cache, heatmap worker, tick hooks, Canvas UI, suspicion review, and grenade inspector
- Former Advanced Analytics placeholder shifted to Phase 14+

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Observability | Prometheus, Grafana, Loki | Deferred to v2 | Initialization |
| Storage | MinIO/S3 implementation | Deferred to v2 | Initialization |
| Interface | Full web UI | Deferred to v2 | Initialization |

## Session Continuity

Last session: 2026-05-17
Completed: Phase 15 context gathering and decision locking
Current status: Phase 15 context locked — Ready for research and planning
Next work: Phase 15 research (feature vectors, leaderboard pre-computation, trend algorithms)

**PROJECT EXECUTION STATUS: PHASE 14 WAVE 4 COMPLETE ✅**
- Phase 3: Python Analysis Pipeline ✓ (analysis engine complete)
- Phase 6: Frontend Application Interface ✓ (web UI complete, production-ready)
- Phase 7: Enhanced ML & Production ✓ (full execution, blockers fixed, observability stack complete)
- Phase 8: Demo Download per Sharecode ✓ (async import, multi-platform fetchers)
- Phase 9: TRACE Rating System ✓ (player impact scoring, persistence)
- Phase 10: TRACE API & Frontend ✓ (endpoint, React Card component)
- Phase 11: TRACE Advanced Visualizations ✓ (percentiles, trends, interactive charts)
- Phase 12: TRACE Leaderboards ✓ (global, per-map, time-windowed rankings)
- Phase 13: 2D Demo Viewer + Heatmap ✓ (interactive Canvas viewer, heatmaps, grenade inspector)
- Phase 14 Wave 1: Landing Page UI ✓ (public landing page with features/stats)
- Phase 14 Wave 2: Steam Authentication ✓ (OpenID login flow, JWT tokens)
- Phase 14 Wave 3: User Persistence ✓ (User/RefreshToken entities, repositories)
- Phase 14 Wave 4: Dashboard + Demo History + Metrics ✓ (protected dashboard, pagination, caching)
- Phase 15 Context: Advanced Analytics & User Scoping (context gathered, decisions locked, ready for research)

**PHASE 15 CONTEXT LOCKED ✅**
- User Analysis Scoping: Real-time multi-filter query (map, rating, outcome, timeframe)
- Sensitivity Analysis: Individual feature thresholds with live preview + backend validation
- Player Profiling Trends: Consistency, improvement arc, weapon strengths
- Advanced Leaderboard Filtering: Map, rating band, region, timeframe filters
- Computation: Hybrid (frontend preview + backend validation)
- Filter Persistence: Auto-save recent combos to browser history (localStorage)
