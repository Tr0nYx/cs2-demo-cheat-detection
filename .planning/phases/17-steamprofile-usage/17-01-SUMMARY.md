---
phase: 17
plan: 01
status: completed
completed_at: 2026-05-18
---

# 17-01 Summary: Steam Snapshot Data Model

Implemented versioned Doctrine entities and repositories for Steam profile snapshots, CS2 inventory snapshots, and market price cache rows. Added migration SQL with indexes for latest-by-Steam-ID lookups, visibility filtering, and cache lookup.

Key files:
- `symfony/src/Domain/Steam/SteamProfileSnapshot.php`
- `symfony/src/Domain/Steam/SteamInventorySnapshot.php`
- `symfony/src/Domain/Steam/SteamMarketPrice.php`
- `symfony/src/Infrastructure/Persistence/SteamProfileSnapshotRepository.php`
- `symfony/src/Infrastructure/Persistence/SteamInventorySnapshotRepository.php`
- `symfony/src/Infrastructure/Persistence/SteamMarketPriceRepository.php`
- `symfony/migrations/Version20260518SteamProfileUsage.php`

Boundary: Steam metadata is stored in separate Steam-specific tables and is not added to `AnalysisResult` or `TraceRating`.
