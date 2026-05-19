# Phase 18: Sharecode Import and Automatic Match History Tracking - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Let authenticated users connect their own Valve match history by providing a Steam Game Authentication Code and one seed match sharecode. The system should then discover newer match sharecodes through Valve's match-history API and dispatch discovered sharecodes into the existing post-game demo import and analysis pipeline. This phase stays strictly post-game and user-authorized; it does not add live client integration, memory reading, game automation, or any scoring change based on match-history metadata.

</domain>

<decisions>
## Implementation Decisions

### Connection Flow
- **D-01:** Match-history tracking is activated from a dedicated dashboard setup area, not from a hidden side effect of one-off import.
- **D-02:** The setup flow uses the authenticated Steam identity. Normal users may only enable tracking for the Steam ID in their own session/JWT; `steamid` is not accepted as free user input.
- **D-03:** The seed input accepts a plain `CSGO-...` match sharecode and Steam launcher links shaped like `steam://rungame/730/.../+csgo_download_match%20CSGO-...`.
- **D-04:** The seed parser should be strict: extract from supported sharecode/link formats, but do not accept arbitrary pasted text blobs.

### Tracking Behavior
- **D-05:** Tracking runs periodically in the background through Symfony scheduling/queue infrastructure.
- **D-06:** Each tracking run is bounded to a maximum number of newly discovered sharecodes per user/run. The exact limit is planner discretion, with `10` as the expected starting point.
- **D-07:** Newly discovered sharecodes are immediately queued as normal `SharecodeImport` records and processed through the existing import and analysis pipeline.
- **D-08:** The existing one-off sharecode import remains available separately. Phase 18 adds persistent match-history tracking, not a replacement for manual imports.

### Credential Handling
- **D-09:** Store the Steam Game Authentication Code (`steamidkey`) encrypted so true background tracking is possible.
- **D-10:** Encryption must use a dedicated secret from environment/config, not a committed value. The plaintext `steamidkey` must never be logged, exposed in API responses, or written into planning artifacts, fixtures, or test output.
- **D-11:** The dashboard may show only a masked/derived indication that credentials exist. It should never show the full `steamidkey` after submission.
- **D-12:** Users can disconnect tracking at any time. Disconnect deletes the stored secret and stops future tracking while keeping existing imported demos, analysis results, and import history.

### Status and Error Model
- **D-13:** Store status per tracking connection. Required user-visible/internal states include at least `active`, `caught_up`, `invalid_seed`, `auth_failed`, `rate_limited`, `steam_unavailable`, and `disconnected`.
- **D-14:** Treat Valve `202` with `nextcode: n/a` as caught up, `412` as invalid/mismatched seed or known code, `403` as auth failure, and `429`/`503` as rate-limit or temporary unavailable states with backoff.
- **D-15:** Temporary Valve failures should not immediately delete or deactivate a connection. Scheduler/handler logic should apply backoff and surface status.

### Dashboard Transparency
- **D-16:** The dashboard tracking panel should show a minimal status summary: connected since, last check time, current status, last known/seed sharecode shortened or masked, discovered count, and queued/imported count.
- **D-17:** Detailed per-call audit output is not required in the user UI for this phase. Structured logs and stored status should provide enough operator/debug visibility without exposing secrets.

### Research and Scoring Boundary
- **D-18:** Match-history tracking metadata must not influence suspicion scores, TRACE scores, labels, model confidence, or player trust in this phase.
- **D-19:** Imported demos may affect analysis history because they are real post-game demo inputs, but the fact that a demo was auto-discovered is provenance metadata, not evidence of cheating.

### the agent's Discretion
- Exact scheduler cadence, per-run discovery limit, and backoff durations, as long as the system is polite to Valve's API and transparent to the user.
- Exact encrypted storage implementation, provided it uses environment-provided secret material and avoids plaintext exposure.
- Exact UI layout of the dashboard connection panel, as long as the locked minimal status fields are present.
- Whether tracking entities are modeled as one table or split into connection/check-event tables, as long as secret lifecycle, status, and import provenance remain auditable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Context
- `.planning/ROADMAP.md` - Phase 18 goal, planning anchors, dependencies, and ethical boundary.
- `.planning/PROJECT.md` - Core product scope, Symfony/Python split, and post-game research-only boundary.
- `.planning/REQUIREMENTS.md` - Existing import, authentication, storage, and out-of-scope constraints.
- `.planning/phases/08-demo-download-sharecode/08-01-PLAN.md` - Existing sharecode import schema and validation foundation.
- `.planning/phases/08-demo-download-sharecode/08-02-PLAN.md` - Existing `POST /api/demos/import-sharecode` endpoint, import service, rate limiting, and queue dispatch.
- `.planning/phases/08-demo-download-sharecode/08-03-PLAN.md` - Existing Python worker and Steam sharecode fetcher behavior.
- `.planning/phases/08-demo-download-sharecode/08-04-PLAN.md` - Existing frontend sharecode import UI patterns.
- `.planning/phases/14-landing-steam-login/14-CONTEXT.md` - Steam login, authenticated dashboard, user persistence, and JWT/session decisions.
- `.planning/phases/17-steamprofile-usage/17-CONTEXT.md` - Steam profile enrichment, secret-safe external Steam usage, and research/scoring boundary decisions.

### External API Reference
- `https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Access_Match_History` - Valve match-history flow using `steamid`, `steamidkey`, `knowncode`, and `ICSGOPlayers_730/GetNextMatchSharingCode/v1`; includes expected `200`, `202`, `403`, `412`, `429`, and `503` behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `symfony/src/Application/Import/SharecodeValidator.php` normalizes and validates plain `CSGO-...` sharecodes. It needs an adjacent parser or extension for supported Steam launcher links.
- `symfony/src/Application/Import/ImportSharecodeService.php` already validates, deduplicates, rate-limits, creates `SharecodeImport`, and dispatches async import jobs.
- `symfony/src/Domain/Import/SharecodeImport.php` already tracks sharecode, platform, user, status, attempts, errors, and resulting demo ID.
- `symfony/src/UI/Api/DemoImportController.php` already exposes one-off manual sharecode import and import history.
- `frontend/components/DemoImport/SharecodeTab.tsx` provides an existing import UI pattern, but persistent tracking should live in a dashboard setup panel per D-01.
- `symfony/src/Infrastructure/Steam/SteamProfileClient.php` shows the existing Symfony HTTP-client pattern for Steam Web API calls and rate-limit handling.
- `symfony/src/Command/RefreshSteamProfilesCommand.php` shows the existing scheduled/queued Steam refresh command pattern that Phase 18 can mirror.

### Established Patterns
- Symfony owns API boundaries, authenticated user scoping, persistence, queue dispatch, and scheduled external Steam work.
- Python owns demo download/parsing/scoring once a sharecode import job exists; Phase 18 should reuse that path rather than adding a separate downloader.
- Steam/external metadata must stay source-labeled and separated from demo-derived scoring signals.
- User-facing surfaces should frame results as research signals and provenance, not proof.

### Integration Points
- Add a Symfony domain/application model for a user's match-history tracking connection and scheduler state.
- Add an infrastructure client for Valve `ICSGOPlayers_730/GetNextMatchSharingCode/v1`.
- Add a command/handler to poll connected users, advance from `knowncode` to `nextcode`, persist the new known code, and dispatch discovered sharecodes through `ImportSharecodeService` or a shared import orchestration path.
- Add dashboard API endpoints for connect, status, manual check if included, and disconnect.
- Add frontend dashboard UI for setup/status/disconnect with masked credentials and minimal status summary.

</code_context>

<specifics>
## Specific Ideas

- Example seed link supplied by the user: `steam://rungame/730/76561202255233023/+csgo_download_match%20CSGO-EdFZn-X7w2U-CqbxT-B26nM-TSveM`.
- The product feel should be explicit consent: "connect my match history" rather than an invisible enhancement to manual import.
- Auto-discovered demos should feel like normal imports once queued, with provenance available for status/debugging.

</specifics>

<deferred>
## Deferred Ideas

- Admin capability to track arbitrary Steam IDs for research/support.
- User-facing per-API-call audit log with raw HTTP status history and nextcode values.
- Full deletion/wipe flow for already imported demos and analyses when disconnecting tracking.
- Any use of match-history metadata as a trust, suspicion, TRACE, or model feature.

</deferred>

---

*Phase: 18-sharecode-match-history-tracking*
*Context gathered: 2026-05-18*
