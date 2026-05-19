# Phase 24: Match Detail Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 24-match-detail-page
**Areas discussed:** Product reference, route identity, match sections, API reuse, research framing

---

## Product Reference

| Option | Description | Selected |
|--------|-------------|----------|
| CSStats-inspired match report | Use the supplied csstats match page as the structural reference for header, teams, scoreboard, rounds, and heatmap access. | yes |
| Existing results page extension | Keep `/results/{demoId}` as the primary page and append match sections to it. | |
| New visual direction | Ignore the reference and invent a new match-review surface. | |

**User's choice:** User supplied `https://csstats.gg/match/443694426` with the phase discussion request.
**Notes:** The reference was treated as a concrete product anchor. The captured decision is to adapt the structure, not copy branding or content.

---

## Route Identity

| Option | Description | Selected |
|--------|-------------|----------|
| `/matches/{demoId}` | New canonical match page keyed by internal demo UUID, preserving existing result routes. | yes |
| `/results/{demoId}` only | Rework the existing analysis result page into the match page. | |
| External match/sharecode identity | Key the page by sharecode or external match ID. | |

**User's choice:** Agent-selected default based on existing codebase identity and API routes.
**Notes:** Existing frontend/backend contracts already use demo UUID for result, detail, viewer, heatmap, rounds, and events.

---

## Match Sections

| Option | Description | Selected |
|--------|-------------|----------|
| Overview, Scoreboard, Rounds, Events, Viewer/Heatmaps | Core match report sections mapped to existing data and Phase 13 viewer capabilities. | yes |
| Full csstats parity | Include Scoreboard, Rounds, Weapons, Duels, Heatmaps with complete stat parity. | |
| Viewer-first layout | Make the replay canvas the main page and place match report data around it. | |

**User's choice:** Agent-selected default using the csstats reference and existing Phase 13/23 capabilities.
**Notes:** Weapons and Duels are explicitly deferred unless already supported without broad parser/data-model work.

---

## API Reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Compose existing APIs first | Reuse demo detail, rounds, events, ticks, and heatmap endpoints before adding new contracts. | yes |
| Add a match API immediately | Create a dedicated backend match aggregate regardless of existing payload coverage. | |
| Frontend-only mock composition | Build the page from partial frontend data and leave missing fields as placeholders. | |

**User's choice:** Agent-selected default following roadmap anchor and codebase scouting.
**Notes:** A match-summary DTO/endpoint remains allowed if planning confirms team score, participants, or provenance are not cleanly available.

---

## Research Framing

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent research disclaimer | Use the Phase 23 style: research signals only, not proof. | yes |
| Inline-only labels | Rely on small labels in each card or table. | |
| Enforcement-style language | Use strong language such as cheater/proof/ban. | |

**User's choice:** Carried forward from project, Phase 20, and Phase 23 decisions.
**Notes:** This is locked by the project safety boundary and not optional for planning.

---

## Agent's Discretion

- Exact tab styling and responsive layout.
- Exact empty-state copy and skeleton UI.
- Whether the frontend composes existing hooks or backend adds a small match-summary DTO after planning.
- Exact link placement between `/results/{demoId}`, `/matches/{demoId}`, `/players/{playerId}`, and viewer/heatmap sections.

## Deferred Ideas

- Full Weapons and Duels tab parity.
- Economy/buy-round visualization if not already supported.
- Public sharing, exports, or embeds.
- Any scoring/model/calibration changes.
- Any live or enforcement workflow.
