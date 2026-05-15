# Phase 2 Research: Symfony API and Domain

**Status:** Complete
**Researched:** 2026-05-15

## Research Question

What does Phase 2 need in order to plan a Symfony 7 API/domain foundation that accepts demo uploads, persists analysis state, queues Python work through Redis, and ingests player results without crossing into Phase 3 parsing or scoring?

## Key Findings

### Symfony Foundation

- Start from a real Symfony skeleton inside `symfony/`, replacing the temporary `symfony/public/index.php` created in Phase 1.
- Required packages align with the source brief: Doctrine ORM/DBAL/Migrations, Messenger plus Redis transport, Serializer, Validator, UID, CORS, Maker/test tooling as needed.
- Keep controllers simple and JSON-focused. API Platform remains out of scope by project decision D-01.

### UUID and Doctrine

- Symfony's UID component supports UUID value objects and Doctrine mapping through the bridge type. The current docs recommend UUIDv7 for ordered UUID generation and using the `doctrine.uuid_generator` service when relying on configured Symfony UUID behavior.
- Demo and AnalysisResult should expose UUID API identities. Player can also use UUID internally, while `steamId` remains the unique natural identifier.
- PostgreSQL JSON columns are appropriate for feature score maps and explainability payloads because Phase 3 will define richer result data.

### Upload and Validation

- Phase 2 upload validation should stay shallow by design: successful readable upload, `.dem` extension, and configured maximum size from `MAX_DEMO_UPLOAD_SIZE`.
- Parser/header validation belongs to Phase 3 because it depends on Python parsing behavior and CS2 demo semantics.
- Nginx and PHP are already configured for large uploads in Phase 1, so Symfony should enforce its own application limit rather than relying only on infrastructure.

### Queue Contract

- Symfony Messenger should remain the internal application boundary with `AnalyzeDemoMessage`.
- The Python-facing Redis list is a separate compact JSON contract written by the handler to `PYTHON_WORKER_QUEUE`, defaulting to `cs2.analysis`.
- The compact payload should include at least `demo_id` and `file_path`; adding `queued_at` is acceptable if tests keep `demo_id` and `file_path` mandatory.
- The upload flow must fail as a whole if queue writing fails, with best-effort deletion of stored demo files.

### Result Ingestion

- Phase 2 needs a result-ingest flow even before Python exists. It should accept a stable payload shape and write `AnalysisResult` rows, creating/finding players by Steam ID.
- Expose this as an internal Symfony message/handler and a small API endpoint or console command only if needed for testability. If an HTTP ingest endpoint is added, protect it with an environment token and document it as internal.
- Demo status should move to `done` only after all provided results persist successfully. Invalid payloads should use structured errors and leave prior persisted state consistent.

## Validation Architecture

Phase 2 should be validated with a mix of static, database, and HTTP-level checks:

- Composer validation and Symfony container validation.
- Doctrine schema/migration checks against PostgreSQL.
- PHPUnit feature tests for upload, status, history, error envelope, and result ingest.
- A Redis contract test that confirms an accepted upload writes compact JSON to the configured Python queue.
- A cleanup test that simulates queue/storage failure and confirms no orphaned user-visible demo remains.

## Planning Guidance

- Keep files under `symfony/` and preserve the Phase 1 Docker/Nginx/PHP contracts.
- Use a DDD-style split:
  - `src/Domain/*` for entities, enums, and domain-facing interfaces.
  - `src/Application/*` for messages, handlers, DTOs, and orchestration services.
  - `src/Infrastructure/*` for Doctrine repositories, Redis queue writer, and local storage.
  - `src/UI/Api/*` for controllers and response helpers.
- Plan execution should avoid live cheat, memory, client inspection, or ban automation language. Labels are research signals only.

## Sources

- Symfony UID component: https://symfony.com/doc/current/components/uid.html
- Symfony Messenger with queued transports: https://symfony.com/doc/current/messenger.html
- Symfony validation and file constraints: https://symfony.com/doc/current/validation.html
- Symfony Doctrine guide: https://symfony.com/doc/current/doctrine.html

## RESEARCH COMPLETE
