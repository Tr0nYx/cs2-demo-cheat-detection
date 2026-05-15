# Roadmap: CS2 Demo Cheat Detection

## Current State

**Milestone v1** (complete) provides the foundational infrastructure, REST API backend, ML preparation framework, and developer ergonomics. [Full details →](./milestones/v1-ROADMAP.md)

The repository is ready for developers to use following the README. Docker Compose runs all services, the Symfony API accepts demo uploads, and the ML training infrastructure is prepared.

## Next Milestone: v2 (Python Analysis Pipeline)

Build the core detection engine that consumes queued demos, parses CS2 data, computes feature scores, and labels suspicion levels.

### Planned Phases

- [ ] **Phase 3: Python Analysis Pipeline** — Worker, parser, feature extractors, scoring, error handling
- [ ] **Phase 6: Enhanced ML & Production** — Upgrade recoil patterns, web UI, deployment, observability

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

*Last updated: 2026-05-15 after v1 milestone completion*
