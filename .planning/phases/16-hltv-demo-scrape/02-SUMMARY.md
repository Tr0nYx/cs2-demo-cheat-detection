---
phase: "16"
plan: "02"
subsystem: "Scraper Service"
tags: ["node", "playwright", "scraper"]
requirements-completed: ["HLTV-02"]
key-files.created:
  - hltv-scraper/package.json
  - hltv-scraper/src/index.js
  - hltv-scraper/src/scraper.js
key-decisions:
  - "Used Express to expose a /scrape endpoint for the Symfony app to call."
  - "Configured Playwright chromium with --no-sandbox to run properly inside Docker."
  - "Implemented Cloudflare block detection by evaluating the page content and throwing 'cloudflare_blocked'."
---

# Phase 16 Plan 02: Scraper Service Summary

Built the standalone Node.js Playwright microservice to handle the scraping of HLTV matches.

## What was done
- Initialized Node project and installed `playwright` and `express`.
- Created `scraper.js` which navigates to the match URL, checks for Cloudflare blocks, and extracts the `.dem` download URL and player statistics (kills, deaths, rating, team name) from the match page.
- Created `index.js` which spins up an Express server on port 3000, exposing a `POST /scrape` route. It handles the `cloudflare_blocked` error gracefully, returning a 503 status code with the `cloudflare_blocked` flag.

## Next Steps
Ready for 03-PLAN.md (Symfony App Trigger and Background Cron).
