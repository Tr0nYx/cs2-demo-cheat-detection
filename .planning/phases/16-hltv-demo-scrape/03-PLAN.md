---
wave: 3
depends_on: ["02-PLAN.md"]
files_modified:
  - symfony/src/Application/Demo/HltvImportController.php
  - symfony/src/Application/Demo/HltvImportMessage.php
  - symfony/src/Application/Demo/HltvImportHandler.php
  - symfony/src/Application/Demo/Cron/HltvTopMatchesCommand.php
autonomous: true
---

# 03-PLAN: Symfony Trigger & Background Cron

## Goal
Implement the manual Admin API trigger and the background cron that fetches Top 20 / Tier 1 matches from HLTV. Route all fetches to the async Symfony Messenger queue, which will call the `hltv-scraper`.

## Tasks

<task>
  <id>16-03-01</id>
  <title>Create HLTV Import Message and Handler</title>
  <read_first>
    - symfony/src/Application/Demo/ImportSharecodeMessage.php (analog)
  </read_first>
  <action>
    Create `HltvImportMessage.php` containing the `url` of the HLTV match.
    Create `HltvImportHandler.php` that implements `MessageHandlerInterface`.
    The handler should:
    1. Make an HTTP POST to `http://hltv-scraper:3000/scrape` with the URL.
    2. Parse the JSON response.
    3. Update or create the `Demo` and `Player` entities using the scraped HLTV metadata.
    4. Enqueue a standard demo download message with the extracted `.dem` URL.
    If the scraper returns `cloudflare_blocked`, update the Demo status to `DemoStatus::CLOUDFLARE_BLOCKED` and return without failing the message (so it doesn't loop).
  </action>
  <acceptance_criteria>
    - `symfony/src/Application/Demo/HltvImportHandler.php` makes HTTP call to `hltv-scraper`.
    - Updates Demo status to `cloudflare_blocked` on 403/503.
  </acceptance_criteria>
</task>

<task>
  <id>16-03-02</id>
  <title>Implement Manual Admin Trigger API</title>
  <read_first>
    - symfony/src/Application/Demo/HltvImportMessage.php
  </read_first>
  <action>
    Create `HltvImportController.php` exposing `POST /api/admin/hltv-import`.
    Use the `#[IsGranted('ROLE_ADMIN')]` attribute to secure it.
    The controller accepts a JSON body `{"url": "..."}`, validates it is an HLTV match URL, dispatches the `HltvImportMessage` to the message bus, and returns a 202 Accepted response with a "pending" status.
  </action>
  <acceptance_criteria>
    - `symfony/src/Application/Demo/HltvImportController.php` contains `#[IsGranted('ROLE_ADMIN')]`.
    - Endpoint returns 202 on success.
  </acceptance_criteria>
</task>

<task>
  <id>16-03-03</id>
  <title>Implement Background Cron for Top Matches</title>
  <read_first>
    - symfony/src/Application/Demo/HltvImportMessage.php
  </read_first>
  <action>
    Create a Symfony Console Command `HltvTopMatchesCommand.php`.
    This command will parse the HLTV results page for Top 20 / Tier 1 match URLs. (HLTV provides an RSS feed or simple HTML page for results).
    For each valid match URL found that isn't already in the database (query by `hltvMatchUrl`), dispatch an `HltvImportMessage`.
    This command will be configured to run periodically via a cron job or Symfony Scheduler.
  </action>
  <acceptance_criteria>
    - `symfony/src/Application/Demo/Cron/HltvTopMatchesCommand.php` exists.
    - It dispatches `HltvImportMessage` for new matches.
  </acceptance_criteria>
</task>

## Verification
- Run `make test` for unit tests testing the Controller auth and Handler routing.

## Must Haves
- Admin role restriction on the API.
- Graceful handling of Cloudflare blocks without retry-loops.
- Background command to seed the queue with tier-1 matches.
