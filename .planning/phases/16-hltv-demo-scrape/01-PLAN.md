---
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - symfony/src/Domain/Demo/Demo.php
  - symfony/src/Domain/Player/Player.php
  - symfony/src/Domain/Demo/DemoStatus.php
autonomous: true
---

# 01-PLAN: Core Entities & Infrastructure

## Goal
Update the core domain entities to support HLTV metadata and add the new standalone `hltv-scraper` microservice container to the Docker Compose setup.

## Tasks

<task>
  <id>16-01-01</id>
  <title>Add hltv-scraper service to Docker Compose</title>
  <read_first>
    - docker-compose.yml
  </read_first>
  <action>
    Add a new service `hltv-scraper` to `docker-compose.yml`. Use the `mcr.microsoft.com/playwright:v1.44.0-jammy` image (or similar official Node.js Playwright image). Set the command to `npm run start` and mount the `hltv-scraper` directory to `/app`. Ensure it is on the `cs2_network`.
  </action>
  <acceptance_criteria>
    - `docker-compose.yml` contains a service named `hltv-scraper` with the Playwright image.
  </acceptance_criteria>
</task>

<task>
  <id>16-01-02</id>
  <title>Update DemoStatus enum with cloudflare_blocked</title>
  <read_first>
    - symfony/src/Domain/Demo/DemoStatus.php
  </read_first>
  <action>
    Add a new constant `CLOUDFLARE_BLOCKED = 'cloudflare_blocked'` to the `DemoStatus` enum (or equivalent status class) to handle persistent Playwright blocking.
  </action>
  <acceptance_criteria>
    - `symfony/src/Domain/Demo/DemoStatus.php` contains the string `cloudflare_blocked`.
  </acceptance_criteria>
</task>

<task>
  <id>16-01-03</id>
  <title>Extend Demo and Player Entities</title>
  <read_first>
    - symfony/src/Domain/Demo/Demo.php
    - symfony/src/Domain/Player/Player.php
  </read_first>
  <action>
    In `Demo.php`, add `hltvMatchUrl` (string, nullable) and `hltvMatchId` (string, nullable).
    In `Player.php`, add `hltvRating` (float, nullable), `hltvTeam` (string, nullable), `hltvKills` (integer, nullable), `hltvDeaths` (integer, nullable).
    Update Doctrine attributes/annotations accordingly.
  </action>
  <acceptance_criteria>
    - `symfony/src/Domain/Demo/Demo.php` contains `$hltvMatchUrl`.
    - `symfony/src/Domain/Player/Player.php` contains `$hltvRating`.
  </acceptance_criteria>
</task>

<task>
  <id>16-01-04</id>
  <title>[BLOCKING] Generate and Apply Doctrine Migration</title>
  <read_first>
    - symfony/src/Domain/Demo/Demo.php
    - symfony/src/Domain/Player/Player.php
  </read_first>
  <action>
    Run `php bin/console doctrine:migrations:diff` and `php bin/console doctrine:migrations:migrate --no-interaction` to apply the entity changes to the PostgreSQL database.
  </action>
  <acceptance_criteria>
    - A new migration file exists in `symfony/migrations/` containing `hltv_match_url`.
  </acceptance_criteria>
</task>

## Verification
- Run `make test` or `php bin/console doctrine:schema:validate` to ensure schema sync.

## Must Haves
- `docker-compose.yml` has the `hltv-scraper` container.
- `Demo` and `Player` entities contain HLTV metadata fields.
- `DemoStatus` contains `cloudflare_blocked`.
