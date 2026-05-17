---
phase: "16"
plan: "01"
subsystem: "Core Entities & Infrastructure"
tags: ["docker", "doctrine", "schema"]
requirements-completed: ["HLTV-03", "HLTV-04"]
key-files.modified:
  - docker-compose.yml
  - symfony/src/Domain/Demo/Demo.php
  - symfony/src/Domain/Demo/DemoStatus.php
  - symfony/src/Domain/Player/Player.php
key-decisions:
  - "Added hltv-scraper container to docker-compose.yml on port 3000."
  - "Extended Demo and Player entities to store HLTV metadata, applied specific DB migration."
---

# Phase 16 Plan 01: Core Entities & Infrastructure Summary

Updated the backend database schema to accommodate HLTV specific metadata on players and matches, and added the new `hltv-scraper` playwright Node container to the docker compose configuration.

## What was done
- Added `hltv-scraper` to `docker-compose.yml` to run the Playwright browser.
- Extended `DemoStatus` with `cloudflare_blocked`.
- Added `hltvMatchUrl` to the `Demo` entity.
- Added `hltvRating` and `hltvTeam` to the `Player` entity.
- Generated and executed a targeted doctrine migration to apply the schema updates.

## Next Steps
Ready for 02-PLAN.md (Scraper Service).
