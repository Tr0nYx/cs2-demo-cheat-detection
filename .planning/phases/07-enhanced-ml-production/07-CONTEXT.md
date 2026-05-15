---
phase: 7
slug: enhanced-ml-production
status: context-locked
created: 2026-05-15
---

# Phase 7 — Implementation Context

> Decisions extracted from user discussion. Answers: How realistic should recoil patterns be? Where and how should we deploy? What observability matters? How to update models safely?

---

## Executive Summary

**What:** Upgrade recoil pattern fidelity, deploy to production infrastructure, and add observability monitoring.

**Scope:** ML-learned recoil patterns (hybrid with fallbacks), Docker Compose production on self-hosted VPS, Prometheus/Grafana/Loki observability stack, and model versioning strategy.

**Tech Stack:** Consistent with v1/v2 (Symfony + Python + PostgreSQL + Redis).

---

## Locked Decisions

### 1. Recoil Pattern Strategy

**Decision:** Hybrid approach — ML-learned patterns for known weapons, geometric fallback models for unknowns.

**Why:**
- Balances realism (ML-learned for high-volume weapons) with robustness (fallbacks don't crash).
- Allows incremental improvement: start with stubs, replace with ML as data improves.
- Research transparency: keep old stub patterns available alongside new ML patterns.

**Weapons Covered (ML-learned patterns):**
- Primary rifles: AK-47, M4A4, M4A1-S
- SMGs: MP9, UMP45
- Pistols: Deagle, P250, others
- Special: AWP and snipers (single-shot, mainly for wallhack detection)

**Implementation Details:**

1. **Pattern Extraction:** Use quantile-based bounds (25th/50th/75th percentile) from CS2CD dataset spray trajectories.
   - More robust than centroid clustering — captures realistic spray variance.
   - Flags anything beyond 90th percentile as suspicious.

2. **Movement Sensitivity:** Include player velocity in recoil offset calculations.
   - Strafing (AD spam) affects spray accuracy — detect jittery aim + movement combos.
   - Feature: extract velocity vector from player state in demo context windows.

3. **Fallback for Unknown Weapons:** Skip weapon analysis.
   - Conservative approach — avoids false positives.
   - Downsides: incomplete coverage for niche weapons.
   - Can upgrade in v3 if needed.

4. **Pattern Updates:** On-demand recomputation from latest CS2CD dataset.
   - Operator runs script to pull fresh dataset, recompute quantiles, validate, deploy.
   - No automatic updates — research transparency matters.

5. **Storage & Versioning:**
   - Store patterns in PostgreSQL table: `recoil_patterns(weapon, pattern_version, dataset_version, quantiles_json, created_at, is_active)`.
   - Track dataset version and timestamp for reproducibility.
   - Shadow mode: both old stub and new ML patterns available, demo analysis can choose which to use.

6. **Validation Before Deployment:**
   - Compare extracted patterns with AntiCheatPT paper's reported spray behaviors (sanity check).
   - Live A/B test: run old + new patterns on staging demos, compare detection scores, flag large deltas.
   - If patterns fail validation: roll back via shadow mode (keep old active, disable new).

**Out of Scope (v1 Phase 7):**
- Real-time pattern learning from live demos.
- Per-rank pattern variations (expert vs. beginner sprays).
- Multi-weapon combo detection (switching mid-spray).

---

### 2. Production Deployment Infrastructure

**Decision:** Docker Compose on self-hosted VPS (e.g., Linode). No Kubernetes in Phase 7.

**Why:**
- Simpler than K8s for a single-region research project.
- Full operational control without cloud vendor lock-in.
- Cost-effective: single VPS (~$20-40/mo) vs. managed K8s.
- Docker Compose brings local dev → prod parity.

**Deployment Model:**

1. **Hosting:** Self-hosted VPS (Linode, Hetzner, etc.)
   - Minimum specs: 2 CPU, 4GB RAM, 50GB disk (grows with demo archive).
   - Health checks and monitoring determine scaling needs post-launch.

2. **Container Orchestration:** Docker Compose (production-grade).
   - Same `docker-compose.yml` as local dev, with production secrets (env file, secret keys).
   - All services (Symfony, Python worker, PostgreSQL, Redis, Prometheus, Grafana, Loki) managed by Compose.
   - Health checks ensure service resilience.

3. **CI/CD Pipeline:**
   - GitHub Actions workflow on every commit to `main`:
     - Run tests (PHP, Python, E2E).
     - Build Docker images (PHP, Python, Next.js).
     - Push to Docker Hub or private registry.
     - Deploy via SSH to VPS: pull latest images, run `docker-compose pull && docker-compose up -d`.

4. **Rollback Strategy:** Database migration compatibility.
   - All migrations must be forward and backward compatible.
   - If a new release breaks, revert to previous image tag; no schema rollback needed (migrations self-heal).
   - Instant rollback: `docker-compose up` with old image tag.

5. **Storage:**
   - Demo files: Docker volume on VPS (single disk, not replicated).
   - Backups: automated daily snapshots of volume to object storage (S3, etc.) for disaster recovery.

**Out of Scope (Phase 7):**
- Multi-region deployment.
- Load balancing across multiple VPS nodes.
- Kubernetes or container orchestrators.
- Blue-green deployments.

---

### 3. Observability & Monitoring Stack

**Decision:** Prometheus + Grafana + Loki for metrics, visualization, and log aggregation.

**Why:**
- Industry standard for production monitoring.
- All three are open-source and run in Docker (fits Compose model).
- Grafana unifies metrics and logs in single dashboard.
- 30-day retention balances storage cost and debugging window.

**Metrics to Track:**

1. **Request Latency (API responses):**
   - P50, P95, P99 latencies for `/api/demos/*` endpoints.
   - Alert: P95 > 2 seconds.

2. **Analysis Duration:**
   - Time from job dispatch to result completion (per demo).
   - Expected: 10-30 seconds typical, up to 5 minutes for large demos.
   - Alert: analysis time > 5 minutes consistently.

3. **System Resources:**
   - CPU, memory, disk usage on VPS.
   - Alert: any metric > 80% (capacity planning trigger).

4. **Error Rates & Types:**
   - Parse failures, model inference failures, database errors.
   - Track by error type for root cause analysis.
   - Alert: error rate > 5% (1 in 20 requests failing).

**Alert Thresholds:**
```
P95 latency > 2s        → page on-call
Analysis time > 5 min   → log warning, investigate
Error rate > 5%         → page on-call
Resource usage > 80%    → log warning, plan scaling
```

**Log & Metrics Retention:**
- Prometheus: 30-day retention (default).
- Loki: 30-day retention for logs.
- Older data: not retained in Phase 7 (defer archival to v3).

**Grafana Dashboards:**
- Default Prometheus/Node dashboards for system health (CPU, memory, disk, network).
- 1-2 custom dashboards:
  1. **Demo Analysis:** request count, latency distribution, analysis duration, error rate.
  2. **Model Inference:** model version, inference latency, retry counts, fallback usage.
- Readable by anyone with Grafana access; no authentication required (research tool).

**Sentry Integration (from Phase 6):**
- Continue error tracking from Next.js frontend.
- Optionally extend to backend: Symfony exception logging to Sentry.
- Complements Prometheus/Loki (captures exceptions + breadcrumbs, not just metrics/logs).

**Out of Scope (Phase 7):**
- Custom alerting (PagerDuty, Slack webhook) — log alerts locally, check Grafana.
- Log archival to cold storage.
- Advanced analytics (trend detection, anomaly detection).

---

### 4. ML Model Updates & Production Serving

**Decision:** Graceful model updates with retry resilience, versioned models stored with analysis results.

**Why:**
- Graceful shutdown minimizes downtime and ensures in-flight analyses complete cleanly.
- Retry with backoff handles transient inference failures without user retrying.
- Storing model version with results ensures reproducibility and debugging.

**Model Update Process:**

1. **Update Trigger:**
   - Operator decides to deploy new model (e.g., retrained on fresh CS2CD data).
   - New model checkpoint committed to repo or registry.

2. **Deployment:**
   - CI/CD builds new Python worker image with updated model.
   - GitHub Actions publishes image to registry.
   - VPS pulls new image.
   - Graceful shutdown: stop accepting new jobs, finish in-flight analyses, load new model, restart worker.
   - Typical downtime: 1-2 minutes (depends on in-flight demo sizes).

3. **Inference Failure Handling:**
   - If model inference times out or crashes:
     - Retry with exponential backoff: 1s, 2s, 4s (max 3 retries).
     - If all retries fail: mark demo as error, user can retry later.
   - No fallback to heuristics (v1 Phase 7) — fail explicitly for reproducibility.

4. **Model Versioning:**
   - Store in `AnalysisResult.model_version` (string): git commit SHA or semantic version (e.g., "v1.0.1-anticheatpt-2026-05-15").
   - Every demo records which model scored it.
   - Queryable for: "which demos used model v1.0?" for retro-analysis, debugging version-specific issues.

5. **A/B Testing (future):**
   - Shadow mode: run both old + new model in parallel, record both scores (v3 enhancement).
   - Phase 7 is single-model-only.

**Backwards Compatibility:**
- New model must accept same input schema as old (demo context windows from AnalysisResult).
- If schema changes, write adapter in deployment script.

**Out of Scope (Phase 7):**
- Hot reload (no-downtime model swaps).
- Automated model retraining on schedule.
- Model A/B testing or canary deployments.
- Fallback to simpler rule-based detection on inference failure.

---

## Gray Areas Resolved ✅

| Area | Decision | Reference |
|------|----------|-----------|
| Recoil pattern approach | Hybrid ML + fallback models | §1 |
| Weapons coverage | All categories (rifles, SMGs, pistols, special) | §1 |
| Movement sensitivity | Include velocity in recoil offset | §1 |
| Unknown weapon handling | Skip analysis | §1 |
| Pattern extraction method | Quantile-based bounds (25/50/75 percentile) | §1 |
| Pattern update cadence | On-demand (operator-triggered) | §1 |
| Backward compatibility for patterns | Keep old stub + new ML (shadow mode) | §1 |
| Pattern storage | PostgreSQL with versioning metadata | §1 |
| Pattern validation | AntiCheatPT comparison + live A/B test | §1 |
| Validation failure rollback | Shadow mode (keep old, disable new) | §1 |
| Deployment infrastructure | Docker Compose on self-hosted VPS | §2 |
| Cloud platform | Self-hosted (Linode/similar) | §2 |
| Orchestration | Docker Compose (no K8s) | §2 |
| CI/CD | GitHub Actions → VPS via SSH | §2 |
| Rollback strategy | Database migration compatibility | §2 |
| Metrics to track | Latency, analysis duration, resources, errors | §3 |
| Alert thresholds | P95 > 2s, analysis > 5min, error > 5%, resource > 80% | §3 |
| Log/metrics retention | 30 days | §3 |
| Grafana dashboards | Default + 1-2 custom (analysis + model) | §3 |
| Model update process | Graceful shutdown + restart | §4 |
| Inference failure handling | Retry with backoff (3 retries) | §4 |
| Model versioning | Store in AnalysisResult.model_version | §4 |

---

## Canonical References

- `.planning/PROJECT.md` — Project goals, constraints, tech stack
- `.planning/ROADMAP.md` — Milestone v1 & v2 context
- `.planning/milestones/v1-ROADMAP.md` — v1 completion summary and v2 deferral items
- `.planning/phases/06-frontend-application-interface/06-CONTEXT.md` — Phase 6 deployment and API decisions (Docker Compose background)
- `python/features/recoil.py` — Current recoil pattern implementation (stubs + AK-47)
- `python/ml/` — ML training infrastructure (model, dataset loader, training entrypoint)
- AntiCheatPT paper reference: arXiv 2025-08-08 (for pattern validation comparison)
- CS2CD Hugging Face dataset: DOI 10.57967/hf/5654 (source for ML pattern extraction)

---

## Code Context

**Existing Recoil Implementation:**
- `python/features/recoil.py`: AK-47 (realistic), M4A4/M4A1-S (stubs at 24 ticks).
- Phase 7 will replace M4A4/M4A1-S stubs with ML-learned patterns, add SMGs/pistols/special, include movement sensitivity.

**Existing Deployment:**
- `docker-compose.yml`: local dev stack (PHP, Nginx, PostgreSQL, Redis, Python worker).
- Phase 7 will harden for production (add Prometheus, Grafana, Loki services; configure health checks; add secrets management).

**Existing Model:**
- `python/ml/model.py`: AntiCheatTransformer (nn.Transformer encoder).
- Phase 7 will add versioning logic: store model checkpoint path, record version in demo results.

**Existing API:**
- Phase 6 completed frontend + API contracts.
- Phase 7 adds: model_version field to AnalysisResult, pattern_version tracking in demo metadata.

---

## Next Steps

1. **Research Phase:** Analyze CS2CD dataset for weapon pattern distributions, movement sensitivity impact, skill-level variations.
2. **Planning Phase:** Break Phase 7 into tasks: pattern extraction → VPS setup → observability stack → model versioning → integration testing.
3. **Execution Phase:** Implement in waves (patterns, deployment, observability, model updates), verify each component before integration.

---

## Deferred Ideas

- **v3 Enhancement:** Auto-retraining pipeline (new demo data → recompute patterns on schedule).
- **v3 Enhancement:** Multi-rank pattern variations (expert vs. beginner spray profiles).
- **v3 Enhancement:** Pattern A/B testing with shadow mode (run both, compare scores).
- **v3 Enhancement:** Hot-reload model updates (no downtime).
- **v3 Enhancement:** Automated model retesting on pattern/dataset updates.

---

*Context locked: 2026-05-15*
