# Phase 14: Landing Page + Steam Login

## Overview

Establish public onboarding and authenticated user experience with Steam API integration.

**Status:** Planning  
**Start Date:** 2026-05-17  
**Estimated Duration:** 2-3 days  
**Depends On:** Phase 13 (Demo Viewer), Phase 6 (Frontend), Phase 2 (Backend)

## Phase Structure

| Wave | Focus | Files |
|------|-------|-------|
| 1 | Landing page UI, public metrics | 14-01-PLAN.md |
| 2 | Steam OAuth 2.0 flow, session management | 14-02-PLAN.md |
| 3 | User persistence layer (Symfony), profile API | 14-03-PLAN.md |
| 4 | Dashboard UI, demo history, quick upload | 14-04-PLAN.md |

## Key Deliverables

- Public landing page with feature overview
- Steam authentication with `next-auth`
- User session persistence (JWT + httpOnly cookies)
- Personalized user dashboard
- User profile API endpoint
- Demo history filtered by user

## Technical Decisions

1. **Auth Provider**: Steam OAuth 2.0 via `next-auth`
2. **Session Storage**: httpOnly cookies with JWT payload
3. **User Data**: Extend existing User entity, add Steam ID + avatar
4. **Dashboard**: React page with personal demo history and quick upload
5. **Public Metrics**: Aggregate counts (total demos, avg suspicion) cached at backend

## Artifacts

- [14-CONTEXT.md](./14-CONTEXT.md) — Phase context and constraints
- 14-01-PLAN.md — Wave 1 planning
- 14-02-PLAN.md — Wave 2 planning
- 14-03-PLAN.md — Wave 3 planning
- 14-04-PLAN.md — Wave 4 planning
- 14-RESEARCH.md — Steamworks API investigation
- 14-PATTERNS.md — Code patterns and existing analogs
- 14-SUMMARY.md — Phase execution summary
- 14-UAT.md — User acceptance testing results
