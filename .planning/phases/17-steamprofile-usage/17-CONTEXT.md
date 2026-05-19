# Phase 17: Steamprofile Usage - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Define and implement Steam profile usage so authenticated Steam identity supports player enrichment, automatic user-player linking, scoped history, and research-safe analytics context. When a player appears in a demo, the system should regularly check that player's Steam profile, including public inventory/account metadata where available. This phase must also research whether external account signals such as inventory value and account age are meaningful, fair, and ethical to include in anti-cheat analysis. Until that research produces an explicit decision, detection and suspicion scoring must remain based on post-game demo evidence.

</domain>

<decisions>
## Implementation Decisions

### Profile Data Scope
- **D-01:** Store Steam summary data for every known player where available: Steam ID, username, avatar URL, profile URL, and a timestamp for when the profile was last refreshed.
- **D-02:** Regularly refresh Steam profile data for players found in demos, not only for logged-in users. Refreshes should use a tiered strategy: new, recently seen, active, or newly re-seen players refresh sooner; older/inactive players refresh less often; private, unavailable, or erroring profiles use backoff.
- **D-03:** Include a research-maximum public snapshot of Steam summary and inventory/account metadata where publicly available. This may include all public Steam summary fields and inventory metadata, while recording visibility/privacy state and source timestamps.
- **D-04:** Store raw/derived external account metadata separately from demo-derived detection features so it can be audited, disabled, and excluded from scoring unless explicitly approved later.
- **D-05:** Estimate inventory value from Steam inventory items and Steam Community Market prices. Market prices must be cached with source timestamps, and value outputs must be treated as approximate, volatile, and research-only.

### User and Player Identity
- **D-06:** Auto-link `app_user` and `Player` identities by matching Steam ID.
- **D-07:** A logged-in user's matching `player.steam_id` should power "my profile," player history, and player-focused views for that Steam identity.

### Public Profile Display
- **D-08:** Show Steam identity on the authenticated dashboard and player-focused pages, including player history and player comparison when profile data is available.
- **D-09:** Keep dense/global surfaces such as leaderboard rows, demo event lists, and viewer legends Steam-ID-first unless planning finds a restrained pattern that does not overexpose public profile identity.

### Research-Safe Analytics Use
- **D-10:** Steam profile data may provide context and explicit user-requested filters or cohorts immediately, but it must not change suspicion scores, TRACE scores, labels, or model confidence until the dedicated research task validates and the project explicitly accepts that use.
- **D-11:** Research must evaluate whether external account signals such as inventory value and account age have meaningful anti-cheat signal value, bias/privacy risk, manipulation risk, and explainability value.
- **D-12:** External Steam signals may move toward scoring only through a gate: first a research report, then shadow mode only if promising. Shadow features may be calculated, logged, and compared, but must not affect user-visible suspicion/TRACE scores or labels.
- **D-13:** A later explicit project decision is required before any Steam profile, inventory, account-age, or external reputation signal can influence visible scoring.
- **D-14:** UI copy and API output must keep external profile data framed as identity/enrichment/research metadata, not proof of cheating.

### Storage and Audit
- **D-15:** Store versioned Steam profile/inventory snapshots over time, including source, fetched_at timestamp, visibility/privacy state, errors, raw/derived value boundaries, and derived research values such as estimated inventory value.
- **D-16:** Snapshot history is required for research and auditability. Do not collapse the system to latest-only storage in this phase.

### the agent's Discretion
- Exact refresh cadence, backoff policy, and queue shape for regular Steam profile/inventory checks.
- Exact snapshot retention policy, unless legal/privacy review requires a hard cap.
- Exact display layout for profile chips/cards on player pages.
- Whether profile enrichment is served inline with existing player responses or via a dedicated profile endpoint, as long as the locked boundaries above are preserved.

</decisions>

<specifics>
## Specific Ideas

- The product direction is "make Steam login useful for identity and navigation, and collect enough public profile/inventory/account metadata to research whether it has defensible anti-cheat value."
- Use profile metadata to label the person and help the user explore their own linked history.
- Inventory value and account age are research candidates, not accepted scoring inputs yet. If research supports them, they must pass through shadow mode before any visible scoring decision.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Context
- `.planning/phases/14-landing-steam-login/14-CONTEXT.md` - Steam login, session, user entity, dashboard, and profile display decisions.
- `.planning/phases/15-advanced-analytics-user-scoping/15-CONTEXT.md` - User-scoped analytics, filter persistence, and research-signal framing.
- `.planning/phases/16-hltv-demo-scrape/16-CONTEXT.md` - External metadata merge behavior and HLTV precedence decision.

### Project Boundaries
- `.planning/PROJECT.md` - Ethical boundary, Symfony/Python split, and research-only positioning.
- `.planning/REQUIREMENTS.md` - Existing user, player history, analytics, and out-of-scope constraints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `symfony/src/Infrastructure/Steam/SteamOpenIdValidator.php` already validates Steam OpenID and fetches summary profile data from `ISteamUser/GetPlayerSummaries`.
- `symfony/src/Entity/User.php` already stores Steam ID, username, avatar URL, email, timestamps, and login update behavior.
- `symfony/src/Domain/Player/Player.php` already stores player Steam ID, display name, and external metadata such as HLTV rating/team.
- `frontend/components/UserProfile.tsx` already renders username, avatar, Steam ID, and Steam profile link on the dashboard.
- Phase 16's external metadata pattern provides a precedent for enriching existing player/demo records while keeping source attribution clear.

### Established Patterns
- Symfony owns Steam identity, API, persistence, auth boundaries, and product-level permission checks.
- Python detection remains demo-derived unless a later research-backed decision explicitly accepts external account features as separate, explainable model inputs.
- Existing authenticated dashboard queries pass JWT access tokens and use Steam ID claims for user-scoped data.
- Phase 15 filter history is browser-local; profile-based exploration should not imply saved server-side filter presets unless explicitly planned.

### Integration Points
- `symfony/src/Application/Auth/SteamVerifyHandler.php` updates `app_user` on login and is the natural place to refresh Steam summary data.
- A new scheduled Symfony workflow or queue handler can refresh Steam profile/inventory metadata for players seen in analyzed demos.
- Versioned snapshot persistence should make it possible to compare profile/inventory/account metadata changes over time without mixing them into demo-derived feature tables.
- `symfony/src/UI/Api/PlayerController.php` can enrich player history responses with linked profile display data.
- `frontend/app/players/[playerId]/compare/page.tsx` and comparison components can display Steam identity when profile data exists.
- `frontend/app/dashboard/page.tsx` and `frontend/components/UserProfile.tsx` already provide the authenticated profile surface.

</code_context>

<deferred>
## Deferred Ideas

- Automatically using inventory value, account age, profile visibility, or external reputation as a trust/scoring multiplier before research validates it.
- Showing Steam avatars/profile links everywhere a player row appears, including all leaderboard rows and dense demo viewer surfaces.
- Database-backed saved profile/filter presets.

</deferred>

---

*Phase: 17-steamprofile-usage*
*Context gathered: 2026-05-18*
