# Phase 17: Steamprofile Usage - Research

**Researched:** 2026-05-18
**Status:** Complete

## Scope

Phase 17 adds Steam profile and inventory enrichment for players observed in demos. It must support regular tiered refresh, versioned snapshots, inventory value estimates, player-page identity display, and a research/shadow-mode gate before any external account signal can affect visible anti-cheat scoring.

## External Findings

### Steam Summary API

- Steamworks `ISteamUser/GetPlayerSummaries` is the right primary source for Steam persona name, avatar, profile URL, visibility state, and public account fields.
- The endpoint accepts up to 100 Steam IDs per request, so the refresh job should batch IDs rather than issue one request per player.
- Private or limited profiles may omit optional fields. The data model must record visibility and missing-field state instead of treating absence as an error.

Source: https://partner.steamgames.com/doc/webapi/ISteamUser

### Inventory and Pricing

- Public inventory data is tied to Steam Community inventory visibility. Private inventories must be stored as `private`/`unavailable`, not failed research.
- Steamworks economy APIs are partly partner/publisher-key oriented. Market-price data may not be uniformly available through stable public APIs for all CS2 inventory items.
- Planning should isolate pricing behind a provider interface, cache prices aggressively, label the source, and allow the provider to return partial/unknown prices. Estimated inventory value is approximate and research-only.

Sources:
- https://partner.steamgames.com/doc/features/inventory/webfunctions
- https://partner.steamgames.com/doc/webapi/ISteamEconomy

## Codebase Findings

### Existing Useful Paths

- `symfony/src/Infrastructure/Steam/SteamOpenIdValidator.php` already calls Steam summary data during login.
- `symfony/src/Entity/User.php` stores login Steam profile data.
- `symfony/src/Domain/Player/Player.php` is the canonical analyzed-player identity keyed by Steam ID.
- `symfony/src/Infrastructure/Persistence/PlayerRepository.php` already has `findOrCreateBySteamId`.
- `symfony/src/UI/Api/PlayerController.php` and `symfony/src/Presentation/Controller/PlayerComparisonController.php` are the player-facing API surfaces.
- `frontend/components/UserProfile.tsx` and `frontend/components/Comparison/PlayerComparisonCard.tsx` are the immediate frontend surfaces for Steam identity display.
- `symfony/config/packages/messenger.yaml` already has Messenger transports; Phase 17 can add a dedicated refresh message route.

### Integration Risks

- Current `Player` is a domain entity, while `User` lives in `App\Entity`; Phase 17 should avoid forcing a direct ORM relation unless needed. A profile snapshot keyed by Steam ID keeps the boundary simpler.
- Steam pricing and inventory APIs can be rate-limited, partial, private, or unstable. The system needs backoff, batch summary calls, cached market prices, and "unknown/private" states as normal outcomes.
- External Steam metadata must remain separate from demo-derived feature vectors. This is a schema and naming concern, not just UI copy.

## Recommended Plan Shape

1. Create Steam profile/inventory snapshot entities, repositories, and migrations.
2. Add Steam clients/providers for summaries, inventories, market prices, batching, caching, and failure classification.
3. Add tiered refresh dispatch and a Symfony console command to enqueue stale/new/active players.
4. Expose profile enrichment on player history/comparison APIs and update frontend player surfaces.
5. Add a research report and shadow-feature audit path that computes external signals without affecting visible scores.

## Validation Architecture

- Backend unit tests for entity invariants, provider parsing, value estimation, refresh tier selection, and shadow-mode exclusion from visible scores.
- Controller tests for player history/comparison enrichment when profile exists, missing/private profile behavior, and no leakage into dense/global surfaces.
- Frontend component tests for player profile display fallback and profile link rendering.
- Schema validation after Doctrine migration.
- Static grep-style verification that no suspicion/TRACE visible score path reads Steam external signal fields in Phase 17.

## RESEARCH COMPLETE
