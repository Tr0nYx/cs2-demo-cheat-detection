# Phase 7: Enhanced ML & Production - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered and rationale.

**Date:** 2026-05-15  
**Phase:** 07-enhanced-ml-production  
**Areas discussed:** Recoil Pattern Realism (8 questions), Production Deployment (4 questions), Observability & Monitoring (4 questions), Model Updates & Serving (3 questions)

---

## Recoil Pattern Realism

### Question 1: ML-Learned vs Geometric Models

| Option | Description | Selected |
|--------|-------------|----------|
| ML-learned patterns (Recommended) | Extract from AntiCheatPT dataset. More accurate but requires training pipeline. | |
| Hand-coded geometric models | Keep simplified, predictable models. Faster to implement, sufficient for research. | |
| Hybrid: ML + fallback models | Use ML where available, fall back to simplified models for unmapped weapons. | ✓ |

**User's choice:** Hybrid: ML + fallback models  
**Notes:** User prioritizes robustness and incremental improvement over pure ML-learned approach.

---

### Question 2: Weapon Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Primary rifles (AK-47, M4A4, M4A1-S) | Most common. ~70% of weapon usage. | ✓ |
| Add SMGs (MP9, UMP45) | High rate-of-fire patterns differ. Better spray detection. | ✓ |
| Add pistols (Deagle, P250, etc.) | Lower sample sizes. May have unreliable patterns. | ✓ |
| Special: AWP and snipers | Single-shot weapons. Useful for wallhack detection. | ✓ |

**User's choice:** All categories selected  
**Notes:** Comprehensive coverage desired. User wants full weapon-type representation for robust detection.

---

### Question 3: Movement Sensitivity

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include movement | More realistic. Better aimbot detection. Requires velocity data. | ✓ |
| No, ignore movement | Simpler. Recoil only. Can add later. | |
| Defer to v3 | Focus on weapon patterns in Phase 7. Movement is v3 enhancement. | |

**User's choice:** Yes, include movement  
**Notes:** User wants realistic detection that captures movement-based aimbots.

---

### Question 4: Unknown Weapon Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Skip weapon analysis | Conservative. Avoids false positives. | ✓ |
| Use closest weapon proxy | Heuristic but covers more cases. | |
| Use generic baseline pattern | Weakest detection but never fails. | |

**User's choice:** Skip weapon analysis  
**Notes:** Research tool favors precision over coverage. Explicit skipping is transparent.

---

### Question 5: Pattern Extraction Method

| Option | Description | Selected |
|--------|-------------|----------|
| Statistical aggregation (centroid clustering) | Simple, interpretable. | |
| Per-player pattern extraction | Learn individual deviations. Better personalized aimbot detection. | |
| Quantile-based bounds (25/50/75 percentile) | Learn ranges. Flags outliers beyond 90th percentile. Most robust. | ✓ |

**User's choice:** Quantile-based bounds  
**Notes:** User prioritizes robust outlier detection over interpretability.

---

### Question 6: Pattern Update Cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Static (Phase 7 only) | Extract once, ship with Phase 7. | |
| Quarterly updates | Recompute every 3 months with new CS2CD data. | |
| On-demand recomputation | Manual script to pull latest and recompute. | ✓ |

**User's choice:** On-demand recomputation  
**Notes:** User wants flexibility to update without waiting for release cycles. Operator-driven.

---

### Question 7: Backward Compatibility for Pattern Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Breaking change OK | Rescore old demos on-demand if needed. | |
| Keep old pattern option | Ship both stubs and ML. Demo analysis chooses. | ✓ |
| Silent upgrade | Replace transparently. May create inconsistency. | |

**User's choice:** Keep old pattern option  
**Notes:** Research transparency important. Maintain reproducibility of old analyses.

---

### Question 8: Pattern Storage & Versioning

| Option | Description | Selected |
|--------|-------------|----------|
| Git-versioned JSON files | Auditable, version control built-in. Large file overhead. | |
| Database table | PostgreSQL with metadata (weapon, timestamp, dataset version). | ✓ |
| Hybrid: JSON + metadata DB | JSON patterns in storage, metadata in DB. | |

**User's choice:** Database table  
**Notes:** User prioritizes queryability and lineage tracking over version control.

---

### Question 9: Pattern Validation Before Deployment

| Option | Description | Selected |
|--------|-------------|----------|
| Regression tests | Run known-cheat demos, compare old vs. new scores. | |
| Comparison with AntiCheatPT | Validate against paper's reported spray behaviors. | ✓ |
| Live A/B test | Deploy to staging, compare detection rates. | ✓ |
| Manual review | Visual inspection of spray plots. | |

**User's choice:** Comparison with AntiCheatPT + Live A/B test  
**Notes:** Combined approach: sanity check + realistic validation.

---

### Question 10: Validation Failure Rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic rollback | Revert to last-known-good patterns automatically. | |
| Manual approval | Flag failures, require human sign-off to roll back. | |
| Dual patterns (shadow mode) | Keep old patterns in production, run new patterns shadow-only. | ✓ |

**User's choice:** Dual patterns (shadow mode)  
**Notes:** Safest approach for research. Allows observation without disruption.

---

## Production Deployment

### Question 1: Orchestration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Kubernetes (Recommended) | Industry standard. Auto-scaling, multi-region. More operational complexity. | |
| Docker Swarm | Simpler than K8s. Sufficient for single-region moderate load. | |
| Managed container service (ECS/Cloud Run) | Cloud provider handles orchestration. Vendor lock-in. | |

**User's choice:** Docker Compose  
**Note:** User provided freeform response: "Kubernetes and Docker Swarm is overkill at the beginning. Docker is enough at the beginning."  
**Notes:** User wants simplicity for Phase 7. Docker Compose with hardening is sufficient. No K8s migration planned.

---

### Question 2: Cloud Platform

| Option | Description | Selected |
|--------|-------------|----------|
| AWS (EC2 or ECS Fargate) | Industry standard, extensive tooling. High operational overhead. | |
| DigitalOcean App Platform | Simpler UX, managed containers, cost-effective. | |
| Self-hosted (VPS like Linode) | Full control, lower cost, manual scaling. | ✓ |
| Docker Hub / Render / Railway | Managed hosting. Simplest, least customizable. | |

**User's choice:** Self-hosted (VPS like Linode)  
**Notes:** User prioritizes control and cost efficiency over managed services.

---

### Question 3: Deployment Process (CI/CD)

| Option | Description | Selected |
|--------|-------------|----------|
| CI/CD (GitHub Actions → VPS) | Automate: git push → test → build → SSH deploy. | ✓ |
| Manual docker-compose up | SSH, git pull, docker-compose up -d. Simple but error-prone. | |
| Docker registry + rolling updates | Push to registry, VPS pulls new images. | |

**User's choice:** CI/CD (GitHub Actions → VPS)  
**Notes:** User wants repeatability and auditability.

---

### Question 4: Rollback Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Blue-green deployment | Run two stacks, switch when new passes health checks. Zero downtime. | |
| Instant rollback | Keep previous image, restart on failure. Brief downtime. | |
| Database migration revert | Forward/backward compatible migrations. Easy rollback without data loss. | ✓ |

**User's choice:** Database migration revert  
**Notes:** User prioritizes data consistency and simplicity over zero-downtime deployments.

---

## Observability & Monitoring

### Question 1: Metrics to Track

| Option | Description | Selected |
|--------|-------------|----------|
| Request latency (API responses) | P50/P95/P99 for /api/demos endpoints. | ✓ |
| Analysis duration | How long each demo takes to analyze. | ✓ |
| System resources (CPU/Memory/Disk) | Capacity planning. Alerts at 80%+ usage. | ✓ |
| Error rates & types | Parse failures, model inference failures, database errors. | ✓ |

**User's choice:** All metrics selected  
**Notes:** Comprehensive monitoring desired.

---

### Question 2: Alert Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| API latency P95 > 2s | Slow response times indicate backend issues. | ✓ |
| Analysis time > 5 minutes | Longer than typical. Flag if consistent. | ✓ |
| Error rate > 5% | More than 1 in 20 requests failing. | ✓ |
| Resource usage > 80% | CPU/Memory/Disk approaching limits. | ✓ |

**User's choice:** All thresholds selected  
**Notes:** All alerts are relevant to production stability.

---

### Question 3: Log & Metrics Retention

| Option | Description | Selected |
|--------|-------------|----------|
| Short term (7 days) | Low cost, minimal analysis. | |
| Medium term (30 days) | Good balance. Default Prometheus/Loki setting. | ✓ |
| Long term (90 days) | Seasonal patterns. More storage. | |
| Archive to cold storage | Keep hot data (30 days), archive older. Cost-effective. | |

**User's choice:** Medium term (30 days)  
**Notes:** Pragmatic default. Sufficient for most debugging scenarios.

---

### Question 4: Grafana Dashboards

| Option | Description | Selected |
|--------|-------------|----------|
| Default Grafana dashboards | Built-in Prometheus/Node dashboards. | |
| Custom dashboards | Design specific to demo analysis. Better UX. | |
| Hybrid: defaults + 1-2 custom | Use defaults for system, add 1-2 custom for analysis-specific metrics. | ✓ |

**User's choice:** Hybrid: defaults + 1-2 custom  
**Notes:** Balance between quick setup and tailored visibility.

---

## Model Updates & Serving

### Question 1: Model Update Process

| Option | Description | Selected |
|--------|-------------|----------|
| Hot reload (no downtime) | Load new model while analyzing. | |
| Graceful shutdown | Finish in-flight, restart with new model. | ✓ |
| A/B test new model | Run old + new in parallel, route % of traffic. | |

**User's choice:** Graceful shutdown  
**Notes:** User accepts brief downtime (1-2 min) for simplicity and safety.

---

### Question 2: Model Inference Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail the analysis | Mark demo as error. User retries later. | |
| Fallback to simpler heuristics | Use rule-based detection instead of model. | |
| Retry with backoff | Retry 3 times before failing. Handles transient timeouts. | ✓ |

**User's choice:** Retry with backoff  
**Notes:** Reasonable resilience. Avoids false failures from transient issues.

---

### Question 3: Model Version Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Store in analysis result | Add model_version field to AnalysisResult. | ✓ |
| Tag in metrics only | Record in Prometheus/Grafana (label). | |
| Commit hash | Use git commit SHA. Best for reproducibility. | |
| Semantic version (e.g., v1.0.1) | Simple, human-readable. | |

**User's choice:** Store in analysis result  
**Notes:** Essential for debugging and reproducibility. Every demo records its scoring model.

---

## Claude's Discretion

No areas were explicitly deferred to Claude. User made explicit choices for all gray areas.

---

## Deferred Ideas

- **v3 Enhancement:** Auto-retraining pipeline (new demo data → recompute patterns on schedule).
- **v3 Enhancement:** Multi-rank pattern variations (expert vs. beginner spray profiles).
- **v3 Enhancement:** Pattern A/B testing with shadow mode.
- **v3 Enhancement:** Hot-reload model updates (no downtime).
- **v3 Enhancement:** Kubernetes deployment (when scale justifies complexity).
- **v3 Enhancement:** Advanced log/metric analysis (trend detection, anomaly detection).
- **v3 Enhancement:** Fallback heuristic models for inference failures (use simpler rule-based scoring).
- **v3 Enhancement:** Multi-region deployment and disaster recovery.

---

*Discussion log created: 2026-05-15*
