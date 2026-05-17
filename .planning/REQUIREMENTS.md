# Requirements: CS2 Demo Cheat Detection

**Defined:** 2026-05-15
**Core Value:** Users can upload or point to a CS2 demo and receive a reproducible, explainable, player-level cheat suspicion analysis based only on post-game demo data.

## v1 Requirements

### Infrastructure

- [x] **INFR-01**: Developer can start PHP-FPM, Nginx, PostgreSQL, Redis, and Python services with Docker Compose.
- [x] **INFR-02**: PostgreSQL and Redis services expose healthchecks used by dependent services.
- [x] **INFR-03**: PHP and Python containers run as non-root users.
- [x] **INFR-04**: Developer can configure all secrets and service URLs through `.env` copied from `.env.example`.
- [x] **INFR-05**: Demo files are stored in a Docker volume and are ignored by git.

### Symfony Backend

- [x] **BACK-01**: API user can upload a `.dem` file through `POST /api/demos`.
- [x] **BACK-02**: API user can fetch demo status and results through `GET /api/demos/{id}`.
- [x] **BACK-03**: API user can fetch analysis history for a Steam ID through `GET /api/players/{steamId}/history`.
- [x] **BACK-04**: Backend persists Demo, Player, and AnalysisResult entities with the fields defined in `tasks/setup.md`.
- [x] **BACK-05**: Backend validates uploaded demo files before accepting them.
- [x] **BACK-06**: Backend dispatches demo analysis asynchronously without waiting for Python analysis to complete.
- [x] **BACK-07**: Backend ingests player-level analysis results and marks demos as done or error.

### Queue and Worker

- [ ] **WORK-01**: Python worker consumes Redis queue `cs2.analysis` with BRPOP.
- [ ] **WORK-02**: Worker accepts jobs containing `demo_id` and `file_path`.
- [ ] **WORK-03**: Worker writes structured JSON logs to stdout.
- [ ] **WORK-04**: Worker handles SIGTERM gracefully.
- [ ] **WORK-05**: Worker records processing exceptions in PostgreSQL and marks affected demos as error.

### Demo Parsing and Features

- [ ] **FEAT-01**: Parser extracts requested tick properties from CS2 demo files.
- [ ] **FEAT-02**: Parser extracts requested gameplay events from CS2 demo files.
- [ ] **FEAT-03**: Aimbot extractor computes kill windows, snap ratio, angular velocity, angular jerk, reaction proxy, and a normalized score.
- [ ] **FEAT-04**: Triggerbot extractor computes reaction times, bimodality coefficient, instant-kill ratio, and a normalized score.
- [ ] **FEAT-05**: Wallhack extractor computes sound timeline, pre-aim without info, crosshair-on-peek delta, and a normalized score.
- [ ] **FEAT-06**: Recoil extractor loads recoil patterns, extracts spray sequences, computes correlation and consistency, and produces a normalized score.
- [ ] **FEAT-07**: Bhop extractor computes jump-land timing, perfect jump ratio, sequence length, and a normalized score.
- [ ] **FEAT-08**: Session extractor computes per-round consistency, variance, warmup-curve absence, and a normalized score.
- [ ] **FEAT-09**: Weighted scorer combines all feature scores into clean, suspicious, or likely_cheating labels.

### ML Preparation

- [ ] **ML-01**: Dataset loader downloads or opens the CS2CD Hugging Face dataset.
- [ ] **ML-02**: Dataset loader converts Parquet rows to AntiCheatPT-compatible 256x44 matrices.
- [ ] **ML-03**: Dataset pipeline creates stratified train, validation, and test splits at 70/15/15.
- [ ] **ML-04**: Dataset pipeline applies Gaussian position noise while preserving relative attacker-victim distance.
- [ ] **ML-05**: PyTorch model implements the requested AntiCheatPT_256-style transformer architecture.
- [ ] **ML-06**: Training entrypoint can run with BCEWithLogitsLoss, AdamW, StepLR, and batch size 128.

### Developer Experience

- [ ] **DEVX-01**: Makefile exposes the requested targets for local operation, testing, dataset download, and training.
- [ ] **DEVX-02**: README documents prerequisites, quickstart, migration, direct analysis, API examples, ML phase, and architecture.
- [ ] **DEVX-03**: Recoil pattern data includes a complete AK-47 example and M4A4/M4A1-S stubs with the same schema.
- [ ] **DEVX-04**: `.gitignore` excludes PHP artifacts, Python caches, ML checkpoints, demo files, and `.env`.
- [ ] **DEVX-05**: PHP and Python test commands are available through Make targets.

## v2 Requirements

### Observability

- **OBS-01**: Operator can scrape pipeline metrics with Prometheus.
- **OBS-02**: Operator can view worker and pipeline dashboards in Grafana.
- **OBS-03**: Operator can inspect Python worker logs through Loki.

### Storage

- **STOR-01**: Operator can switch demo storage from local volume to MinIO or S3 using configuration.

### Interface

- **UI-01**: User can inspect uploads, analysis status, and result explanations through a web UI.

### Demo Viewer and Heatmaps

- **VIEWER-PYTHON-FOUNDATION**: Python can transform CS2 world coordinates to radar pixels, render static heatmaps, export tick chunks to Redis, and find similar grenade throws.
- **VIEWER-API-FOUNDATION**: Symfony exposes compact round and event summaries for analyzed demos without storing raw tick data in PostgreSQL.
- **VIEWER-HEATMAP-END_TO_END**: User can request cached or generated heatmap PNGs for kills, deaths, damage, damage taken, and grenades.
- **VIEWER-TICK-STREAMING**: User can stream sampled tick data for playback through validated chunked API requests.
- **VIEWER-CANVAS-UI**: User can inspect an analyzed demo in an interactive 2D Canvas radar viewer with timeline, player filters, and heatmap mode.
- **VIEWER-SUSPICION-GRENADE-REVIEW**: User can review flagged kills and grenade trajectories as explainable post-game research signals.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live cheat detection | The project is scoped to post-game demo analysis only. |
| Memory reading or client inspection | Ethical and technical boundary stated in the brief. |
| API Platform | User explicitly requested simple controllers. |
| Ban automation | Suspicion scores are research signals, not enforcement decisions. |
| Production observability stack in v1 | Prometheus, Grafana, and Loki are useful after the pipeline exists. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |
| BACK-01 | Phase 2 | Complete |
| BACK-02 | Phase 2 | Complete |
| BACK-03 | Phase 2 | Complete |
| BACK-04 | Phase 2 | Complete |
| BACK-05 | Phase 2 | Complete |
| BACK-06 | Phase 2 | Complete |
| BACK-07 | Phase 2 | Complete |
| WORK-01 | Phase 3 | Pending |
| WORK-02 | Phase 3 | Pending |
| WORK-03 | Phase 3 | Pending |
| WORK-04 | Phase 3 | Pending |
| WORK-05 | Phase 3 | Pending |
| FEAT-01 | Phase 3 | Pending |
| FEAT-02 | Phase 3 | Pending |
| FEAT-03 | Phase 3 | Pending |
| FEAT-04 | Phase 3 | Pending |
| FEAT-05 | Phase 3 | Pending |
| FEAT-06 | Phase 3 | Pending |
| FEAT-07 | Phase 3 | Pending |
| FEAT-08 | Phase 3 | Pending |
| FEAT-09 | Phase 3 | Pending |
| ML-01 | Phase 4 | Pending |
| ML-02 | Phase 4 | Pending |
| ML-03 | Phase 4 | Pending |
| ML-04 | Phase 4 | Pending |
| ML-05 | Phase 4 | Pending |
| ML-06 | Phase 4 | Pending |
| DEVX-01 | Phase 5 | Pending |
| DEVX-02 | Phase 5 | Pending |
| DEVX-03 | Phase 5 | Pending |
| DEVX-04 | Phase 5 | Pending |
| DEVX-05 | Phase 5 | Pending |
| VIEWER-PYTHON-FOUNDATION | Phase 13 | Complete |
| VIEWER-API-FOUNDATION | Phase 13 | Complete |
| VIEWER-HEATMAP-END_TO_END | Phase 13 | Complete |
| VIEWER-TICK-STREAMING | Phase 13 | Complete |
| VIEWER-CANVAS-UI | Phase 13 | Complete |
| VIEWER-SUSPICION-GRENADE-REVIEW | Phase 13 | Complete |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-17 after Phase 13 completion*
