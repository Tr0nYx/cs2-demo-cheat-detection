# Phase 2 Validation Strategy: Symfony API and Domain

**Status:** Ready
**Created:** 2026-05-15

## Scope

Validate that Phase 2 creates a working Symfony API/domain boundary without implementing Python parsing, feature extraction, or ML scoring.

## Required Checks

| Area | Check | Evidence |
|------|-------|----------|
| Symfony | `composer validate` and `php bin/console lint:container` pass inside the PHP container | Command output |
| Database | Doctrine migrations apply to PostgreSQL and schema validates | `doctrine:migrations:migrate`, `doctrine:schema:validate` |
| Upload API | `POST /api/demos` accepts a `.dem` file, stores it as `/storage/demos/{demoUuid}.dem`, and returns ID/status URL | PHPUnit feature test or curl evidence |
| Validation | Non-`.dem`, oversized, and unreadable uploads return stable error envelopes | PHPUnit tests |
| Status API | `GET /api/demos/{id}` returns metadata, status, and results when present | PHPUnit tests |
| History API | `GET /api/players/{steamId}/history` returns newest-first bounded pagination | PHPUnit tests |
| Queue | Accepted upload writes compact JSON with `demo_id` and `file_path` to Redis list `cs2.analysis` | PHPUnit/integration test |
| Ingest | Result ingest writes one result per Demo + Player and marks demo `done` | PHPUnit/integration test |
| Cleanup | Queue/storage/database failures return structured errors and clean stored files best-effort | PHPUnit tests |

## Blockers

- Phase 2 is not complete if accepted uploads can remain user-visible without a queued analysis job.
- Phase 2 is not complete if parser/header validation is implemented in Symfony. That belongs to Phase 3.
- Phase 2 is not complete if any response frames suspicion labels as proof or enforcement.
