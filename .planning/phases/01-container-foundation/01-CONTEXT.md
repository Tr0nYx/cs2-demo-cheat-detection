# Phase 1: Container Foundation - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the Docker Compose foundation for the project: service wiring, Dockerfiles/configuration, environment variables, healthchecks, local demo storage, and permissions. It does not implement Symfony domain behavior, Python demo analysis, API endpoints, ML training, observability, or cloud storage.

</domain>

<decisions>
## Implementation Decisions

### Repository Layout
- **D-01:** Create the exact target top-level structure from `tasks/setup.md` in Phase 1: `docker/`, `symfony/`, `python/`, `data/`, `docker-compose.yml`, `.env.example`, and related foundation files.
- **D-02:** Prefer stable future-facing paths over a temporary minimal scaffold, so later Symfony and Python phases do not need to move Docker mounts or rewrite service paths.

### Compose Profile
- **D-03:** Make the default Compose profile dev-first: bind mounts, fast local iteration, foreground-friendly logs, and practical local defaults.
- **D-04:** Do not spend Phase 1 building a production override/profile unless it is needed to keep the foundation clean; production hardening can be revisited after the app and worker exist.

### Runtime Security
- **D-05:** Use pragmatic non-root runtime users for PHP and Python containers.
- **D-06:** Prioritize permissions that work cleanly with bind mounts and demo storage volumes over strict read-only filesystems or dropped-capability tuning in Phase 1.

### Environment Contract
- **D-07:** Create a complete `.env.example` in Phase 1 covering foreseeable Symfony, Python, Redis, PostgreSQL, storage, and ML configuration.
- **D-08:** Treat `.env.example` as the shared contract between services, even when some variables are consumed in later phases.

### the agent's Discretion
- Exact UID/GID values for non-root users.
- Exact Docker image tags within the requested major versions.
- Whether future-facing `.env.example` values are grouped by service or by lifecycle phase.
- Exact healthcheck intervals, retries, and timeouts, as long as they are sensible for local development.

</decisions>

<specifics>
## Specific Ideas

- User selected the recommended option for every gray area.
- Phase 1 should align closely with the concrete structure and stack named in `tasks/setup.md`.
- The foundation should optimize for local development speed while preserving the explicit non-root and secret-from-env requirements.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 1 goal, requirements, success criteria, and planned plan split.
- `.planning/REQUIREMENTS.md` - `INFR-01` through `INFR-05` define Phase 1 requirements.
- `.planning/PROJECT.md` - Project-level constraints for stack, storage, queueing, security, and quality.

### Source Brief
- `tasks/setup.md` - Requested Docker Compose setup, target project structure, `.env.example` expectation, non-root requirement, storage volume, and quality constraints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No implementation assets exist yet; the repository is a greenfield scaffold.

### Established Patterns
- Planning docs establish a Symfony/Python split, Docker Compose baseline, PostgreSQL source of truth, Redis queue, local volume storage, and environment-variable configuration.

### Integration Points
- `docker-compose.yml` will become the integration point for Nginx, PHP-FPM, Python worker, PostgreSQL, Redis, and demo storage.
- `.env.example` will become the service contract consumed by Docker Compose and later Symfony/Python code.
- `docker/php/Dockerfile`, `docker/python/Dockerfile`, and `docker/nginx/nginx.conf` are the expected container/config paths.

</code_context>

<deferred>
## Deferred Ideas

- Production-oriented Compose profile and deeper container hardening - revisit after the app and worker exist.
- Prometheus, Grafana, and Loki - deferred to v2 observability.
- MinIO/S3 storage implementation - deferred to v2 storage, while keeping a storage abstraction in later backend work.

</deferred>

---

*Phase: 01-container-foundation*
*Context gathered: 2026-05-15*
