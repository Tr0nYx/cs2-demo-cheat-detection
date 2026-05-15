---
phase: 02-symfony-api-and-domain
plan: 02
subsystem: symfony-domain-persistence
tags: [doctrine, domain, migrations, repositories]
key-files:
  - symfony/src/Domain/Demo/Demo.php
  - symfony/src/Domain/Player/Player.php
  - symfony/src/Domain/Analysis/AnalysisResult.php
  - symfony/migrations/Version20260515060200.php
  - symfony/tests/Domain/DomainModelTest.php
---

# Plan 02-02 Summary: Domain Entities and Persistence

## Completed

- Added enum-backed Demo status values: `uploaded`, `queued`, `processing`, `done`, and `error`.
- Added enum-backed suspicion labels: `clean`, `suspicious`, and `likely_cheating`.
- Added UUID-backed Doctrine entities for Demo, Player, and AnalysisResult.
- Added repositories for Demo lookup, Player find-or-create by Steam ID, history queries, and Demo + Player result upsert behavior.
- Added PostgreSQL migration with unique Player Steam IDs, unique Demo + Player analysis results, JSON support fields, and lookup indexes.
- Updated the test bootstrap so PHPUnit works without a committed Symfony `.env` file.

## Verification

| Check | Result |
|-------|--------|
| `php bin/console doctrine:mapping:info` | Passed, 3 mapped entities |
| `php bin/console doctrine:migrations:migrate --no-interaction` | Passed |
| `php bin/console doctrine:schema:validate` | Passed |
| `php bin/phpunit tests/Domain/DomainModelTest.php` | Passed, 4 tests / 15 assertions |
| `php bin/console lint:container` | Passed |

## Deviations

- The migration was hand-authored to keep the DDD folder layout and practical index names explicit.
- The live development database index names were normalized after the first migration run so schema validation reflects the committed migration shape.

## Self-Check

PASSED - BACK-04 is implemented with database constraints and the domain remains independent from Python parsing/scoring.
