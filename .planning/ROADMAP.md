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

### Planned Phases

- [ ] **Phase 8: Demo Download per Sharecode** — Automated CS2 demo import via Sharecode links

**Phase 8 Plans:** 4 plans in 3 waves

- [ ] 08-01-PLAN.md — Database schema, entities, dependencies (Wave 1)
- [ ] 08-02-PLAN.md — API endpoint, validation, rate limiting (Wave 1)
- [ ] 08-03-PLAN.md — Python worker, platform fetchers, download logic (Wave 2)
- [ ] 08-04-PLAN.md — Frontend UI, progress tracking, history (Wave 3)

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

*Last updated: 2026-05-16 after Phase 8 planning*
