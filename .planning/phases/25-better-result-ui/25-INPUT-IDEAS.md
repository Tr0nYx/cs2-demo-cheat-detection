# Phase 25: Input Ideas - Mercurial Reference

**Captured:** 2026-05-28  
**Reference:** https://mercurial.gg/player/76561197966945717  
**Related demo page inspected:** `/demo/ac57e69a-4916-4030-876c-ed75404457bf` from that player history  
**Status:** Input only. These ideas should inform Phase 25 implementation without changing scoring semantics, backend contracts, or the research-only boundary.

## Useful Patterns

### Player/Profile Header

- Mercurial leads with a compact player identity strip: avatar, player name, Steam ID, external Steam/FACEIT links, share action, and current external rank/ELO context.
- For this project, `/results/{demoId}` can borrow the compact orientation style for selected players: player name/Steam ID, profile link eligibility, match link, viewer link, and available provenance.
- External profile or rank data must remain context/provenance only and must not affect suspicion scores, confidence, labels, or player trust.

### Score Context Before Detail

- The player page shows a headline suspicion state, analyzed-game count, low/moderate counts, and a comparison baseline such as FACEIT level.
- Phase 25 can make score coverage more explicit in the first viewport: number of real player results, aggregate-placeholder presence, unavailable/capped evidence count, and top review-signal count.
- Comparison baselines are useful only when the payload genuinely provides them. Do not fabricate rank, ELO, lobby, or historical context.

### Compact Capability Bands

- Mercurial uses compact bands for categories such as aim, duels, peek, hold, movement, utility, impact, and overall, including small trend deltas.
- Phase 25 can adapt this as feature-family badges for aimbot, triggerbot, wallhack, recoil, bhop, and session: band, confidence/evidence state, capped/unavailable marker, and top contributing measurement.
- Keep internal method names secondary. The visible badge should answer "what should I review first?" rather than "which algorithm produced this?"

### Short Verdict Cards

- The player page includes small AI verdict cards with map, age, label, and one-sentence rationale.
- Our result dashboard can use a similar "review note" pattern for top players: concise explanation, signal label, and direct links to player detail or selected evidence.
- The tone should stay neutral: "review signal", "mixed evidence", "limited sample", "context reduces concern". Avoid accusation wording.

### Dense Match History / Result Tables

- Mercurial's match history rows pack map, score, verdict, KDA, ADR, HS%, rating, category bands, AI marker, flagged-count context, and recency into a dense scan-friendly row.
- Phase 25 should keep the ranked player table similarly compact: player, score band, confidence/evidence, top feature badges, status warnings, and links.
- Add simple filters where useful, for example `All`, `Review signals`, `Capped/limited`, and `Aggregate`, but keep Phase 25 scoped to result review rather than a full history redesign.

### Deep Scan / Analysis Modes

- The demo page uses tabs for `Scoreboard`, `Summary`, `Shot Analysis`, `Duels`, `Utility`, and `Ping`. This cleanly separates overview, narratives, and raw evidence.
- Phase 25 already plans `Players`, `TRACE`, `Sensitivity`, and `Viewer`; Mercurial supports the idea that raw evidence belongs in focused tabs or selected-player drawers, not in one long scroll.
- If later phases add richer event evidence, consider subfilters inside the Players detail area: round, target, weapon, feature family, and evidence strength.

### Player Narrative Blocks

- Mercurial's deep scan gives each player a structured narrative: role tags, short performance summary, standout moment, gameplay, aim, awareness, duels, profile context, coaching note, and verdict.
- Phase 25 can borrow the structure, not the exact content: selected-player detail should group evidence by `What happened`, `Why this score`, `What limits confidence`, and `Next review links`.
- "Red flag" and "Exonerator" chips are a useful concept when renamed for our tone, for example `Review signal` and `Context reducer`.

### Concrete Evidence Filters

- The shot-analysis page exposes filters by player, round, target, weapon, and shot string, then lists concrete sequences with timing, hit/miss/HS outcomes, and hit distribution.
- Our current persisted evidence may not support that level of detail everywhere, but the UI should be ready for "evidence samples" when available.
- For Phase 25, show available evidence windows as limited samples and explicitly state when parser gaps or low sample counts prevent detailed review.

### Strong Safety Framing

- Mercurial repeats a footer disclaimer that analysis is probabilistic and not an accusation or proof.
- Phase 25 should keep a visible research-signal notice near the first result surface and preserve the stronger no-proof/no-enforcement wording already required by project constraints.
- Avoid adopting "Trust Factor" naming because it can be confused with Valve's own trust terminology. If lobby quality appears later, label it as an estimated matchmaking-context signal.

## Phase 25 Translation

- Update the first viewport to behave like a review console: status/provenance, coverage counts, top review signals, and actions to match/player/viewer surfaces.
- Make the ranked player table more like a scan surface than a card stack: compact rows, clear bands, top feature badges, warnings, and selected-player expansion.
- Add selected-player narrative sections: summary, why this score, confidence limitations, top measurements, and related navigation.
- Use "context reducer" patterns for weak evidence, clean history, low sample count, capped score, unavailable data, or parser gaps.
- Keep TRACE, Sensitivity, and Viewer as separate modes and resist mixing raw event/shot evidence into the top-level dashboard.

## Guardrails

- Do not copy Mercurial's product language, trust-factor claims, or visual styling directly.
- Do not use external rank/profile/history as suspicion evidence unless a future backend/scoring phase explicitly defines that contract.
- Do not add proof, ban, conviction, cheater, or enforcement language.
- Do not introduce new backend requirements for Phase 25 unless the existing payload cannot safely support the planned UI.
