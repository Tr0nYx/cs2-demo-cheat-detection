# Phase 18: Sharecode Import and Automatic Match History Tracking - Research

**Researched:** 2026-05-18
**Status:** Complete

## Research Goal

Identify what is needed to plan a user-authorized Valve match-history tracking feature that discovers newer CS2 sharecodes and feeds them into the existing post-game demo import pipeline without expanding the ethical scope or changing scoring.

## External API Findings

### Valve Match History Flow

Source: Valve Developer Community, "Counter-Strike: Global Offensive Access Match History"
URL: https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Access_Match_History

Valve's flow requires three user/application inputs:
- `steamid`: the user's Steam ID.
- `steamidkey`: the user-created Game Authentication Code for match history access.
- `knowncode`: one match sharing code from that user's match history.

The endpoint is:

`https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1`

Expected behavior:
- `200 OK` with `result.nextcode = CSGO-...` means a newer match sharing code exists.
- `202 Accepted` with `result.nextcode = n/a` means the known code is already the latest available match.
- `403 Forbidden` can indicate an invalid `steamidkey`.
- `412 Precondition Failed` means `knowncode` is invalid or does not belong to the user.
- `429 Too Many Requests` and `503 Service Unavailable` require caller backoff.
- Repeated invalid `steamidkey` attempts can cause temporary `503` responses even for valid later pairs, so auth failures must stop aggressive retrying.

Planning consequence: treat this as a stateful cursor system. Store the current `knowncode`, advance it only after successfully receiving a concrete `nextcode`, and apply per-connection backoff for rate/auth/server states.

## Existing Code Findings

### Sharecode Import

Relevant files:
- `symfony/src/Application/Import/SharecodeValidator.php`
- `symfony/src/Application/Import/ImportSharecodeService.php`
- `symfony/src/Domain/Import/SharecodeImport.php`
- `symfony/src/Infrastructure/Queue/ImportDemoJobPublisher.php`
- `symfony/src/UI/Api/DemoImportController.php`
- `python/import_worker.py`
- `python/platforms/steam.py`

Existing behavior:
- Symfony validates plain `CSGO-...` sharecodes, deduplicates by unique `sharecode`, persists `SharecodeImport`, and publishes `ImportDemoMessage`.
- Python already consumes import jobs and downloads/parses demos from Steam sharecodes.
- The manual endpoint is one-off and should remain separate from persistent match-history tracking.

Planning consequence: Phase 18 should add a Symfony tracking layer that discovers sharecodes, then reuses `ImportSharecodeService` or a closely related application service to create normal imports. Python should not need a new match-history concept.

### Steam and Scheduling Patterns

Relevant files:
- `symfony/src/Infrastructure/Steam/SteamProfileClient.php`
- `symfony/src/Command/RefreshSteamProfilesCommand.php`
- `symfony/src/Application/Steam/SteamProfileRefreshPlanner.php`
- `symfony/config/packages/messenger.yaml`
- `symfony/config/services.yaml`

Existing behavior:
- Steam Web API calls use Symfony `HttpClientInterface`, short timeouts, explicit status mapping, and typed result DTOs.
- Phase 17 already introduced scheduled/queued Steam refresh concepts through a command, message, handler, and planner.
- Messenger has a dedicated `steam_profile_refresh` queue; Phase 18 can add a dedicated match-history queue or reuse a generic async transport if naming is kept clear.

Planning consequence: implement `SteamMatchHistoryClient`, `TrackSteamMatchHistoryMessage`, planner/command, and handler in Symfony application/infrastructure layers, mirroring the Phase 17 style.

## Security and Privacy Notes

The `steamidkey` is a user-granted secret. It is not a password, but it authorizes third-party match-history access and can be revoked by the user through Steam. Treat it like a secret:
- Encrypt at rest using environment-provided secret material.
- Never log plaintext.
- Never return plaintext in API responses.
- Mask any UI indication.
- Delete encrypted secret on disconnect.
- Stop aggressive retries on `403`/`412` to avoid harm from invalid credentials.

Planning consequence: create a small encryption service and tests. Configuration should fail clearly when connect is attempted without an encryption key.

## Recommended Plan Shape

Wave 1 should build storage, parsing, encryption, and Valve client primitives.
Wave 2 should expose user-scoped connect/status/disconnect APIs.
Wave 3 should implement the scheduler/handler that advances `knowncode` and queues imports.
Wave 4 should add the dashboard setup/status UI and frontend tests.

## Validation Architecture

Backend validation:
- Unit-test sharecode/Steam-link seed parsing.
- Unit-test encryption round-trip and no-plaintext API serialization.
- Unit-test Valve client status mapping for `200`, `202`, `403`, `412`, `429`, `503`, malformed payloads, and request exceptions.
- Integration-test connect/status/disconnect API authorization and same-user Steam ID enforcement.
- Unit/integration-test discovery handler for bounded advancement, caught-up state, duplicate import behavior, and backoff.

Frontend validation:
- Component/hook tests for dashboard tracking panel states: disconnected, connected/caught-up, rate-limited, auth-failed, and disconnect.

Manual verification:
- Container lint/schema validation after migrations.
- Dry-run command for tracking candidates.

## Research Complete

Phase 18 can be planned without additional research. The main implementation risks are secret handling, Valve status/backoff mapping, and preserving the existing import pipeline instead of creating duplicate download logic.
