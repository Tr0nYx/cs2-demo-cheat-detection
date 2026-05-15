# Phase 2: Symfony API and Domain - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 02-Symfony API and Domain
**Areas discussed:** API Shape, Domain Model, Storage Behavior, Queue Contract

---

## API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatic REST JSON | Simple Symfony controllers with compact JSON responses and stable error structure. | yes |
| JSON:API-style | More formal envelopes with `data`, `attributes`, `relationships`, and `errors`. | |
| Minimal raw JSON | Only fields needed at the moment, without a consistent envelope/error contract. | |

**User's choice:** Pragmatic REST JSON.
**Notes:** `GET /api/demos/{id}` should include status and results together. Errors should use stable codes and concise messages. Player history should be newest-first with `limit` and `offset`.

---

## Domain Model

| Option | Description | Selected |
|--------|-------------|----------|
| UUIDs for Demo/Result, SteamID for Player | Stable API IDs while keeping SteamID as natural player identity. | yes |
| Auto-increment IDs everywhere | Simpler database identity but weaker public API IDs. | |
| ULIDs everywhere | Sortable IDs with more conceptual weight. | |

**User's choice:** UUIDs for Demo and AnalysisResult; `steamId` uniquely identifies Player.
**Notes:** Demo statuses are `uploaded`, `queued`, `processing`, `done`, and `error`. Use one `AnalysisResult` per Demo + Player, with label/score fields and JSON feature/explainability fields. Add practical constraints immediately.

---

## Storage Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| UUID-based path | Store as `/storage/demos/{demoUuid}.dem`; keep original name as metadata. | yes |
| Sanitized original filename | Human-readable but collision-prone. | |
| Date path + UUID | More organized for huge storage sets but extra Phase 2 complexity. | |

**User's choice:** UUID-based storage path.
**Notes:** Validate extension, configured size, and readable upload only. Do best-effort cleanup if storage/DB/queue fails. No dedupe in Phase 2.

---

## Queue Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Symfony handler writes compact Redis job | Keep Messenger internal; write Python-facing `{ demo_id, file_path }` JSON to `cs2.analysis`. | yes |
| Shared Messenger Redis transport | Python would need to understand Symfony Messenger envelopes. | |
| DB polling | Avoids Redis payload design but conflicts with planned BRPOP worker. | |

**User's choice:** Symfony-internal Messenger plus compact Redis job.
**Notes:** Upload sets `uploaded`; enqueue success sets `queued`; Python later sets `processing/done/error`. Phase 2 should already provide a result-ingest handler for `{ demo_id, results[] }`. Queue write failure makes upload fail as a whole with cleanup.

---

## the agent's Discretion

- Exact field casing, DTO names, service class names, and package choices.
- Exact default/max pagination values, within a bounded and test-covered API.

## Deferred Ideas

- Parser/header validation.
- Duplicate detection.
- Cursor pagination.
- Python worker processing.
- S3/MinIO storage.
