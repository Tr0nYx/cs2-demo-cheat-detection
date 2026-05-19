# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15)

**Core value:** Users can upload or point to a CS2 demo and receive a reproducible, explainable, player-level cheat suspicion analysis based only on post-game demo data.
**Current focus:** Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline (Context gathered, ready for planning)

## Current Position

Phase: 22 (Apply AntiCheatPT Best Practices to Python Pipeline) - CONTEXT GATHERED
Status: Phase 22 context discussion completed. Key decisions locked:
- Research-first focus on signal quality over production speed
- Extend existing extractors with first/second/third-order derivatives
- Integrate transformer as a weighted-scorer feature
- Modular result structure exposing all pipeline stages (conversion → augmentation → analysis)
- Adaptive calibration: new signals can inform Phase 20 recalibration
- Parser-based tick-aligned positional encoding for transformer
- Stratified sampling only (no synthetic data augmentation)
Last activity: 2026-05-19 - Phase 22 context gathered with detailed implementation decisions.
Phase 22 planning status: ready to execute across expected waves (research-backed feature implementation, transformer sequence model, results schema, and pipeline modularization).

Progress: [##############] v2 Core Complete -> [##############] Phase 13 Complete -> [##############] Phase 14 Complete -> [##############] Phase 15 Complete -> [##############] Phase 16 Complete -> [############] Phase 17 Implemented -> [ ] Phase 17 Verification

## Performance Metrics

**Velocity:**
- Total plans completed: 27 (Phase 15 added 6 plans)
- Average duration: 12 minutes
- Total execution time: 5.4 hours (v2 core features + authentication/dashboard + advanced analytics)

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
| Phase 14: Landing Page + Steam Login | 4 | 47 min (W1-W4) | 12 min |
| Phase 15: Advanced Analytics & User Scoping | 6 | 73 min | 12 min |

**Recent Trend:**
- Last 5 plans: 15-01b dashboard filters, 15-02 sensitivity tuner, 15-03 comparison validation, 15-04 trends/caching, 15-05 leaderboard filtering
- Trend: Phase 15 expanded analytics depth while preserving the Symfony/Python split and research-only ethical boundary.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initialization: Use Symfony 7 plus Python 3.12 split with Redis queue and PostgreSQL result persistence.
- Initialization: Keep the project demo-only and research-oriented.
- Initialization: Treat the live CS2CD dataset DOI as `10.57967/hf/5654` unless a pinned alternative is supplied.
- Phase 1: Keep the Python smoke worker idle by default in Compose so the full stack remains running.
- Phase 15: Use browser-local filter history for recent dashboard scopes; no database-backed saved filters yet.
- Phase 15: Treat all sensitivity and leaderboard outputs as research signals, not proof.

### Pending Todos

None yet.

### Blockers/Concerns

- `gsd-sdk` was not available on PATH during initialization, so planning artifacts were generated inline rather than through SDK helpers.
- `npm run e2e -- analytics-integration.spec.ts` timed out locally after 4 minutes without Playwright output; the route-mocked spec is committed for the next runnable browser pass.

### Roadmap Evolution

- Phase 6 completed: Frontend application interface with Next.js, React Query, Playwright testing
- Phase 7 context locked: Enhanced ML & Production
  - Recoil: Hybrid ML + fallback models, all weapon types, movement sensitivity, quantile-based bounds
  - Deployment: Docker Compose on self-hosted VPS (Kubernetes deferred to v3)
  - Observability: Prometheus + Grafana + Loki stack, 30-day retention
  - Model serving: Graceful shutdown updates, retry backoff, versioned results
- Phase 8 added: Demo download per Sharecode - automated CS2 demo import via Sharecode links
- Phase 13 added: 2D Demo Viewer + Heatmap Module from `tasks/analyse.md`
- Phase 13 completed: 6 waves covering Python viewer foundation, Symfony APIs/cache, heatmap worker, tick hooks, Canvas UI, suspicion review, and grenade inspector
- Phase 14 completed: 4 waves covering landing page, Steam auth, user persistence, dashboard
- Phase 15 completed: 6 plans in 5 waves covering user scoping filters, sensitivity analysis, comparison validation, trend metrics/caching, and filtered leaderboards
- Phase 16 added: hltv demo scrape
- Phase 17 added: steamprofile usage
- Phase 18 added: Sharecode Import and Automatic Match History Tracking
- Phase 19 added: Frontend UI/UX Analysis Console Redesign from `tasks/frontend-ui-ux-review.md`, allowing a substantial refactor or scratch rebuild of the Next.js UI into a cohesive research-safe analysis console.
- Phase 19 planned: 5 waves covering console tokens/primitives, dashboard workflow, results/TRACE explainability, demo viewer/heatmap UX, and analytics/table/form/accessibility verification.
- Phase 18 context gathered: dashboard-only self-service setup, plain sharecode plus Steam launcher-link seed input, periodic bounded background tracking, immediate queueing into the existing import pipeline, encrypted `steamidkey` storage with env-provided secret material, per-connection status/backoff, minimal dashboard transparency, and disconnect that deletes the secret while preserving imported demos/analysis history.
- Phase 18 planned: 4 waves covering tracking schema/secret cipher/Valve client, user-scoped connect/status/disconnect API, bounded scheduler/handler import dispatch, and dashboard tracking UI with secret-safety tests.
- Phase 17 context gathered: tiered Steam profile/inventory checks for demo players, Market-price inventory valuation, research-maximum public snapshots, versioned snapshot audit history, automatic User/Player Steam ID linking, dashboard/player-page display, and research/shadow-mode gate before scoring use
- Phase 17 implemented: 5 plans in 4 waves covering snapshot schema, Steam API clients, refresh pipeline, player UI/API enrichment, and research/shadow-mode gate; DB-backed Symfony verification remains pending
- Phase 20 added: Calibrate High Review Signals and Reduce False Positives in Player Analysis
- Phase 20 context gathered: conservative calibration posture, strong player-specific evidence gates, capped uncertain feature scores with warnings/confidence, and overall high review requiring multiple strong feature families.
- Phase 20 planned: 4 waves covering calibration metadata/scorer guardrails, extractor evidence gates, conservative regression coverage, and results UI confidence/capped evidence display.
- Phase 21 added: AntiCheatPT Research and Python Pipeline Guidance
- Phase 21 goal: Review AntiCheatPT dataset and code patterns to align parser, feature extraction, and scoring pipeline with proven CS2 cheat-detection data conventions and defensible research-only guardrails.
- Phase 22 added: Apply AntiCheatPT Best Practices to Python Pipeline
- Phase 22 goal: Implement feature engineering patterns (first/second/third derivatives of angles, cumulative displacement, statistical summaries), data augmentation for class imbalance, transformer-based sequence patterns with positional encoding, and modular pipeline architecture (extraction → conversion → augmentation → analysis).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Observability | Prometheus, Grafana, Loki | Deferred to v2 | Initialization |
| Storage | MinIO/S3 implementation | Deferred to v2 | Initialization |
| Interface | Full web UI | Deferred to v2 | Initialization |

## Session Continuity

Last session: 2026-05-19
Completed: Phase 16 executed
Current status: Phase 20 planned; high review signal calibration is ready for execution
Next work: Execute Phase 20 with `$gsd-execute-phase 20`

**PROJECT EXECUTION STATUS: PHASE 16 COMPLETE; PHASE 17 IMPLEMENTED, PARTIALLY VERIFIED**
- Phase 3: Python Analysis Pipeline complete (analysis engine complete)
- Phase 6: Frontend Application Interface complete (web UI complete, production-ready)
- Phase 7: Enhanced ML & Production complete (full execution, blockers fixed, observability stack complete)
- Phase 8: Demo Download per Sharecode complete (async import, multi-platform fetchers)
- Phase 9: TRACE Rating System complete (player impact scoring, persistence)
- Phase 10: TRACE API & Frontend complete (endpoint, React Card component)
- Phase 11: TRACE Advanced Visualizations complete (percentiles, trends, interactive charts)
- Phase 12: TRACE Leaderboards complete (global, per-map, time-windowed rankings)
- Phase 13: 2D Demo Viewer + Heatmap complete (interactive Canvas viewer, heatmaps, grenade inspector)
- Phase 14: Landing Page + Steam Login complete (landing, auth, persistence, dashboard)
- Phase 15: Advanced Analytics & User Scoping complete (filters, sensitivity tuner, trend metrics, filtered leaderboard)
- Phase 16: HLTV Demo Scrape complete (playwright scraper, async symfony handler, cron command)
- Phase 17: Steamprofile Usage planned, execution pending

**PHASE 16 COMPLETE**
- Node.js Playwright scraper bypassing Cloudflare for demo URLs and stats
- `hltv-scraper` container integrated in docker-compose.yml
- Asynchronous symfony handler dispatching to standard demo import pipeline
- Admin API for manual triggers and CLI command for Cron tier-1 auto-ingestion

**PHASE 15 COMPLETE**
- User Analysis Scoping: Real-time multi-filter query (map, rating, outcome, timeframe)
- Sensitivity Analysis: Individual feature thresholds with live preview + backend validation
- Player Profiling Trends: Consistency, improvement arc, weapon strengths
- Advanced Leaderboard Filtering: Map, rating band, timeframe filters
- Computation: Hybrid frontend preview plus backend validation
- Filter Persistence: Recent dashboard filter combos stored in localStorage
