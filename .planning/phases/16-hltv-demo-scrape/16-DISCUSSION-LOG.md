# Phase 16: hltv demo scrape - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 16-hltv-demo-scrape
**Areas discussed:** Trigger mechanism, Anti-bot strategy, Metadata Scope

---

## Trigger mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Manual UI Input | User pastes an HLTV match URL into the dashboard to trigger a fetch. | |
| Background Cron | Automatically fetch demos from HLTV's top matches list on a schedule. | |
| Both | Manual UI input + a scheduled worker for top matches. | ✓ |

**User's choice:** Both

| Option | Description | Selected |
|--------|-------------|----------|
| Top 20 / Tier 1 Only | Fetch only high-profile matches to save processing power and storage. | ✓ |
| All Available Matches | Scrape and analyze everything HLTV posts, regardless of tier. | |
| Configurable Threshold | Set an environment variable to control the volume. | |

**User's choice:** Top 20 / Tier 1 Only

| Option | Description | Selected |
|--------|-------------|----------|
| Any authenticated user | Allows community contribution, but might require rate limiting. | |
| Admins only | Safest approach, since we already have the background cron. | ✓ |
| Any user with a high TRACE trust score | Limits abuse to established users. | |

**User's choice:** Admins only

---

## Anti-bot strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright / Headless Browser | Highly effective at passing Cloudflare challenges. | ✓ |
| Pure HTTP with Rotating Proxies | Lighter resource usage, but higher risk of sudden breakage. | |
| Third-party Scraping API | Most reliable, but requires a paid external service integration. | |

**User's choice:** Playwright / Headless Browser

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone scraper service container | Separates overhead from Python worker. | ✓ |
| Baked into existing Python worker | Simpler to deploy and keeps everything in Python. | |

**User's choice:** Standalone scraper service container

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential backoff and retry | Standard retry logic on the job queue. | |
| Proxy rotation | Switch IP addresses immediately upon getting blocked. | |
| Manual intervention flag | Mark the job as `cloudflare_blocked` in the database. | ✓ |

**User's choice:** Manual intervention flag

---

## Metadata Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Demo URL + Match basic info | Date, Teams, Map score, Match ID. | |
| Just the demo URL | Keep it simple. | |
| Demo URL + Full match stats | Player kills, HLTV ratings, team lineups. | ✓ |

**User's choice:** Demo URL + Full match stats

| Option | Description | Selected |
|--------|-------------|----------|
| In a new `HltvMatch` entity | Keeping HLTV-specific data separate from our core domain. | |
| Stored as raw JSON in a `metadata` column | Flexible, requires minimal schema changes. | |
| Merged into the existing `Demo` and `Player` entities | Requires adding HLTV-specific fields. | ✓ |

**User's choice:** Merged into the existing `Demo` and `Player` entities

| Option | Description | Selected |
|--------|-------------|----------|
| HLTV data takes precedence | Clean source of truth for pro match identities. | ✓ |
| Demo file data takes precedence | Reflects the actual server state. | |
| Store both separately | Keep the original name and add hltv_name. | |

**User's choice:** HLTV data takes precedence

---

## the agent's Discretion

None

## Deferred Ideas

None
