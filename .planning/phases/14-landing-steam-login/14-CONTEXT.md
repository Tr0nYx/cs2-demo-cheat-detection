# Phase 14: Landing Page + Steam Login

**Phase Goal:** Build a public landing page with Steam API authentication, user session management, and personalized dashboard for logged-in users.

**Status:** Gray areas discussed and decisions locked.

## Business Context

Users currently can only access the analyzer through direct API calls or manual testing. Phase 14 establishes:
- Public-facing landing/onboarding experience with feature overview and public metrics
- Steam authentication (aligns with CS2 ecosystem)
- User session persistence with secure token management
- Entry point to demo upload and result browsing workflows
- Personalized user dashboard with demo history

## Dependencies

- Phase 13: Demo Viewer + Heatmap (for result display on user dashboard)
- Phase 6: Frontend Application Interface (React/Next.js stack)
- Phase 2: Symfony Backend (user/session persistence)

## Success Criteria

1. Landing page is publicly accessible at root path with hero, feature overview, public metrics, and Steam login CTA
2. Steam API login flow is complete (oauth redirect, token exchange, user creation)
3. User sessions persist for 30 days with automatic refresh token rotation
4. Authenticated users see personalized demo history on /dashboard
5. Quick demo upload accessible from dashboard with user filtering
6. Public metrics (total demos analyzed, avg suspicion scores, etc.) cached and visible on landing
7. User avatars/usernames from Steam API displayed on profile

## Architectural Decisions (LOCKED)

### 1. Steam API Credentials Management
**Decision:** Environment-based configuration via `.env` file (consistent with project standard)
- Steam App ID and API Key stored in `.env` (development) and environment variables (production/Docker)
- `.env.example` includes placeholder values
- Rationale: Aligns with existing project practice; no additional secrets management layer needed for v1

### 2. User Entity Schema
**Fields (All Required):**
- `steam_id` (string, unique primary key)
- `username` (string, from Steam)
- `avatar_url` (string, URL to Steam avatar)
- `email` (string, nullable for now, future notifications)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `last_login_at` (timestamp, nullable)

**Rationale:** Provides sufficient user identity, activity tracking, and future extensibility. Email reserved for Phase 15+ notifications.

### 3. Session Management & Security
**Configuration:**
- **Session Duration:** 30 days
- **Token Strategy:** JWT access token (short-lived, ~1 day) + refresh token (30-day rotation)
- **Cookie Settings:** `httpOnly` + `Secure` + `SameSite=Strict`
- **Refresh Logic:** Client refreshes access token via `/api/auth/refresh` when expired (next-auth middleware)

**Rationale:** Balance between security (Strict CSRF protection, httpOnly prevents JS theft) and UX (long session avoids frequent re-logins). Refresh tokens allow secure token rotation without user interaction.

### 4. Landing Page Layout & Content
**Structure:**
1. Navigation bar with login button (unauthenticated) or user dropdown (authenticated)
2. Hero section: Title, tagline, brief description of tool
3. Features section: Key capabilities (upload, analysis, leaderboards, demo viewer) in cards
4. Public metrics section: Total demos analyzed, average suspicion scores, games played (cached, updated hourly)
5. Steam login CTA button below metrics
6. Footer: GitHub link, research disclaimer

**Authenticated Users (via redirect after login):**
- Auto-redirect to `/dashboard` where they see personalized demo history

**Rationale:** Marketing-focused landing establishes credibility and use cases; public metrics build trust; minimizes friction for new users (login available without scrolling).

## Implementation Constraints

- Steam API requires valid app ID in environment (development: create app in Steamworks)
- Landing page should render fast (public metrics should be cached, not real-time queries)
- Session management must not conflict with existing demo API permissions (users can only see their own demos)
- Avatar URLs from Steam must be HTTPS-only for secure cookie context
- Demo history UI should paginate/lazy-load for users with many demos

## Data Flow

```
Public User (unauthenticated)
  ↓ Visits https://app.cs2cd.local/
  ↓ Sees landing page with public metrics + Steam login button
  ↓ Clicks "Login with Steam" → next-auth redirects to Steam OAuth
  → Steam returns auth code → Next.js exchanges for user info
  ↓ User entity created/updated in Symfony PostgreSQL
  ↓ JWT tokens (access + refresh) issued, stored in httpOnly cookies
  ↓ Auto-redirect to /dashboard
  ↓ Dashboard fetches user's demos from /api/demos?user_id={steam_id}
  ↓ User can upload, view history, click into demo viewer

User later (cookie valid)
  ↓ Visits app again
  ↓ Middleware checks httpOnly cookie, finds valid JWT
  ↓ Auto-authenticated, no re-login needed (until token expires)
  ↓ If access token expired: refresh token auto-rotates silently
```

## API Changes Required

- **New:** `POST /api/auth/login` (handled by next-auth, returns JWT tokens)
- **New:** `POST /api/auth/refresh` (refresh access token via refresh token)
- **New:** `GET /api/auth/me` (get current user profile)
- **Modify:** `GET /api/demos` (add `?user_id={steam_id}` filter, default to current user if authenticated)
- **New:** `POST /api/demos` (require authentication, auto-assign to current user)
- **New:** `GET /api/metrics/public` (total demos, avg suspicion, cached hourly)

## Frontend Routes

- `/` → Landing page (public, includes hero + features + metrics + login CTA)
- `/auth/callback` → OAuth callback handler (next-auth)
- `/dashboard` → User dashboard (authenticated only, redirect to / if not logged in)
- `/results/[id]` → Demo result detail (existing, add user ownership check)

## Next Steps

1. **Phase 14 Wave 1:** Create landing page UI with Next.js (hero, features, public metrics section, Steam login button)
2. **Phase 14 Wave 2:** Implement Steam OAuth 2.0 with next-auth
3. **Phase 14 Wave 3:** Create User entity in Symfony, add user tables/migrations, implement user repository
4. **Phase 14 Wave 4:** Create dashboard UI, demo history filtering, modify demo API for user filtering
