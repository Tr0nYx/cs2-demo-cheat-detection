---
wave: 2
depends_on: ["01-PLAN.md"]
files_modified:
  - hltv-scraper/package.json
  - hltv-scraper/src/index.js
  - hltv-scraper/src/scraper.js
autonomous: true
---

# 02-PLAN: HLTV Scraper Service

## Goal
Build the standalone Node.js Playwright service that scrapes HLTV matches, parses player stats and demo URLs, and returns JSON.

## Tasks

<task>
  <id>16-02-01</id>
  <title>Initialize Node.js Project for Scraper</title>
  <read_first>
    - docker-compose.yml
  </read_first>
  <action>
    Create the `hltv-scraper` directory. Inside it, create `package.json` with dependencies `playwright` and `express`. Create a basic Express server in `src/index.js` listening on port 3000.
  </action>
  <acceptance_criteria>
    - `hltv-scraper/package.json` contains `playwright` and `express`.
    - `hltv-scraper/src/index.js` contains `app.listen(3000)`.
  </acceptance_criteria>
</task>

<task>
  <id>16-02-02</id>
  <title>Implement Playwright Scraper Logic</title>
  <read_first>
    - hltv-scraper/src/index.js
  </read_first>
  <action>
    Create `hltv-scraper/src/scraper.js` exporting a function `scrapeMatch(matchUrl)`. It should launch a headless chromium instance using `playwright.chromium.launch()`.
    The script should navigate to the HLTV match URL, wait for Cloudflare challenge to pass, and extract:
    - `.dem` download link (usually an `a` tag containing `/download/demo/`).
    - Player statistics (name, team, kills, deaths, rating).
    Return a structured JSON object. If Cloudflare continuously blocks (e.g. timeout after 30s), throw an explicit "cloudflare_blocked" error.
  </action>
  <acceptance_criteria>
    - `hltv-scraper/src/scraper.js` contains `playwright.chromium.launch()`.
    - `hltv-scraper/src/scraper.js` extracts demo url and player stats.
  </acceptance_criteria>
</task>

<task>
  <id>16-02-03</id>
  <title>Expose Scraper via HTTP Endpoint</title>
  <read_first>
    - hltv-scraper/src/index.js
    - hltv-scraper/src/scraper.js
  </read_first>
  <action>
    In `hltv-scraper/src/index.js`, add a `POST /scrape` route that accepts `{ "url": "https://www.hltv.org/matches/..." }`. Call `scrapeMatch(url)` and return the JSON result. If the scraper throws a "cloudflare_blocked" error, return HTTP 403 or 503 with `{ "status": "cloudflare_blocked" }`.
  </action>
  <acceptance_criteria>
    - `hltv-scraper/src/index.js` contains `app.post('/scrape', ...`.
  </acceptance_criteria>
</task>

## Verification
- Run `npm test` if tests exist, or manually verify the `POST /scrape` endpoint returns valid JSON or the `cloudflare_blocked` status when curled.

## Must Haves
- Standalone Express + Playwright server.
- JSON output with Demo URL, Player stats.
- Clear error signal if Cloudflare blocks.
