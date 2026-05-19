# Phase 19 Context: Frontend UI/UX Analysis Console Redesign

## Goal

Rebuild or substantially refactor the Next.js frontend into a cohesive, data-dense analysis console that improves trust, orientation, review speed, explainability, accessibility, and responsive behavior.

The phase may redesign surfaces from scratch where that produces a cleaner UX, but it must preserve the existing backend contracts and product capabilities unless a later plan explicitly identifies a safe migration path.

## Source Review

Primary review input:

- `tasks/frontend-ui-ux-review.md`

The review was created with `.codex/skills/ui-ux-pro-max` and identifies the target direction:

- Dark/OLED-friendly analytics console.
- Semantic design tokens.
- Shared console page shells and panels.
- Persistent research-signal framing.
- Dashboard workflow redesign.
- Evidence-first results and TRACE explainability.
- Better sensitivity tuner wording and affordances.
- Replay-style demo viewer and heatmap UX.
- Accessible charts, tables, forms, focus states, and responsive layouts.

## Product Constraints

- The app remains a post-game CS2 demo research tool.
- Suspicion scores, TRACE values, Steam metadata, inventory data, match-history data, and leaderboard ranks must remain research signals or provenance, never proof of cheating.
- No live cheat detection, memory reading, client tampering, ban automation, or invasive anti-cheat behavior.
- Symfony owns API, queue dispatch, persistence, authentication, and product boundaries.
- Python owns parsing, feature extraction, scoring, and ML.
- Frontend work should preserve existing API/hook contracts unless the plan explicitly includes coordinated backend changes.

## Likely Areas

- `frontend/app/globals.css`
- `frontend/tailwind.config.ts`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/results/[id]/page.tsx`
- `frontend/app/leaderboards/page.tsx`
- `frontend/app/analytics/trends/page.tsx`
- `frontend/app/players/[playerId]/compare/page.tsx`
- `frontend/components/Console/*`
- `frontend/components/DemoDetail/*`
- `frontend/components/DemoViewer/*`
- `frontend/components/Analytics/*`
- `frontend/components/Leaderboard/*`
- `frontend/components/DemoHistoryTable.tsx`
- `frontend/components/SteamMatchHistoryCard.tsx`
- `frontend/components/QuickUploadCard.tsx`
- `frontend/components/Navbar.tsx`

## Verification Expectations

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run e2e`
- Responsive checks at 320px, 768px, 1024px, and 1440px.
- Keyboard-only smoke test for navbar, dashboard rows, filters, forms, viewer controls, and timeline.
- Dark and light contrast review, especially muted text and transparent panels.
