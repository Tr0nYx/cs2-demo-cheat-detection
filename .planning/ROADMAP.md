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
- [x] **Phase 16: HLTV Demo Scrape** - Node.js Playwright scraper, Async Symfony handler, manual triggers, and Cron auto-ingestion (Complete 2026-05-17)
- [x] **Phase 18: Sharecode Import and Automatic Match History Tracking** - User-authorized Valve match-history tracking with encrypted credentials, bounded discovery, import dispatch, and dashboard setup/status UI. (Complete 2026-05-18)

### Upcoming Phases

- [ ] **Phase 17: Steamprofile Usage** - Implemented and verified against Docker test DB; remaining debt is older handler test-harness access plus human review.
- [ ] **Phase 19: Frontend UI/UX Analysis Console Redesign** - Rework the Next.js frontend into a cohesive analysis console using the UI/UX review in `tasks/frontend-ui-ux-review.md`, including design tokens, shared console layouts, dashboard workflow improvements, clearer TRACE/results explainability, demo viewer UX, responsive behavior, accessibility, and research-safe copy.
- [ ] **Phase 20: Calibrate High Review Signals and Reduce False Positives in Player Analysis** - Audit and recalibrate player-specific aimbot, wallhack, triggerbot, recoil, bhop, session, and weighted scoring so normal demos do not produce blanket high review signals, while preserving explainable research-only output.
- [ ] **Phase 21: AntiCheatPT Research and Python Pipeline Guidance** - Review AntiCheatPT dataset and code patterns to align our parser, feature extraction, and scoring pipeline with proven CS2 cheat-detection data conventions and defensible research-only guardrails.
- [ ] **Phase 22: Apply AntiCheatPT Best Practices to Python Pipeline** - Implement feature engineering patterns (derivatives, cumulative displacement, statistical summaries), data augmentation for class imbalance, transformer-based sequence patterns with positional encoding, and modular pipeline structure (extraction → conversion → augmentation → analysis).

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

### Phase 16 Plans (All Complete)

Goal: Implement automated HLTV match data scraping and demo ingestion.

Depends on: Phase 15

- [x] 16-01-PLAN.md - Core Entities & Infrastructure (docker-compose, schema extensions)
- [x] 16-02-PLAN.md - Scraper Service (Node.js + Playwright Express microservice)
- [x] 16-03-PLAN.md - Symfony Trigger & Background Cron (Messenger handler, Admin API, CLI cron)

### Phase 17 Plans (Implemented - Docker Verified)

Goal: Define and implement Steam profile usage so authenticated Steam identity can support player enrichment, demo ownership, scoped history, and research-safe analytics without treating external profile data as proof of cheating.

Depends on: Phase 14 (Landing Page + Steam Login), Phase 15 (Advanced Analytics & User Scoping), Phase 16 (HLTV Demo Scrape)

Wave 1:
- [x] 17-01-PLAN.md - Steam snapshot data model, versioned profile/inventory storage, market price cache, migrations
- [x] 17-02-PLAN.md - Steam profile/inventory/market clients and research-only inventory valuation

Wave 2 *(blocked on Wave 1 completion)*:
- [x] 17-03-PLAN.md - Tiered refresh queue, handler, planner, and scheduled command

Wave 3 *(blocked on Wave 1 and Wave 2 data availability)*:
- [x] 17-04-PLAN.md - Player API and frontend Steam identity enrichment

Wave 4 *(blocked on snapshot and valuation data)*:
- [x] 17-05-PLAN.md - Research report and shadow-mode gate for external Steam signals

Cross-cutting constraints:
- External Steam profile, inventory, account-age, and market-value data must not affect visible suspicion scores, TRACE scores, labels, or model confidence in Phase 17.
- Steam metadata must be source-labeled, timestamped, privacy/visibility-aware, and auditable through versioned snapshots.
- Inventory value is approximate, volatile, and research-only.

### Phase 18 Plans (Implemented - Host Verified)

Goal: Let authenticated users connect Valve match history by providing their Steam ID, game authentication code, and an initial match sharecode, then automatically discover newer sharecodes for post-game demo ingestion.

Depends on: Phase 8 (Demo Download per Sharecode), Phase 14 (Landing Page + Steam Login), Phase 17 (Steamprofile Usage)

Planning anchors:
- Support `steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-...` links and plain `CSGO-...` sharecodes as seed inputs.
- Use Valve's `ICSGOPlayers_730/GetNextMatchSharingCode/v1` flow with `steamid`, `steamidkey`, and `knowncode` for user-authorized match-history progression.
- Treat HTTP 202 with `nextcode: n/a` as "caught up", HTTP 412 as an invalid or mismatched seed, and HTTP 403/429/503 as credential/rate-limit states requiring backoff and user-visible status.
- Store Steam game authentication codes only as secrets, with revocation/error states and no use beyond match-history discovery.
- Dispatch discovered sharecodes into the existing async import and analysis pipeline; do not alter suspicion, TRACE, or labels based on match-history metadata.

Wave 1:
- [x] 18-01-PLAN.md - Tracking foundation, strict seed parser, encrypted `steamidkey` storage, and Valve match-history client

Wave 2 *(blocked on Wave 1 completion)*:
- [x] 18-02-PLAN.md - Authenticated connect/status/disconnect API with same-user Steam ID enforcement

Wave 3 *(blocked on Wave 1 and Wave 2 completion)*:
- [x] 18-03-PLAN.md - Bounded scheduled tracking, cursor advancement, backoff, and import dispatch

Wave 4 *(blocked on Wave 2 and Wave 3 API/data availability)*:
- [x] 18-04-PLAN.md - Dashboard setup/status UI and secret-safety tests

Cross-cutting constraints:
- `steamidkey` must be encrypted at rest, never logged, never returned by API responses, and never rendered after submission.
- Normal users may track only the Steam ID from their authenticated session/JWT.
- Auto-discovered sharecodes must enter the existing import pipeline and must not create an alternate downloader.
- Match-history metadata must not affect suspicion scores, TRACE scores, labels, model confidence, or player trust.
- Valve `403`/`412` should stop normal retries until user action; `429`/`503` require backoff rather than disconnect.

### Phase 19 Plans (Planned)

Goal: Rebuild or substantially refactor the frontend UI/UX into a cohesive, data-dense analysis console that improves trust, orientation, review speed, accessibility, and explainability while preserving the research-only ethical boundary.

Depends on: Phase 6 (Frontend Application Interface), Phase 10 (TRACE API & Frontend), Phase 11 (TRACE Advanced Visualizations), Phase 12 (TRACE Leaderboards), Phase 13 (2D Demo Viewer + Heatmap Module), Phase 14 (Landing Page + Steam Login), Phase 15 (Advanced Analytics & User Scoping), Phase 17 (Steamprofile Usage), Phase 18 (Sharecode Import and Automatic Match History Tracking)

Review anchor:
- `tasks/frontend-ui-ux-review.md` - UI/UX Pro Max review with prioritized findings, design-system direction, task backlog, affected files, and acceptance criteria.

Planning anchors:
- Treat the target product as a serious post-game research analysis console, not a marketing interface.
- It is acceptable to rebuild frontend surfaces from scratch where that produces a cleaner design system and workflow, but preserve existing backend contracts and user-facing capabilities.
- Prioritize a dark/OLED-friendly, data-dense dashboard style with semantic status colors, accessible contrast, stable focus states, and consistent table/chart behavior.
- Keep all suspicion, TRACE, Steam profile, inventory, and match-history metadata framed as research signals or provenance, never proof of cheating.
- Improve workflow hierarchy: ingestion/status dashboard, evidence-first results, clearer TRACE explanations, what-if sensitivity tuning, replay-like demo viewer, and accessible analytics/leaderboards.
- Verify responsive behavior at 320px, 768px, 1024px, and 1440px, plus keyboard navigation for primary workflows.

Expected waves:
- Wave 1: Console design tokens, page shells, shared panels, status badges, research-signal notice, typography/data-value styling.
- Wave 2: Dashboard workflow redesign for ingestion, tracking, filters, pipeline status, scoped demos, and history.
- Wave 3: Results, TRACE, feature evidence, and sensitivity tuner redesign with clearer hierarchy and neutral research copy.
- Wave 4: Demo viewer and heatmap UX pass with stable inspector, timeline controls, responsive layout, legends, and color semantics.
- Wave 5: Analytics, leaderboards, tables, forms, error states, accessibility polish, and Playwright visual/responsive verification.

Wave 1:
- [ ] 19-01-PLAN.md - Console design system foundation

Wave 2 *(blocked on Wave 1 completion)*:
- [ ] 19-02-PLAN.md - Dashboard workflow console

Wave 3 *(blocked on Wave 1 and Wave 2 completion)*:
- [ ] 19-03-PLAN.md - Results and TRACE explainability console

Wave 4 *(blocked on Wave 1 and Wave 3 completion)*:
- [ ] 19-04-PLAN.md - Demo viewer and heatmap UX pass

Wave 5 *(blocked on Waves 1-4 completion)*:
- [ ] 19-05-PLAN.md - Analytics, tables, forms, and final UX verification

Cross-cutting constraints:
- Preserve all existing backend API contracts unless a plan explicitly coordinates a compatible change.
- Keep suspicion, TRACE, Steam metadata, inventory, match-history metadata, and leaderboard ranks framed as research signals or provenance, never proof.
- Do not alter scoring, labels, model confidence, player trust, or cheat-detection semantics as part of UI/UX work.
- Use existing Next.js, React Query, Tailwind/shadcn/base-ui, Recharts, Jest, and Playwright patterns before adding new dependencies.
- Verify keyboard focus, no color-only meaning, and responsive behavior at 320px, 768px, 1024px, and 1440px.

### Phase 20 Plans (Planned)

Goal: Fix inflated high review signals by calibrating the player-specific detection pipeline against real demo behavior, feature evidence, and conservative research-signal thresholds.

Depends on: Phase 3 (Python Analysis Pipeline), Phase 6 (Frontend Application Interface), Phase 15 (Advanced Analytics & User Scoping), Phase 19 (Results/TRACE explainability work if executed first)

Problem anchor:
- The pipeline now attributes results to individual SteamIDs instead of a demo-wide aggregate, but current extractor outputs still produce high review signals for nearly every parsed player in some normal-looking demos.
- Demo-wide scoring is not useful for the product goal; detection output must remain player-specific, explainable, and conservative enough for human review.
- High scores must be supported by player-local evidence windows, not broad demo-level proxies or overly permissive thresholds.

Wave 1:
- [ ] 20-01-PLAN.md - Calibration metadata and weighted scorer guardrails

Wave 2 *(blocked on Wave 1 completion)*:
- [ ] 20-02-PLAN.md - Feature evidence gates and conservative caps

Wave 3 *(blocked on Waves 1-2 completion)*:
- [ ] 20-03-PLAN.md - Regression harness and problem demo guardrails

Wave 4 *(blocked on Waves 1-3 completion)*:
- [ ] 20-04-PLAN.md - Results UI confidence and capped evidence display

Acceptance criteria:
- Existing analyzed demos no longer produce blanket high review labels across most players without strong per-player evidence.
- `steam_id = 0` or other demo-wide aggregate results are not used for visible player suspicion.
- Each high feature score has stored evidence that explains the player-specific measurement causing the signal.
- Low sample counts, parser gaps, or unavailable data reduce confidence instead of inflating scores.
- Regression tests cover at least one normal/baseline demo fixture and the previously problematic demo ID `019e3a28-60a6-7c96-99c8-34ddd3231268`.

Cross-cutting constraints:
- Keep all outputs framed as research signals for human review, never proof or enforcement.
- Do not use live client inspection, memory reading, live cheat behavior, or ban automation.
- Preserve the Symfony/Python boundary: Python owns feature/scoring calibration; Symfony/Frontend only display persisted evidence and labels.
- Prefer transparent statistical thresholds and documented formulas before introducing opaque ML model behavior.

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

*Last updated: 2026-05-18 after Phase 18 host verification*
