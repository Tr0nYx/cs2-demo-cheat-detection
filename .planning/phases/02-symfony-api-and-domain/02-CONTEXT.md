# Phase 2: Symfony API and Domain - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the Symfony product boundary: Symfony 7 skeleton, database connectivity, Demo/Player/AnalysisResult persistence, demo upload/status/result/player-history REST endpoints, a storage abstraction over the local demo volume, and Redis-backed dispatch/result-ingest contracts. It does not implement Python demo parsing, feature extraction, scoring, ML training, a full web UI, S3/MinIO storage, or production observability.

</domain>

<decisions>
## Implementation Decisions

### API Shape
- **D-01:** Use pragmatic REST JSON with simple Symfony controllers, not API Platform and not JSON:API.
- **D-02:** `POST /api/demos` returns immediately with `demo_id`, `status`, and `status_url`.
- **D-03:** `GET /api/demos/{id}` returns demo metadata, status, and analysis results together when results exist.
- **D-04:** Errors use a stable structure: `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- **D-05:** Public errors use stable codes and concise messages. Avoid leaking exception internals.
- **D-06:** `GET /api/players/{steamId}/history` returns newest results first with `limit` and `offset` parameters. Default to a small page such as `limit=20`.

### Domain Model
- **D-07:** Use UUIDs for Demo and AnalysisResult API identities.
- **D-08:** Treat `Player.steamId` as the unique natural player identifier.
- **D-09:** Demo status values are `uploaded`, `queued`, `processing`, `done`, and `error`.
- **D-10:** Store one `AnalysisResult` per Demo + Player.
- **D-11:** Store overall label and score as first-class fields, with feature scores and explainability/raw support data as JSON fields.
- **D-12:** Add practical database constraints immediately: unique `Player.steamId`, unique `(demo, player)` analysis results, enum-backed status/label values, and non-null required fields.

### Storage Behavior
- **D-13:** Store uploaded demo files as `/storage/demos/{demoUuid}.dem`.
- **D-14:** Preserve the client original filename only as Demo metadata.
- **D-15:** Phase 2 upload validation checks `.dem` extension, configured maximum size, and readable successful upload. Parser/header validation belongs to Phase 3.
- **D-16:** If storage, database, or queue dispatch fails during upload, return a structured error and perform best-effort cleanup of any stored file.
- **D-17:** Do not implement duplicate detection in Phase 2. Every accepted upload creates a new Demo.

### Queue Contract
- **D-18:** Keep `AnalyzeDemoMessage` as a Symfony-internal message.
- **D-19:** The Symfony analyze handler sets Demo status to `queued` after successfully writing a compact JSON job to Redis list `cs2.analysis`.
- **D-20:** The Python-facing job payload is compact JSON containing at least `{ "demo_id": "...", "file_path": "..." }`.
- **D-21:** Status progression is `uploaded` after DB/storage creation, `queued` after successful Redis enqueue, and `processing`/`done`/`error` later by Python or result ingestion.
- **D-22:** Provide a Phase 2 result-ingest handler accepting payload shape `{ "demo_id": "...", "results": [...] }`; it writes `AnalysisResult` rows and sets Demo status to `done`.
- **D-23:** If queue writing fails during upload, the upload fails as a whole and storage is cleaned up best-effort. Do not leave a user-visible Demo that will never be processed.

### the agent's Discretion
- Exact JSON field casing and DTO class names, as long as the public API remains stable and tests cover it.
- Exact Symfony bundle/package selection needed for Doctrine, Messenger, Redis, validation, UUIDs, and tests.
- Exact default pagination maximum, as long as it is bounded and documented in tests.
- Exact repository/service class names, while preserving a readable DDD-style split.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 2 goal, requirements, success criteria, and planned plan split.
- `.planning/REQUIREMENTS.md` - `BACK-01` through `BACK-07` define Phase 2 requirements.
- `.planning/PROJECT.md` - Project-level constraints for Symfony/Python split, Redis queueing, local storage, ethics, and simple controllers.

### Prior Phase Contracts
- `.planning/phases/01-container-foundation/01-CONTEXT.md` - Locked Compose, environment, non-root, and storage decisions from Phase 1.
- `.planning/phases/01-container-foundation/01-VERIFICATION.md` - Evidence that the container stack is buildable and startable.
- `.planning/phases/01-container-foundation/01-SECURITY.md` - Phase 1 threat dispositions and security boundaries.

### Source Brief
- `tasks/setup.md` - Requested Symfony 7 DDD structure, Demo/Player/AnalysisResult fields, Messenger contract, API endpoints, Docker stack, and README expectations.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker-compose.yml`: Provides `php`, `nginx`, `postgres`, `redis`, `python`, `demo_storage`, service names, and environment interpolation that Phase 2 should consume.
- `.env.example`: Defines `DATABASE_URL`, `REDIS_URL`, `MESSENGER_TRANSPORT_DSN`, storage paths, queue names, and upload size defaults.
- `docker/php/Dockerfile`: PHP 8.3 FPM runtime already includes Composer, `pdo_pgsql`, Redis extension, Intl, Zip, OPcache, and non-root `app` user.
- `docker/nginx/nginx.conf`: Serves `/var/www/html/public` and forwards PHP to `php:9000`; Phase 2 Symfony public entrypoint should fit this contract.
- `symfony/public/index.php`: Temporary JSON bootstrap that Phase 2 should replace with a real Symfony front controller.

### Established Patterns
- Dev-first Docker Compose with bind mounts and local defaults.
- Environment variables are the service contract.
- PostgreSQL is the source of truth for Demo, Player, and AnalysisResult state.
- Redis is the async boundary between Symfony and Python.
- Local demo volume is the default storage backend; cloud/object storage is deferred.

### Integration Points
- Symfony connects to PostgreSQL through `DATABASE_URL`.
- Symfony writes analysis jobs to Redis list `cs2.analysis`, matching the existing `PYTHON_WORKER_QUEUE` default.
- Demo files are written under `DEMO_STORAGE_PATH`, which maps to `/storage/demos` in containers.
- Nginx expects Symfony under `symfony/public`.

</code_context>

<specifics>
## Specific Ideas

- Keep the API plain and practical rather than framework-heavy.
- Make status polling easy for a client by returning status and results from one demo endpoint.
- Keep Phase 2 validation intentionally shallow: file extension, size, and upload readability only.
- Avoid early duplicate detection and parser coupling.
- Make the Python integration contract explicit before Python analysis exists.

</specifics>

<deferred>
## Deferred Ideas

- Parser/header validation for real CS2 demo structure belongs to Phase 3.
- Python BRPOP consumption, feature extraction, scoring, and error recording belong to Phase 3.
- Demo deduplication via hashing can be considered after core upload/analysis flow works.
- Cursor pagination can be considered if player histories become large.
- S3/MinIO storage remains v2.
- Full web UI remains v2.

</deferred>

---

*Phase: 02-Symfony API and Domain*
*Context gathered: 2026-05-15*
