---
phase: 17
plan: 04
status: completed
completed_at: 2026-05-18
---

# 17-04 Summary: Player API And UI Enrichment

Added safe Steam profile display DTO/provider and integrated optional profile enrichment into player history and comparison surfaces. Added a compact frontend profile badge for player-focused comparison headers.

Key files:
- `symfony/src/Application/Steam/SteamPlayerProfileDto.php`
- `symfony/src/Application/Steam/SteamPlayerProfileProvider.php`
- `symfony/src/UI/Api/PlayerController.php`
- `symfony/src/Application/Leaderboard/PlayerComparisonDto.php`
- `symfony/src/Application/Handler/GetPlayerComparisonHandler.php`
- `frontend/components/PlayerSteamProfileBadge.tsx`
- `frontend/components/Comparison/PlayerComparisonCard.tsx`
- `frontend/lib/hooks/usePlayerComparison.ts`
- `frontend/__tests__/components/PlayerSteamProfileBadge.test.tsx`

Boundary: normal player APIs expose safe display fields only; inventory value and raw payloads are excluded.
