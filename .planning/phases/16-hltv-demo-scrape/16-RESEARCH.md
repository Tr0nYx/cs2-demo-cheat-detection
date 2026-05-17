# Phase 16: hltv demo scrape - Research

**Objective:** Research how to implement Phase 16: hltv demo scrape. Answer: "What do I need to know to PLAN this phase well?"

## 1. Domain & Entities

### 1.1 Existing Entities
- **Demo Entity:** Currently holds `sharecode`, `status`, `file_path`, `parsed_at`, `created_at`. Needs to be extended with HLTV-specific fields (e.g., `hltv_match_url`, `hltv_match_id`).
- **Player Entity:** Currently holds `steam_id`, `name`. Needs extension for HLTV stats (e.g., `hltv_rating`, `hltv_team`, `hltv_kills`, `hltv_deaths`) directly merged into it. Data source precedence: HLTV > Demo.

### 1.2 The Scraper Service
- As decided, we need a standalone microservice using Playwright (Node.js/Playwright container) to bypass Cloudflare.
- **Docker Compose Updates:** A new service `hltv-scraper` needs to be defined in `docker-compose.yml` that the Python worker or Symfony can call over internal networking.

## 2. Trigger Mechanism

### 2.1 Admin Manual Trigger
- The Symfony backend needs an endpoint (e.g., `POST /api/admin/hltv-import`) restricted to users with Admin roles (likely utilizing Symfony Security/Voters).
- A new UI element in the dashboard for admins to paste an HLTV match URL.
- Similar async job dispatching as Phase 8: return "pending" to the user while enqueuing the background job.

### 2.2 Background Cron
- Symfony Scheduler or a Cron container running a Symfony console command to fetch "Top 20 / Tier 1" matches.
- The scraper service will need an endpoint or a script to list these top matches and enqueue jobs for any that aren't already downloaded.

## 3. Anti-Bot Strategy

- Cloudflare protection on HLTV is strict. Playwright requires a full browser context.
- If Playwright gets a persistent block, the job needs to update the Demo status to `cloudflare_blocked` (or similar).
- This requires adding `cloudflare_blocked` to the allowed Demo status enum/state machine in both Symfony and Python.

## 4. Metadata Scope & Precedence

- The scraper needs to extract the match URL, `.dem` link, and player statistics (kills, deaths, ratings, team lineups) from the HLTV match page.
- When saving this data, Symfony/Python needs logic to prioritize the HLTV provided `name` and `team` over the parsed `.dem` file's in-game names.

## 5. Validation Architecture

- **Dimension 1 (Security):** Ensure `POST /api/admin/hltv-import` is strictly restricted to Admins.
- **Dimension 2 (Data integrity):** Ensure `.dem` vs HLTV metadata conflicts prioritize HLTV.
- **Dimension 3 (Resilience):** Ensure the `cloudflare_blocked` state is reached instead of looping indefinitely on HLTV blocks.
