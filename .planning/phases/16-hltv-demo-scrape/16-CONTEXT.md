# Phase 16: hltv demo scrape - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Building a scraper/fetcher to automatically download CS2 demos from HLTV.org and feed them into the analysis pipeline.

</domain>

<decisions>
## Implementation Decisions

### Trigger mechanism
- **D-01:** HLTV scrape is triggered by both Manual UI Input and a Background Cron.
- **D-02:** Background Cron will only fetch Top 20 / Tier 1 high-profile matches.
- **D-03:** Manual UI Input is restricted to Admins only.

### Anti-bot strategy
- **D-04:** Use Playwright / Headless Browser to bypass Cloudflare.
- **D-05:** Playwright will be hosted in a standalone scraper service container, keeping the Python worker clean.
- **D-06:** On persistent block, mark the job with a `cloudflare_blocked` manual intervention flag instead of infinitely retrying.

### Metadata Scope
- **D-07:** Scrape full match stats (Player kills, HLTV ratings, team lineups) along with the Demo URL.
- **D-08:** Merge HLTV data into the existing `Demo` and `Player` entities instead of creating new tables.
- **D-09:** If `.dem` file data and HLTV data conflict, HLTV data takes precedence.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Demo Download System
- `.planning/phases/08-demo-download-sharecode/08-CONTEXT.md` — Existing Python fetcher patterns and Redis integration.

### Core Domain
- `.planning/PROJECT.md` — Core entity structures and ethical boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Fetcher structure from Phase 8: Base structure for downloading demos and handling retries via Redis.
- `Player` / `Demo` entities: Need extension for HLTV metadata.

### Established Patterns
- Redis-based asynchronous fetching from external APIs (from Phase 8).
- PostgreSQL Entity management via Symfony Doctrine.

### Integration Points
- Add HLTV URL submission to the admin UI.
- Update Symfony API to enqueue HLTV fetch jobs.
- New standalone Playwright container needs to be orchestrated via `docker-compose`.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-hltv-demo-scrape*
*Context gathered: 2026-05-17*
