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

### Planned Phases

- [ ] **Phase 12: TRACE Leaderboards** — Global and per-map rankings, player comparison
- [ ] **Phase 13+: Advanced Analytics** — Sensitivity analysis, player profiling, trend forecasting

### Backlog

- Web UI for demo upload and result visualization
- Production deployment guide (Kubernetes, cloud storage)
- Observability stack (Prometheus, Grafana, Loki)
- Advanced analytics and trend detection
- API versioning and OpenAPI documentation

## Version History

| Version | Status | Completed | Link |
|---------|--------|-----------|------|
| v1.0 | Complete | 2026-05-15 | [Roadmap →](./milestones/v1-ROADMAP.md) |

---

*Last updated: 2026-05-17 after Phase 11 completion*
