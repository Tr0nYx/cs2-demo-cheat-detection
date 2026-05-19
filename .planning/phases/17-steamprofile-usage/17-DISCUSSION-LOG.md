# Phase 17: Steamprofile Usage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 17-steamprofile-usage
**Areas discussed:** Profile Data Scope, User and Player Identity, Public Profile Display, Research-Safe Analytics Use

---

## Profile Data Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Steam summary only, refreshed on login | Store Steam ID, username, avatar, profile URL, and refresh timestamp. Low risk and matches current code. | yes |
| Steam summary plus lightweight public metadata | Also store privacy state, country/region if public, profile visibility, or last logoff. More segmentation value but more privacy-sensitive. | |
| Minimal storage, live fetch on demand | Store only Steam ID and fetch profile display data when needed. Fresher but slower and dependent on Steam availability. | |

**User's choice:** Steam summary only, refreshed on login.
**Notes:** Initial conservative profile scope accepted, then superseded by a follow-up correction: when a player appears in a demo, the system should regularly check the Steam profile, including public inventory/account metadata where available.

### Follow-up Correction

| Requested addition | Decision impact |
|--------------------|-----------------|
| Regular Steam profile checks for players found in demos | Phase 17 now includes scheduled/rate-limited enrichment for demo players, not only login-time refresh for authenticated users. |
| Include inventory and account metadata | Phase 17 now includes collecting/researching public inventory availability/value and account age/visibility signals where available. |
| Research anti-cheat usefulness | Inventory value and account age are research candidates. They are not automatically accepted as suspicion/TRACE scoring inputs. |

---

## Check Frequency and Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On ingestion + stale refresh | Check all players on demo ingest; refresh again only when stale, e.g. older than 7 days. | |
| Daily background refresh | Refresh all known players daily. Current, but heavier on Steam API usage. | |
| Tiered refresh | Refresh new/recent/active players sooner, old/inactive players less often, and error/private profiles with backoff. | yes |
| Manual/admin only | Refresh only by explicit admin action. Simple, but weak automation. | |

**User's choice:** Tiered refresh.
**Notes:** Planning should define priority tiers and backoff behavior.

---

## Inventory Value Source

| Option | Description | Selected |
|--------|-------------|----------|
| Steam inventory only, no value | Store inventory availability and rough item count only. | |
| Market price estimate | Estimate value from inventory items and Steam Community Market prices. | yes |
| Value bands only | Estimate internally but store/use only value bands. | |
| External pricing provider | Use third-party skin pricing provider. | |

**User's choice:** Market price estimate.
**Notes:** Values must be approximate, cached, timestamped, and research-only.

---

## Account and Privacy Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal public account signals | Account age if available, profile visibility, inventory visibility, refresh/error state. | |
| Expanded public metadata | Include country/region, last logoff, profile state, and similar public metadata. | |
| Research maximum public snapshot | Collect all public Steam summary fields and inventory metadata, then decide later what matters. | yes |

**User's choice:** Research maximum public snapshot.
**Notes:** Requires strong source labeling, visibility/privacy state, and later field-level review before product/scoring use.

---

## Research Gate for Scoring

| Option | Description | Selected |
|--------|-------------|----------|
| Never score, only context | External values remain permanently only context/filter metadata. | |
| Research report required | Research report first, then a manual decision. | |
| Shadow mode first | After research, calculate/log/compare as shadow features before any visible score impact. | yes |
| Immediate experimental weight | Add a small experimental weight immediately. | |

**User's choice:** Shadow mode first.
**Notes:** Shadow mode only happens after a research report; a later explicit decision is still required before visible scoring impact.

---

## Storage and Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Latest snapshot only | Store only current profile/inventory metadata plus timestamps/errors. | |
| Versioned snapshots | Keep snapshot history over time with source, fetched_at, visibility state, errors, and derived values. | yes |
| Hybrid retention | Keep latest normalized state plus retained append-only snapshots. | |
| Raw JSON archive | Store full raw Steam API responses indefinitely. | |

**User's choice:** Versioned snapshots.
**Notes:** Research and auditability take priority over latest-only simplicity.

---

## User and Player Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-link by Steam ID | If `app_user.steam_id` matches `player.steam_id`, treat them as the same identity for profile, history, and player views. | yes |
| Uploader ownership only | Users own demos they upload/import, even if their Steam ID appears in other demos. Simpler privacy boundary, weaker player profile experience. | |
| Hybrid ownership | Users own uploaded/imported demos and can also see appearances where their Steam ID appears. Best product fit, slightly more implementation. | |

**User's choice:** Auto-link by Steam ID.
**Notes:** Identity linking is automatic. Permission and ownership details remain for planning, but the identity match is locked.

---

## Public Profile Display

| Option | Description | Selected |
|--------|-------------|----------|
| Authenticated dashboard only | Username, avatar, and profile link appear only in the user's own dashboard. Lowest privacy exposure. | |
| Dashboard plus player pages | Show Steam username, avatar, and profile link on player history and player compare pages when available. | yes |
| Everywhere player rows appear | Show Steam identity on leaderboards, demo detail, compare pages, history, and viewer legend. Richest but widest exposure. | |

**User's choice:** Dashboard plus player pages.
**Notes:** Leaderboard rows and dense demo/event surfaces should remain restrained unless planning finds a low-exposure pattern.

---

## Research-Safe Analytics Use

| Option | Description | Selected |
|--------|-------------|----------|
| Display context only | Profile data labels the person, but never changes scoring, filters, cohorts, or rankings. | |
| Context plus explicit filters | Profile data can power user-requested filters/cohorts, but never changes suspicion or TRACE scores. | yes |
| Trust/context multiplier | Profile age, visibility, or public metadata can influence confidence/trust weighting. More complex and ethically risky. | |

**User's choice:** Context plus explicit filters.
**Notes:** Steam profile data must not affect suspicion scores, TRACE scores, labels, or model confidence unless the dedicated research task validates the signal and the project explicitly accepts that use.

## the agent's Discretion

- Exact refresh staleness threshold beyond refreshing on successful login.
- Exact scheduled refresh cadence and queue/backoff mechanics for player profile/inventory checks.
- Exact snapshot retention policy, unless legal/privacy constraints require a hard cap.
- Exact player-page display layout and API response shape.
- Whether enrichment ships inline or via a dedicated endpoint.

## Deferred Ideas

- Automatic inclusion of inventory value, account age, profile visibility, or external reputation in scoring before research validates it.
- Steam identity display everywhere player rows appear.
- Database-backed saved profile/filter presets.
