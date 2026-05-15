---
phase: 02-symfony-api-and-domain
plan: 03
subsystem: symfony-api-storage
tags: [api, upload, storage, history]
key-files:
  - symfony/src/Infrastructure/Storage/LocalDemoStorage.php
  - symfony/src/Application/Demo/UploadDemoService.php
  - symfony/src/UI/Api/DemoController.php
  - symfony/src/UI/Api/PlayerController.php
  - symfony/tests/UI/Api/DemoControllerTest.php
---

# Plan 02-03 Summary: Demo Storage and REST API

## Completed

- Added `DemoStorage` and local storage implementation for `/storage/demos/{demoUuid}.dem`.
- Added upload validation for readable uploads, `.dem` extension, and configured maximum size.
- Added structured API error envelopes with stable error codes.
- Added `POST /api/demos`, `GET /api/demos/{id}`, and `GET /api/players/{steamId}/history`.
- Added response mapping for demo metadata, status URL, result rows, score fields, labels, and support data.
- Added API tests for upload success, invalid extension, unknown demo errors, status results, and bounded newest-first player history.

## Verification

| Check | Result |
|-------|--------|
| `php bin/console debug:router` | Passed, all 3 public API routes present |
| `php bin/phpunit tests/UI/Api` | Passed, 5 tests / 20 assertions |
| `php bin/console lint:container` | Passed |

## Deviations

- Upload responses return `uploaded` in this plan. Plan 02-04 upgrades successful uploads to return `queued` after Redis dispatch succeeds.
- The history endpoint returns an empty result list for unknown players rather than a 404, which keeps paginated history queries simple and stable.

## Self-Check

PASSED - BACK-01, BACK-02, BACK-03, and BACK-05 are implemented without parser validation or duplicate detection.
