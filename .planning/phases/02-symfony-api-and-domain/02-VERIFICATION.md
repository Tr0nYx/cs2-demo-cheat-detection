---
status: passed
phase: 02-symfony-api-and-domain
verified: 2026-05-15
---

# Phase 2 Verification: Symfony API and Domain

## Goal

Symfony can accept demos, persist domain records, dispatch analysis jobs, ingest results, and expose the requested REST API.

## Evidence

| Check | Result |
|-------|--------|
| `docker compose --env-file .env.example config` | Passed |
| `composer validate` | Passed |
| `php bin/console lint:container` | Passed |
| `php bin/console doctrine:schema:validate` | Passed |
| `php bin/phpunit` | Passed, 13 tests / 51 assertions |
| `GET http://localhost:8080/api/demos/{uuid}` unknown demo smoke | Returned stable `demo_not_found` JSON |
| `POST http://localhost:8080/api/demos` smoke with `smoke.dem` | Returned `202` with `queued` status |

## Requirement Coverage

| Requirement | Evidence | Status |
|-------------|----------|--------|
| BACK-01 | `POST /api/demos` accepts `.dem` uploads and stores them by Demo UUID | Complete |
| BACK-02 | `GET /api/demos/{id}` returns metadata, status, and result rows when present | Complete |
| BACK-03 | `GET /api/players/{steamId}/history` returns newest-first bounded history | Complete |
| BACK-04 | Demo, Player, and AnalysisResult entities and migration exist with constraints | Complete |
| BACK-05 | Upload validates file presence/readability, `.dem` extension, and maximum size | Complete |
| BACK-06 | Upload dispatches `AnalyzeDemoMessage`, writes compact Redis job, and returns without waiting for Python analysis | Complete |
| BACK-07 | Result ingest writes player results and marks demos `done`; error ingest marks demos `error` | Complete |

## Decision Coverage

- D-01 through D-06: API uses simple JSON controllers, stable error envelopes, status polling, and bounded history.
- D-07 through D-12: UUID identities, unique Steam IDs, enum-backed statuses/labels, one result per Demo + Player, and JSON support fields are implemented.
- D-13 through D-17: local storage writes `/storage/demos/{demoUuid}.dem`, preserves original filename as metadata, performs shallow Phase 2 validation, cleans up on failures, and does not deduplicate uploads.
- D-18 through D-23: `AnalyzeDemoMessage` remains internal, Redis job payload contains `demo_id` and `file_path`, upload only returns queued after Redis publish succeeds, and result/error ingest updates Demo status.

## Notes

- `AnalyzeDemoMessage` is handled synchronously inside Symfony so the upload response can truthfully report `queued` only after Redis publish succeeds. The long-running analysis remains asynchronous because Python consumes the compact Redis list later.
- Parser/header validation, Python BRPOP consumption, feature extraction, and scoring remain Phase 3 scope.

## Status

PASSED
