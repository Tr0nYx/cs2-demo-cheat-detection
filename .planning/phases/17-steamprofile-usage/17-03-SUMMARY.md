---
phase: 17
plan: 03
status: completed
completed_at: 2026-05-18
---

# 17-03 Summary: Tiered Refresh Pipeline

Added a Messenger message, refresh planner, refresh handler, and console command for regularly checking Steam profiles and inventories for demo players. The planner assigns tiers for new, active, stale, inactive, and backoff candidates.

Key files:
- `symfony/src/Application/Steam/RefreshSteamProfileMessage.php`
- `symfony/src/Application/Steam/SteamProfileRefreshPlanner.php`
- `symfony/src/Application/Steam/RefreshSteamProfileHandler.php`
- `symfony/src/Command/RefreshSteamProfilesCommand.php`
- `symfony/config/packages/messenger.yaml`

Boundary: refresh jobs persist versioned snapshots and do not dispatch or mutate visible analysis/scoring data.
