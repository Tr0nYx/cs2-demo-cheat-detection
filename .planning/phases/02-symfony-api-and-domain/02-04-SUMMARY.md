---
phase: 02-symfony-api-and-domain
plan: 04
subsystem: symfony-queue-ingest
tags: [messenger, redis, ingest, results]
key-files:
  - symfony/src/Application/Command/AnalyzeDemoMessage.php
  - symfony/src/Application/Handler/AnalyzeDemoHandler.php
  - symfony/src/Infrastructure/Queue/RedisAnalysisJobPublisher.php
  - symfony/src/Application/Result/ResultIngestHandler.php
  - symfony/src/UI/Api/ResultIngestController.php
---

# Plan 02-04 Summary: Queue Dispatch and Result Ingest

## Completed

- Added Symfony-internal `AnalyzeDemoMessage` and handler.
- Added Redis job publisher that writes compact JSON to the Python queue with `demo_id` and `file_path`.
- Updated upload flow so successful uploads dispatch analysis and return `queued` after Redis publish succeeds.
- Added result ingest payload validation, handler, and token-protected internal HTTP endpoint.
- Result ingest creates/fetches players by Steam ID, writes one result per Demo + Player, and marks demos `done`.
- Added tests for Redis queue payloads, result handler behavior, ingest token protection, and result display through `GET /api/demos/{id}`.

## Verification

| Check | Result |
|-------|--------|
| `php bin/console lint:container` | Passed |
| `php bin/console debug:router` | Passed, internal ingest route present |
| `php bin/phpunit tests/Domain tests/Application tests/UI/Api` | Passed, 12 tests / 48 assertions |

## Deviations

- `AnalyzeDemoMessage` is handled synchronously by Symfony Messenger during upload so the API can truthfully return `queued` only after Redis publish succeeds. The long-running Python analysis remains asynchronous via the Redis list boundary.
- The internal result ingest endpoint is included for Phase 2 testability and future worker integration, protected by `X-Result-Ingest-Token`.

## Self-Check

PASSED - BACK-06 and BACK-07 are implemented, with the Python-facing Redis payload contract tested.
