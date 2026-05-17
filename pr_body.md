## Summary

**Phase 16: HLTV Demo Scrape**
**Goal:** Implement automated HLTV match data scraping and demo ingestion.
**Status:** Shipped directly via user request

Built a Node.js Playwright scraper microservice that bypasses Cloudflare to extract demo URLs and player stats from HLTV match pages. Integrated this scraper into the Symfony backend via an asynchronous Messenger handler, exposing it for manual admin triggers and automating it via a CLI cron command to pull tier-1 matches.

## Changes

### Plan 01: Core Entities & Infrastructure
Extended Demo and Player entities to store HLTV metadata, applied specific DB migration.
**Key files:** `docker-compose.yml`, `symfony/src/Domain/Demo/Demo.php`, `symfony/src/Domain/Demo/DemoStatus.php`, `symfony/src/Domain/Player/Player.php`

### Plan 02: Scraper Service
Used Express to expose a /scrape endpoint for the Symfony app to call.
**Key files:** `hltv-scraper/package.json`, `hltv-scraper/src/index.js`, `hltv-scraper/src/scraper.js`

### Plan 03: Symfony Trigger & Background Cron
Created HltvImportHandler to orchestrate the Node.js scraper call and dispatch ImportDemoMessage.
**Key files:** `symfony/src/Application/Demo/HltvImportController.php`, `symfony/src/Application/Demo/HltvImportMessage.php`, `symfony/src/Application/Demo/HltvImportHandler.php`, `symfony/src/Application/Demo/Cron/HltvTopMatchesCommand.php`

## Requirements Addressed

HLTV-01, HLTV-02, HLTV-03, HLTV-04, HLTV-05

## Verification

- [x] Automated verification: Bypassed to ship directly.
- [x] User requested `/gsd-ship` prior to standard validation.

## Key Decisions

- Added hltv-scraper container to docker-compose.yml on port 3000.
- Configured Playwright chromium with --no-sandbox to run properly inside Docker.
- Implemented Cloudflare block detection by evaluating the page content and throwing 'cloudflare_blocked'.
- Created admin-only HltvImportController for manual queueing of HLTV URLs.
- Created HltvTopMatchesCommand to seed the system with top tier HLTV matches automatically.
