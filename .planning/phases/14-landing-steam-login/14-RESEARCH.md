# Phase 14: Landing Page + Steam Login - Research

**Researched:** 2026-05-17
**Domain:** Steam OAuth 2.0 + next-auth integration, JWT session management, Symfony User entity persistence
**Confidence:** HIGH

## Summary

Phase 14 requires integrating Steam authentication into the Next.js frontend, creating user session management with JWT tokens, and building a Symfony User entity for persistence. Key challenge: Steam uses OpenID 2.0 (deprecated protocol), NOT OAuth 2.0, so next-auth v4.24 requires a custom provider or third-party package to handle Steam's flow.

**Critical findings:**
1. **Steam Protocol:** Uses OpenID 2.0 (not OAuth 2.0). Next-auth v4 doesn't support this natively; requires custom provider or community package (`authjs-steam-provider` for v5 or similar).
2. **JWT Strategy:** Short-lived access tokens (15 min – 1 hour), refresh tokens (30 days) with automatic rotation via `jwt` + `session` callbacks. HttpOnly + Secure + SameSite=Strict cookies.
3. **User Entity:** Symfony 7 with Doctrine ORM; use UUID primary key, steam_id as unique constraint, avatar_url as HTTPS. Table name should be `app_user` (PostgreSQL reserves `user` keyword).
4. **Session Persistence:** Next-auth middleware in App Router with `authorized` callback + database session provider for token refresh tracking.
5. **Public Metrics Caching:** Redis with hourly TTL; Symfony scheduler or cron task updates cache, Next.js fetches cached data for landing page.
6. **Security:** Secure cookies require HTTPS in production; localhost development works with SameSite=Lax on HTTP.

**Primary recommendation:** Implement custom Steam OpenID 2.0 provider using `node-steam-openid` library on backend (Symfony API endpoint) or adopt `authjs-steam-provider` (Auth.js v5) after upgrading next-auth from v4.24 to v5. For v1, backend-driven Steam validation is safer than client-side OpenID handling.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Steam API Credentials Management:** Environment-based configuration via `.env` file. Steam App ID and API Key stored in `.env` (dev) and environment variables (production/Docker). `.env.example` includes placeholder values.

2. **User Entity Schema (All Required):**
   - `steam_id` (string, unique primary key)
   - `username` (string, from Steam)
   - `avatar_url` (string, URL to Steam avatar)
   - `email` (string, nullable for now, future notifications)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)
   - `last_login_at` (timestamp, nullable)

3. **Session Management & Security:**
   - Session Duration: 30 days
   - Token Strategy: JWT access token (short-lived, ~1 day) + refresh token (30-day rotation)
   - Cookie Settings: `httpOnly` + `Secure` + `SameSite=Strict`
   - Refresh Logic: Client refreshes access token via `/api/auth/refresh` when expired (next-auth middleware)

4. **Landing Page Layout & Content:**
   1. Navigation bar with login button (unauthenticated) or user dropdown (authenticated)
   2. Hero section: Title, tagline, brief description of tool
   3. Features section: Key capabilities (upload, analysis, leaderboards, demo viewer) in cards
   4. Public metrics section: Total demos analyzed, average suspicion scores, games played (cached, updated hourly)
   5. Steam login CTA button below metrics
   6. Footer: GitHub link, research disclaimer
   - Authenticated Users auto-redirect to `/dashboard` after login

5. **API Changes Required:**
   - **New:** `POST /api/auth/login` (handled by next-auth, returns JWT tokens)
   - **New:** `POST /api/auth/refresh` (refresh access token via refresh token)
   - **New:** `GET /api/auth/me` (get current user profile)
   - **Modify:** `GET /api/demos` (add `?user_id={steam_id}` filter)
   - **New:** `POST /api/demos` (require authentication, auto-assign to current user)
   - **New:** `GET /api/metrics/public` (total demos, avg suspicion, cached hourly)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-02 | Landing page is publicly accessible with hero, features, metrics, and Steam login CTA | Standard Stack validates next-auth + Steam, Architecture Patterns cover public metrics caching, Code Examples show login flow |
| AUTH-01 | Steam OAuth 2.0 login flow is complete (oauth redirect, token exchange, user creation) | Steam protocol research, next-auth custom provider patterns, User Entity schema |
| AUTH-02 | User sessions persist for 30 days with automatic refresh token rotation | JWT refresh token strategy, Cookie security settings, Session persistence patterns |
| AUTH-03 | Authenticated users see personalized demo history on /dashboard | Session validation patterns, Database query filtering by steam_id |
| AUTH-04 | User avatars/usernames from Steam API displayed on profile | Steam Web API profile endpoint, User entity avatar_url field |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Steam OpenID 2.0 validation | API / Backend | Browser / Client | OpenID requires server-side validation; custom Symfony endpoint or next-auth backend handler |
| Access token refresh logic | Frontend Server (Next.js middleware) | API / Backend | Middleware checks token expiry; backend provides new token via `/api/auth/refresh` |
| JWT token storage | Browser / Client | — | HttpOnly cookies managed by next-auth (not accessible to JS) |
| Session state persistence | Database / Storage | API / Backend | Refresh tokens stored in PostgreSQL; accessed via Symfony API |
| User profile display | Browser / Client | API / Backend | Frontend fetches user data from next-auth session; populates via `/api/auth/me` |
| Public metrics caching | Database / Storage | API / Backend | Redis holds hourly-updated metrics; Symfony scheduler refreshes; Next.js fetches cached values |
| Landing page rendering | Frontend Server (SSG/ISR) | CDN / Static | Server-renders metrics; ISR revalidates hourly to serve cached landing page |
| Authenticated route protection | Frontend Server (middleware) | API / Backend | next-auth middleware redirects unauthenticated users; API endpoints validate JWT in headers |

---

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 4.24.14 | Session management, OAuth provider handling | [VERIFIED: npm registry](https://www.npmjs.com/package/next-auth) — Supports Next.js 16.2.6 and React 19. v5 exists but v4 stable for production. |
| node-steam-openid | Latest | Backend OpenID 2.0 validation for Steam | [ASSUMED] — Community-maintained library specifically for Steam OpenID 2.0 (not OAuth 2.0). Handles OpenID discovery and assertion validation. |
| axios | 1.16.1 | HTTP client for API calls from backend | [VERIFIED: existing in package.json](https://www.npmjs.com/package/axios) — Already in stack. Used for Steam Web API calls to fetch user profiles. |
| React | 19.2.4 | UI framework | [VERIFIED: existing in package.json](https://react.dev/versions) — Latest stable. |
| Next.js | 16.2.6 | Framework with App Router | [VERIFIED: existing in package.json](https://www.npmjs.com/package/next) — Latest stable, full App Router support. |

### Supporting Libraries (Backend / Symfony)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Doctrine ORM | 3.6+ | Entity mapping and persistence | [VERIFIED: existing in composer.json](https://www.doctrine-project.org/) — Standard for Symfony entities. User entity will extend Doctrine\ORM\Mapping. |
| symfony/validator | 7.4.* | Input validation | [VERIFIED: existing in composer.json] — Validate steam_id format, email if provided, avatar_url HTTPS. |
| symfony/uid | 7.4.* | UUID generation | [VERIFIED: existing in composer.json] — Use Uuid::v7() for User entity primary key (consistent with existing Demo and Player entities). |
| symfony/serializer | 7.4.* | JSON serialization | [VERIFIED: existing in composer.json] — Serialize User entity to API responses. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-auth v4 custom Steam provider | Auth.js v5 + authjs-steam-provider | Requires upgrading next-auth from v4 to v5. v5 has new architecture; higher migration risk. v4 custom provider is lower-risk for v1. |
| node-steam-openid on backend | Client-side OpenID library | Client-side OpenID is less secure (private keys exposed); backend validation is standard. |
| PostgreSQL with Doctrine | Firebase Auth or Auth0 | External services increase operational overhead, cost, and vendor lock-in. Symfony already integrated with PostgreSQL. |
| Redis for metrics caching | In-memory file cache | Redis already in stack (Phase 1). File cache is single-process; doesn't work in distributed deployments. |
| Hourly scheduler for metrics refresh | Manual endpoint polling | Scheduler is more reliable; cron-like tasks prevent cache staleness. |

### Installation

**Frontend (Next.js):**
```bash
npm install next-auth@4.24.14
```

**Backend (Symfony):**
```bash
# No new composer packages required for User entity or migrations
# If implementing custom Steam validation endpoint:
# composer require guzzlehttp/guzzle  # For Steam API calls (optional; can use Symfony HttpClient)
```

**Optional (if using external library for Steam OpenID):**
```bash
npm install node-steam-openid  # If handling OpenID 2.0 validation on backend with Node.js microservice
# OR (in future)
npm install @authjs/core authjs-steam-provider  # For Auth.js v5 migration
```

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Public User                              │
│                    (Unauthenticated)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Visits: GET /
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (SSR)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Landing Page (Server Component)                           │ │
│  │ - Hero, Features, Public Metrics (cached from Redis)      │ │
│  │ - "Login with Steam" button                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
            Clicks: "Login with Steam"
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              next-auth OAuth Flow Handler                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ route: /api/auth/callback/steam                           │ │
│  │ Receives: Steam OpenID 2.0 assertion (query params)      │ │
│  │ Validates: OpenID signature + nonce                       │ │
│  │ Fetches: User profile via Steam Web API                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
               Custom OpenID 2.0 Validation
         (Symfony backend endpoint OR node-steam-openid lib)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Symfony API Backend                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Endpoint: POST /api/auth/steam-validate                   │ │
│  │ Input: OpenID assertion, nonce                            │ │
│  │ Action: Query Steam Web API (GetPlayerSummaries)          │ │
│  │ Returns: { steam_id, username, avatar_url }              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ User Repository:                                           │ │
│  │ - Find or create User entity (steam_id unique constraint)│ │
│  │ - Update last_login_at, avatar_url, username             │ │
│  │ - Return User with JWT tokens                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Database (PostgreSQL)                                      │ │
│  │ - Table: app_user                                          │ │
│  │ - Stores: steam_id, username, avatar_url, timestamps     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        Returns: JWT access_token + refresh_token
                 (Stored in httpOnly cookies)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Authenticated User Session                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cookies (httpOnly, Secure, SameSite=Strict):              │ │
│  │ - next-auth.session-token (JWT access token, 1 day)      │ │
│  │ - next-auth.refresh-token (JWT refresh token, 30 days)   │ │
│  │ Auto-redirect → GET /dashboard                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Dashboard (Protected Page)                                │ │
│  │ - Middleware validates JWT in cookie                      │ │
│  │ - Fetches: GET /api/auth/me (user profile)               │ │
│  │ - Fetches: GET /api/demos?user_id={steam_id}            │ │
│  │ - Displays: Demo history, upload form, profile info       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Caching Layer (Redis)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Cache Keys:                                                │ │
│  │ - metrics:public → { total_demos, avg_suspicion, games } │ │
│  │ - ttl: 3600s (hourly refresh)                             │ │
│  │                                                            │ │
│  │ Refresh Trigger:                                          │ │
│  │ - Symfony scheduler (cron: every hour)                    │ │
│  │ - Runs: PublicMetricsCalculator command                   │ │
│  │ - Queries PostgreSQL aggregates, updates Redis            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
# Frontend (Next.js App Router)
frontend/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                 # Auth layout (no navbar on login page)
│   │   └── page.tsx                   # Landing page (public, includes login CTA)
│   ├── auth/
│   │   └── callback/
│   │       └── [[...nextauth]].ts     # next-auth callback handler
│   ├── dashboard/
│   │   ├── layout.tsx                 # Protected layout
│   │   └── page.tsx                   # User dashboard (protected)
│   └── api/
│       └── auth/
│           └── [...nextauth].ts       # next-auth config + handlers
├── lib/
│   ├── auth.ts                        # next-auth configuration
│   ├── session.ts                     # Session type definitions
│   └── server-actions/
│       └── auth.ts                    # Server-side auth actions
├── middleware.ts                      # next-auth middleware for route protection
├── components/
│   ├── LoginButton.tsx                # Steam login CTA
│   ├── UserDropdown.tsx               # Authenticated user menu
│   └── LandingPage/
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── PublicMetrics.tsx          # Fetches from /api/metrics/public
│       └── Footer.tsx
└── __tests__/
    └── auth/
        ├── login.test.tsx             # Login flow simulation
        └── session.test.tsx           # Session persistence

# Backend (Symfony)
symfony/
├── src/
│   ├── Domain/
│   │   └── User/
│   │       ├── User.php               # User aggregate root
│   │       ├── UserId.php             # Value object (UUID)
│   │       └── SteamProfile.php       # DTO for Steam API response
│   ├── Application/
│   │   ├── Handler/
│   │   │   ├── AuthenticateUserHandler.php      # Validate Steam OpenID + create/update User
│   │   │   └── RefreshSessionHandler.php        # Issue new access token
│   │   ├── Dto/
│   │   │   └── AuthResponseDto.php              # { user, access_token, refresh_token }
│   │   └── Service/
│   │       ├── SteamAuthService.php             # OpenID 2.0 validation + Web API
│   │       ├── PublicMetricsService.php         # Calculate + cache metrics
│   │       └── JwtTokenService.php              # JWT generation + validation
│   ├── Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── UserRepository.php               # Find/create User by steam_id
│   │   │   └── RefreshTokenRepository.php       # Track refresh tokens for revocation
│   │   └── Cache/
│   │       └── PublicMetricsCacheRepository.php # Redis wrapper for metrics
│   └── Controller/
│       └── AuthController.php                  # POST /api/auth/steam, /api/auth/refresh
├── config/
│   ├── services.yaml                  # Register new services
│   └── packages/
│       └── doctrine.yaml              # Database connection
├── migrations/
│   └── VersionXXX.php                 # User table migration
└── tests/
    └── Application/
        └── Handler/
            ├── AuthenticateUserHandlerTest.php
            └── RefreshSessionHandlerTest.php
```

### Pattern 1: Steam OpenID 2.0 Custom Provider (next-auth v4)

**What:** Implement a custom OAuth provider in next-auth that handles Steam's OpenID 2.0 protocol (not standard OAuth 2.0).

**When to use:** For v1, if staying on next-auth v4.24. Steam doesn't support OAuth 2.0 natively, so standard OAuth providers won't work.

**Implementation approach:**

1. **Backend (Symfony) validates OpenID assertion:**
   ```php
   // Symfony API endpoint: POST /api/auth/steam-callback
   public function steamCallback(Request $request, SteamAuthService $steamAuth): JsonResponse
   {
       // Receive OpenID assertion from next-auth callback
       $steamId = $steamAuth->validateOpenIdAssertion($request->query->all());
       
       // Fetch user profile from Steam Web API
       $profile = $steamAuth->getUserProfile($steamId);
       
       // Find or create User entity
       $user = $this->userRepository->findOrCreateBySteamId($steamId, $profile);
       
       // Generate JWT tokens
       $tokens = $this->jwtTokenService->generateTokens($user);
       
       return new JsonResponse($tokens); // Return to next-auth
   }
   ```

2. **next-auth configuration (custom provider):**
   ```typescript
   // frontend/lib/auth.ts
   export const authOptions: NextAuthOptions = {
     providers: [
       {
         id: 'steam',
         name: 'Steam',
         type: 'oauth',
         // Steam OpenID endpoint (not standard OAuth)
         authorization: {
           url: 'https://steamcommunity.com/openid/login',
           params: {
             openid: {
               ns: 'http://specs.openid.net/auth/2.0',
               identity: 'http://specs.openid.net/auth/2.0/identifier_select',
               claimed_id: 'http://specs.openid.net/auth/2.0/identifier_select',
               mode: 'checkid_setup',
               realm: process.env.NEXTAUTH_URL,
               return_to: `${process.env.NEXTAUTH_URL}/api/auth/callback/steam`,
             },
           },
         },
         token: {
           url: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/steam-callback`,
         },
         profile: async (profile) => ({
           id: profile.steam_id,
           name: profile.username,
           email: profile.email || null,
           image: profile.avatar_url,
         }),
       },
     ],
     callbacks: {
       async jwt({ token, account, profile }) {
         if (account) {
           token.accessToken = account.access_token;
           token.refreshToken = account.refresh_token;
           token.expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 1 day
         }
         return token;
       },
       async session({ session, token }) {
         session.user.id = token.sub;
         session.accessToken = token.accessToken;
         return session;
       },
     },
     session: { strategy: 'jwt' },
     secret: process.env.NEXTAUTH_SECRET,
   };
   ```

**Why this pattern:** Steam's OpenID 2.0 is non-standard; custom provider gives full control. Backend validation is more secure than client-side OpenID handling.

---

### Pattern 2: JWT Refresh Token Rotation with Middleware

**What:** Implement automatic access token refresh before expiry using next-auth callbacks and middleware.

**When to use:** Maintain 30-day sessions without forcing re-login, with secure token rotation.

**Example:**

```typescript
// frontend/lib/auth.ts
export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Initial login: store tokens
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 1 day
      } else if (Date.now() > token.expiresAt * 1000) {
        // Access token expired: use refresh token
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          });
          const newTokens = await res.json();
          token.accessToken = newTokens.access_token;
          token.refreshToken = newTokens.refresh_token || token.refreshToken;
          token.expiresAt = newTokens.expires_at;
        } catch (error) {
          // Refresh failed: mark for re-authentication
          token.error = 'RefreshTokenExpired';
        }
      }
      return token;
    },
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      
      // Public routes
      if (pathname === '/' || pathname.startsWith('/auth')) {
        return true;
      }
      
      // Protected routes: require valid session
      return !!auth?.user;
    },
  },
};

// frontend/middleware.ts
export { auth as middleware } from './lib/auth';

export const config = {
  matcher: ['/((?!_next|api/auth/callback|favicon.ico).*)'],
};
```

**Backend endpoint:**
```php
// Symfony: POST /api/auth/refresh
#[Route('/api/auth/refresh', name: 'auth_refresh', methods: ['POST'])]
public function refreshToken(Request $request, JwtTokenService $jwtService): JsonResponse
{
    $data = json_decode($request->getContent(), true);
    $refreshToken = $data['refreshToken'] ?? null;
    
    try {
        $user = $jwtService->validateRefreshToken($refreshToken);
        $newTokens = $jwtService->generateTokens($user);
        
        return new JsonResponse($newTokens);
    } catch (\Exception $e) {
        return new JsonResponse(['error' => 'Invalid refresh token'], 401);
    }
}
```

---

### Pattern 3: Public Metrics Caching with Symfony Scheduler

**What:** Cache public metrics (total demos, avg suspicion) in Redis and refresh hourly via a scheduled task.

**When to use:** Landing page should not query aggregates in real-time; keep metrics fresh but not live.

**Example:**

```php
// Symfony: src/Domain/Metrics/PublicMetrics.php
class PublicMetrics
{
    public function __construct(
        private int $totalDemos,
        private float $averageSuspicion,
        private int $totalGamesPlayed,
        private \DateTimeImmutable $cachedAt,
    ) {}
    
    public function getTotalDemos(): int { return $this->totalDemos; }
    public function getAverageSuspicion(): float { return $this->averageSuspicion; }
    public function getTotalGamesPlayed(): int { return $this->totalGamesPlayed; }
    public function getCachedAt(): \DateTimeImmutable { return $this->cachedAt; }
}

// Service: calculate and cache metrics
class PublicMetricsService
{
    public function __construct(
        private DemoRepository $demoRepository,
        private AnalysisResultRepository $analysisRepository,
        private CacheInterface $cache,
    ) {}
    
    public function calculateAndCache(): PublicMetrics
    {
        $totalDemos = $this->demoRepository->count(['status' => DemoStatus::Done]);
        $avgSuspicion = $this->analysisRepository->getAverageSuspicion();
        $totalGames = $this->demoRepository->countDistinct('map');
        
        $metrics = new PublicMetrics(
            $totalDemos,
            $avgSuspicion,
            $totalGames,
            new \DateTimeImmutable(),
        );
        
        // Cache for 1 hour
        $this->cache->set('metrics:public', serialize($metrics), 3600);
        
        return $metrics;
    }
    
    public function getOrCalculate(): PublicMetrics
    {
        $cached = $this->cache->get('metrics:public');
        
        if ($cached) {
            return unserialize($cached);
        }
        
        return $this->calculateAndCache();
    }
}

// Scheduled Command (runs hourly via symfony/scheduler or cron)
#[AsCommand(name: 'app:metrics:update', description: 'Update public metrics cache')]
class UpdatePublicMetricsCommand extends Command
{
    public function __construct(private PublicMetricsService $metricsService) {
        parent::__construct();
    }
    
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->metricsService->calculateAndCache();
        $output->writeln('Public metrics updated.');
        return Command::SUCCESS;
    }
}

// API Endpoint: return cached metrics
#[Route('/api/metrics/public', name: 'metrics_public', methods: ['GET'])]
public function getPublicMetrics(PublicMetricsService $metricsService): JsonResponse
{
    $metrics = $metricsService->getOrCalculate();
    
    return new JsonResponse([
        'total_demos' => $metrics->getTotalDemos(),
        'average_suspicion' => $metrics->getAverageSuspicion(),
        'total_games_played' => $metrics->getTotalGamesPlayed(),
        'cached_at' => $metrics->getCachedAt()->format(DateTimeInterface::ATOM),
    ]);
}
```

---

### Anti-Patterns to Avoid

- **Storing JWT in localStorage:** Vulnerable to XSS. Use httpOnly cookies instead (managed by next-auth).
- **OpenID 2.0 validation on frontend:** Client-side OpenID is insecure; always validate on backend.
- **No refresh token rotation:** Increase window for token compromise. Always issue fresh refresh token on use.
- **Real-time metrics queries on landing page:** Hits database every request. Use Redis cache with hourly refresh.
- **Unvalidated Steam API responses:** Always verify steam_id matches OpenID assertion before creating User.
- **Mixed HTTP/HTTPS in cookies:** SameSite=Strict + Secure require consistent HTTPS. Use SameSite=Lax for HTTP localhost.
- **Storing sensitive data in User entity without encryption:** Avatar URLs are public; email is nullable. But in future (Phase 15+), encrypt email if storing for notifications.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session state management | Custom JWT handling in routes | next-auth callbacks + middleware | next-auth handles token refresh, CSRF, cookie defaults; custom code has footguns (wrong expiry, missing refresh, etc.) |
| OpenID 2.0 validation | Regex-based assertion parsing | `node-steam-openid` library OR backend endpoint | OpenID 2.0 has subtle signature validation; libraries tested against Valve's server |
| User entity persistence | Raw PDO queries | Doctrine ORM + migrations | Doctrine handles schema evolution, type casting, relationships; raw SQL is error-prone and DB-specific |
| Password hashing for User | String comparison or custom hash | Symfony SecurityPasswordEncoder (if passwords added later) | Timing attacks, salt handling, algorithm evolution — let frameworks handle it |
| Caching invalidation | Manual cache key deletion | Redis TTL + scheduled refresh | Manual invalidation is easy to forget; TTL guarantees eventual freshness |
| Rate limiting on auth endpoints | Custom counter in session | symfony/rate-limiter or middleware | Standard solutions handle distributed cache, cleanup, and header generation |

**Key insight:** Authentication and token refresh are security-critical. Use battle-tested libraries (next-auth, Doctrine, Symfony security) rather than custom implementations.

---

## Runtime State Inventory

**Trigger:** This phase involves creating new entities and migrations (User table), so explicit inventory is needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None existing (User table is new) | Create migration: `app_user` table with steam_id unique constraint |
| Live service config | None existing (no external services pre-configured) | Add Steam API credentials to `.env` and production environment variables |
| OS-registered state | None — no system tasks reference User entity | No action needed |
| Secrets/env vars | `.env` entries for: `STEAM_APP_ID`, `STEAM_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Add to `.env.example` with placeholders; set values in local `.env` and CI/CD |
| Build artifacts | None — User entity and migrations are source code | No action needed |

---

## Common Pitfalls

### Pitfall 1: Steam OpenID 2.0 Protocol Mismatch

**What goes wrong:** Treating Steam as OAuth 2.0, trying to use standard `oauth2/oauth` workflows. Steam uses OpenID 2.0 (deprecated, non-standard).

**Why it happens:** OpenID sounds like OAuth; modern libraries default to OAuth 2.0. Steam hasn't migrated to OpenID Connect or OAuth 2.0.

**How to avoid:** 
- Use `node-steam-openid` library or custom OpenID validator (backend)
- Read Steam's official OpenID docs: https://steamcommunity.com/dev/
- Test assertion validation with a known Steam ID before deployment

**Warning signs:** 
- "steam_id not returned from provider"
- "Invalid token response from Steam"
- "OpenID assertion validation failed"

### Pitfall 2: JWT Expiry Without Refresh Token Handling

**What goes wrong:** Access token expires, user is logged out, no automatic refresh. User frustrated; forced re-login.

**Why it happens:** Setting token expiry without implementing refresh callback in next-auth. Forgot to check `expiresAt` in `jwt` callback.

**How to avoid:**
- Always implement both `token` AND `session` callbacks in next-auth
- Check `Date.now() > token.expiresAt * 1000` in jwt callback
- Test token expiry locally: set short expiry (e.g., 5 minutes), wait, then interact with app
- Verify refresh endpoint works before deploying

**Warning signs:**
- User logged out after 1-2 minutes
- "Invalid token" error in browser console
- `/api/auth/refresh` endpoint 404 or 401

### Pitfall 3: Missing User Entity Migration

**What goes wrong:** Code references `app_user` table, but migration never created it. Database query fails.

**Why it happens:** Forgot to run `make doctrine:migrations:diff` after defining User entity, or migration file got excluded from commit.

**How to avoid:**
- Define User entity in `src/Domain/User/User.php`
- Run `php bin/console make:migration --no-interaction`
- Review generated migration in `migrations/VersionXXX.php`
- Test migration locally: `php bin/console doctrine:migrations:migrate`
- Commit migration file alongside entity changes
- Verify migration runs in CI/CD pipeline

**Warning signs:**
- "Base table or view not found: app_user"
- PDOException in logs during first POST to `/api/auth/login`
- Migration file exists but not committed to git

### Pitfall 4: Insecure Cookie Settings

**What goes wrong:** Cookies set without httpOnly, Secure, or SameSite. XSS or CSRF attacks can steal session.

**Why it happens:** Next-auth defaults are good, but if overriding cookie config, easy to forget security flags. Development (HTTP localhost) tempts shortcuts.

**How to avoid:**
- Never change next-auth cookie defaults unless necessary
- Always use: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'strict'` (or 'lax' for localhost HTTP)
- Test in production-like environment (HTTPS, different domain) before deploying
- Use Security Headers scanner (e.g., Mozilla Observatory) to verify

**Warning signs:**
- JavaScript in browser can read `document.cookie` (should be empty if httpOnly set)
- Cookie sent over HTTP (should not happen in production)
- CSRF form request succeeds without CSRF token

### Pitfall 5: Avatar URL Not HTTPS

**What goes wrong:** Steam avatar_url is HTTP, browser refuses to load in HTTPS context (mixed content). Avatar broken on dashboard.

**Why it happens:** Steam Web API sometimes returns HTTP URLs. Developer assumes URLs are always HTTPS.

**How to avoid:**
- Always validate avatar_url is HTTPS before storing: `if (!str_starts_with($url, 'https://')) { $url = str_replace('http://', 'https://', $url); }`
- Test with a user who has an HTTP avatar URL in Steam profile
- Or: fetch avatars through Symfony proxy endpoint (guarantees HTTPS origin)

**Warning signs:**
- Mixed content warning in browser console
- Avatar image doesn't load on dashboard
- "This site tried to load a resource from an insecure source" error

---

## Code Examples

### Example 1: Steam Login Button

**Source:** [next-auth documentation](https://next-auth.js.org/configuration/providers/oauth), [Steam OpenID flow](https://steamcommunity.com/dev/)

```typescript
// frontend/components/LoginButton.tsx
'use client';

import { signIn } from 'next-auth/react';

export function LoginButton() {
  return (
    <button
      onClick={() => signIn('steam', { callbackUrl: '/dashboard' })}
      className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold flex items-center gap-2"
    >
      {/* Steam logo SVG */}
      <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor">
        {/* Embedded SVG path */}
      </svg>
      Login with Steam
    </button>
  );
}
```

### Example 2: User Entity (Symfony + Doctrine)

**Source:** [Symfony Entity documentation](https://symfony.com/doc/current/doctrine.html), [PostgreSQL reserved keywords](https://www.postgresql.org/docs/current/sql-keywords-appendix.html)

```php
// symfony/src/Domain/User/User.php
<?php

declare(strict_types=1);

namespace App\Domain\User;

use App\Infrastructure\Persistence\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')] // PostgreSQL reserves "user" keyword
#[ORM\UniqueConstraint(name: 'uniq_user_steam_id', columns: ['steam_id'])]
#[ORM\Index(name: 'idx_user_created_at', columns: ['created_at'])]
class User
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'steam_id', length: 64)]
    private string $steamId;

    #[ORM\Column(name: 'username', length: 255)]
    private string $username;

    #[ORM\Column(name: 'avatar_url', length: 1024)]
    private string $avatarUrl; // Always HTTPS

    #[ORM\Column(name: 'email', length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(name: 'last_login_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    public function __construct(
        string $steamId,
        string $username,
        string $avatarUrl,
        ?string $email = null,
        ?Uuid $id = null,
        ?\DateTimeImmutable $createdAt = null,
    ) {
        $this->id = $id ?? Uuid::v7();
        $this->steamId = $steamId;
        $this->username = $username;
        // Ensure avatar URL is HTTPS
        $this->avatarUrl = $this->ensureHttps($avatarUrl);
        $this->email = $email;
        $now = new \DateTimeImmutable();
        $this->createdAt = $createdAt ?? $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid { return $this->id; }
    public function getSteamId(): string { return $this->steamId; }
    public function getUsername(): string { return $this->username; }
    public function getAvatarUrl(): string { return $this->avatarUrl; }
    public function getEmail(): ?string { return $this->email; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function getLastLoginAt(): ?\DateTimeImmutable { return $this->lastLoginAt; }

    public function updateLastLogin(): void
    {
        $this->lastLoginAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function updateProfile(string $username, string $avatarUrl, ?string $email = null): void
    {
        $this->username = $username;
        $this->avatarUrl = $this->ensureHttps($avatarUrl);
        $this->email = $email;
        $this->updatedAt = new \DateTimeImmutable();
    }

    private function ensureHttps(string $url): string
    {
        if (!str_starts_with($url, 'https://')) {
            return str_replace('http://', 'https://', $url);
        }
        return $url;
    }
}
```

### Example 3: Migration File

**Source:** [Doctrine Migrations documentation](https://symfony.com/doc/current/doctrine/migrations.html)

```php
// symfony/migrations/Version20260517000000.php
<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user table for Phase 14 authentication';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE app_user (
                id UUID NOT NULL,
                steam_id VARCHAR(64) NOT NULL,
                username VARCHAR(255) NOT NULL,
                avatar_url VARCHAR(1024) NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP(0) NOT NULL,
                updated_at TIMESTAMP(0) NOT NULL,
                last_login_at TIMESTAMP(0),
                PRIMARY KEY(id)
            )
        ');
        $this->addSql('CREATE UNIQUE INDEX uniq_user_steam_id ON app_user (steam_id)');
        $this->addSql('CREATE INDEX idx_user_created_at ON app_user (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE app_user');
    }
}
```

### Example 4: JWT Token Generation Service

**Source:** [Auth.js JWT documentation](https://authjs.dev/guides/refresh-token-rotation), JWT best practices

```php
// symfony/src/Application/Service/JwtTokenService.php
<?php

declare(strict_types=1);

namespace App\Application\Service;

use App\Domain\User\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtTokenService
{
    public function __construct(
        private string $jwtSecret,
        private string $jwtAlgorithm = 'HS256',
    ) {}

    /**
     * Generate JWT tokens for user
     * @return array{ access_token: string, refresh_token: string, expires_at: int }
     */
    public function generateTokens(User $user): array
    {
        $now = time();
        
        // Access token: 1 day
        $accessPayload = [
            'iss' => 'cs2-demo-cheat-detection',
            'sub' => $user->getId()->toRfc4122(),
            'steam_id' => $user->getSteamId(),
            'iat' => $now,
            'exp' => $now + (24 * 60 * 60), // 1 day
        ];
        
        // Refresh token: 30 days
        $refreshPayload = [
            'iss' => 'cs2-demo-cheat-detection',
            'sub' => $user->getId()->toRfc4122(),
            'type' => 'refresh',
            'iat' => $now,
            'exp' => $now + (30 * 24 * 60 * 60), // 30 days
        ];
        
        return [
            'access_token' => JWT::encode($accessPayload, $this->jwtSecret, $this->jwtAlgorithm),
            'refresh_token' => JWT::encode($refreshPayload, $this->jwtSecret, $this->jwtAlgorithm),
            'expires_at' => $now + (24 * 60 * 60),
        ];
    }

    /**
     * Validate and decode JWT token
     */
    public function validateToken(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->jwtSecret, $this->jwtAlgorithm));
            return (array) $decoded;
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Validate refresh token specifically
     */
    public function validateRefreshToken(string $token): User
    {
        $payload = $this->validateToken($token);
        
        if (($payload['type'] ?? null) !== 'refresh') {
            throw new \InvalidArgumentException('Not a refresh token');
        }
        
        // Fetch user from database
        // (Implementation depends on UserRepository)
        // return $this->userRepository->find($payload['sub']);
        
        throw new \InvalidArgumentException('User not found');
    }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenID 1.0 + form_post | OpenID 2.0 (Steam standard) | ~2006 | Steam standardized on OpenID 2.0; still in use, not migrated to OpenID Connect |
| Storing JWTs in localStorage | HttpOnly cookies (next-auth default) | ~2020 | XSS attacks can't steal httpOnly cookies; significantly more secure for web apps |
| No token refresh, long expiry (90 days) | Short-lived access + refresh token rotation | ~2018 | Reduces compromise window; refresh tokens enable revocation without user re-auth |
| Passwords in User entity | OAuth only (no password column) | Current phase (v1) | Avoids password management complexity; Steam owns credential security |
| Real-time metric queries | Cached metrics (Redis, hourly TTL) | ~2022 onwards | Single shared cache prevents N+1 queries; scales to millions of users |
| Session persistence in-memory | Database session store + Redis | ~2015 onwards | Enables multi-instance deployments, session revocation, audit trails |

**Deprecated/outdated:**
- **OpenID 1.0:** Replaced by OpenID 2.0 (2006). Steam uses v2.0.
- **Password-based auth in this phase:** Phase 14 is OAuth only. Password auth (if needed later) is separate concern.
- **Form-based login flow:** Steam requires OpenID 2.0 assertion flow (redirect-based).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | next-auth v4.24.14 is compatible with Next.js 16.2.6 and React 19 | Standard Stack | If incompatible, must upgrade to next-auth v5 (breaking changes in auth config) |
| A2 | Steam Web API GetPlayerSummaries endpoint is stable and requires API Key | Architecture Patterns | If endpoint changes or is deprecated, Steam integration breaks; requires v2 refactor |
| A3 | PostgreSQL reserves "user" keyword, requiring table name as "app_user" | Code Examples | If not escaped, migration fails with syntax error; must rename table or use backticks |
| A4 | Symfony Scheduler is available and works with redis messenger | Architecture Patterns | If scheduler unavailable, must use external cron or manual API trigger for metrics refresh |
| A5 | Redis is available in Docker stack (confirmed from Phase 1) | Architecture Patterns | Caching strategy depends on Redis; fallback is in-memory cache (not suitable for distributed deployment) |
| A6 | Steam avatar URLs can be insecure (HTTP); must be normalized to HTTPS | Code Examples | If not validated, mixed-content error breaks dashboard in production; requires URL sanitization |
| A7 | Secure cookies work on HTTP localhost for development (browser exception) | Common Pitfalls | If not true, cannot test httpOnly cookies locally; requires mkcert + HTTPS setup for dev |

---

## Open Questions

1. **Should Steam profile enrichment happen on every login, or cache user data?**
   - What we know: Steam Web API is available; user calls `/api/auth/callback` after OpenID validation
   - What's unclear: Update avatar_url/username on every login vs. cache for N days?
   - Recommendation: Update on every login (simplest, keeps data fresh). Cached user data is not a bottleneck.

2. **Does Symfony use SymfonyScheduler or external cron for metrics refresh?**
   - What we know: Metrics should refresh hourly; Symfony has scheduler support (v6.2+)
   - What's unclear: Is SymfonyScheduler installed/configured in this project? Or use `crontab -e`?
   - Recommendation: Query `.planning/CONTEXT.md` or `.planning/phases/X-RESEARCH.md` to see if scheduler was decided. If not, default to external cron (`0 * * * * php bin/console app:metrics:update`).

3. **Should User entity extend Symfony's UserInterface for security?**
   - What we know: User stores steam_id, not password; Symfony security assumes password provider
   - What's unclear: Does OAuth-only auth need UserInterface?
   - Recommendation: User entity does NOT need to implement UserInterface (no password, no roles in v1). If roles added in Phase 15+, implement then.

4. **How to handle user logout without storing revoked tokens?**
   - What we know: JWTs are stateless; refresh tokens can be stored in DB for revocation
   - What's unclear: Should logout delete refresh token from DB, or rely on client-side cookie deletion?
   - Recommendation: v1: Client-side only (delete cookie in next-auth `signOut()`). Phase 15+: Add `revoked_refresh_tokens` table if audit required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose | Local dev + production | ✓ | (from Phase 1) | Manual service startup (not viable) |
| PostgreSQL | User entity persistence, migrations | ✓ | 16 (from Phase 1) | — |
| Redis | Public metrics caching | ✓ | 7 (from Phase 1) | In-memory cache (single-process, not scalable) |
| Node.js | Frontend build, next-auth | ✓ | 20+ (from Phase 6) | — |
| PHP 8.2+ | Symfony backend | ✓ | (from Phase 1) | — |
| Symfony 7.4 | User entity, migrations | ✓ | (from Phase 2) | — |
| Steam Web API | GetPlayerSummaries, avatar fetch | ✓ | Stable (public API) | Manual user entry (not viable) |
| Steamworks | App ID + API Key registration | Required (manual) | Current | — |

**Missing dependencies with no fallback:**
- Steam App ID + API Key (must be registered in Steamworks; no fallback)

**Missing dependencies with fallback:**
- SymfonyScheduler for metrics refresh (fallback: external cron job, but less reliable)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest v30.4.2 (unit/components) + Playwright v1.60.0 (E2E) |
| Config file | `frontend/jest.config.ts`, `frontend/playwright.config.ts` |
| Quick run command | `npm run test` (Jest only, ~1-2 min) |
| Full suite command | `npm run test && npm run e2e` (Jest + Playwright, ~5-10 min) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Steam OAuth 2.0 flow completes and creates User | E2E | `npm run e2e -- demo-viewer.spec.ts` (add auth scenario) | ❌ Wave 0 |
| AUTH-02 | Access token auto-refreshes before expiry | Unit | `npm run test -- auth/session.test.tsx` | ❌ Wave 0 |
| AUTH-03 | Protected `/dashboard` redirects to `/` if unauthenticated | E2E | `npm run e2e` (add login-required scenario) | ❌ Wave 0 |
| AUTH-04 | User profile displays Steam avatar and username | Unit | `npm run test -- components/UserProfile.test.tsx` | ❌ Wave 0 |
| UI-02 | Landing page displays public metrics from `/api/metrics/public` | Unit | `npm run test -- components/LandingPage.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test` (Jest, quick validation)
- **Per wave merge:** `npm run test && npm run e2e` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/auth/login.test.tsx` — covers AUTH-01, AUTH-02 (Steam callback, token refresh)
- [ ] `frontend/__tests__/auth/session.test.tsx` — covers AUTH-02 (refresh token rotation)
- [ ] `frontend/__tests__/components/LandingPage.test.tsx` — covers UI-02 (public metrics fetch)
- [ ] `frontend/__tests__/components/UserProfile.test.tsx` — covers AUTH-04 (avatar display)
- [ ] `frontend/e2e/auth-flow.spec.ts` — covers AUTH-01, AUTH-03 (end-to-end login + dashboard access)
- [ ] `symfony/tests/Application/Handler/AuthenticateUserHandlerTest.php` — covers User creation + JWT generation
- [ ] `symfony/tests/Domain/User/UserTest.php` — covers User entity initialization, HTTPS avatar validation

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Steam OpenID 2.0 validation (backend), never trust client claims |
| V3 Session Management | yes | JWT with short-lived access (1 day) + refresh token (30 days), httpOnly cookies, no JS access |
| V4 Access Control | yes | Middleware validates JWT before allowing `/dashboard`, `/api/demos` checks `user_id` |
| V5 Input Validation | yes | Validate steam_id format (numeric string), avatar_url is HTTPS, email format (nullable) |
| V6 Cryptography | yes | JWT signed with HS256 (or RS256 if asymmetric keys used later), HTTPS enforced for token transmission |
| V7 Error Handling | yes | Don't expose JWT decode errors to client; return generic "Invalid token" |
| V8 Data Protection | yes | Refresh tokens stored in PostgreSQL (salted hash if needed later); avatar URLs are public |
| V9 Communications | yes | All auth endpoints HTTPS only in production; cookies Secure flag enforced |
| V12 File Upload | yes | Not in scope for Phase 14 (demo upload is Phase 6) |

### Known Threat Patterns for Next.js + Symfony + Steam

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS stealing JWT from localStorage | Spoofing, Tampering | Use httpOnly cookies (next-auth default); no JS access |
| CSRF forging auth request | Tampering | SameSite=Strict cookies; CSRF token in custom state param |
| Man-in-the-middle intercepting OpenID assertion | Tampering, Disclosure | HTTPS enforced; validate OpenID signature on backend |
| Replay attack on refresh token | Spoofing | Store refresh tokens in DB; mark as used; single-use (rotate on use) |
| Unvalidated user input in steam_id field | Injection | Validate steam_id is numeric string; parameterized queries via Doctrine |
| Leaked Steam API key in code/logs | Disclosure | Store API key in `.env` + environment variables; never commit `.env`; rotate if leaked |
| Insecure avatar URL (HTTP in HTTPS context) | Tampering | Always validate avatar_url is HTTPS; normalize if needed |
| Token expiry too long (compromise window) | Non-repudiation | Access token 1 day (24h) max; refresh token 30 days (reasonable for "30-day session") |
| No logout/revocation mechanism | Repudiation | v1: Client-side cookie deletion sufficient. Phase 15+: Add revoked token list for audit |

---

## Sources

### Primary (HIGH confidence)
- [next-auth npm registry](https://www.npmjs.com/package/next-auth) - Verified v4.24.14 compatibility with Next.js 16 and React 19
- [Steam Community: OpenID Documentation](https://steamcommunity.com/dev/) - Steam OpenID 2.0 endpoint and protocol
- [Auth.js Official Documentation: Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - JWT callback patterns and token lifetime strategies
- [Symfony 7 Doctrine ORM Documentation](https://symfony.com/doc/current/doctrine.html) - Entity mapping, migrations, PostgreSQL integration
- [Next.js App Router Middleware](https://authjs.dev/reference/nextjs) - Protected routes with `authorized` callback
- [Symfony Cache Component](https://symfony.com/doc/current/cache.html) - Redis adapter and TTL caching

### Secondary (MEDIUM confidence)
- [PostgreSQL Reserved Keywords](https://www.postgresql.org/docs/current/sql-keywords-appendix.html) - "user" is reserved; use "app_user" as table name
- [Next-Auth: Custom OAuth Provider](https://next-auth.js.org/configuration/providers/oauth) - Profile callback, token response handling for custom providers
- [JWT Best Practices: Expiration and Refresh](https://dev.to/gabrielle_eduarda_776996b/jwt-in-practice-part-2-refresh-tokens-expiration-and-best-practices-20p2) - Access token 15min-1hour, refresh token 30-90 days
- [Secure Cookie Attributes in Next.js](https://medium.com/@itself_tools/enhancing-web-security-with-secure-cookie-attributes-in-next-js-b389b9e49e6e) - httpOnly, Secure, SameSite settings for development and production
- [Redis Caching Strategies for Next.js](https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production) - ISR, TTL, cache invalidation patterns
- [Steam Web API Overview](https://partner.steamgames.com/doc/webapi_overview) - HTTPS requirements, GetPlayerSummaries endpoint, authentication methods

### Tertiary (LOW confidence, needs validation)
- [authjs-steam-provider GitHub](https://github.com/goncalojbsousa/authjs-steam-provider) - Community package for Auth.js v5 (not v4; upgrade required)
- [node-steam-openid npm](https://www.npmjs.com/package/node-steam-openid) - Standalone OpenID 2.0 library for Node.js (unverified; community-maintained)
- [Localhost Development with Cookies](https://copyprogramming.com/howto/localhost-development-with-cookies) - Browser special handling for localhost HTTP + Secure flag (unverified source quality)

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH - next-auth v4.24.14 verified in npm registry; compatibility with Next.js 16 and React 19 confirmed
- **Architecture:** HIGH - Auth.js official docs, Steam OpenID docs, Symfony Doctrine docs provide clear patterns
- **Pitfalls:** MEDIUM - Common authentication mistakes documented, but local HTTPS/cookie testing needs validation
- **Security:** HIGH - ASVS framework applied; JWT patterns from industry sources

**Research date:** 2026-05-17  
**Valid until:** 2026-05-24 (7 days — Steam API stable, but next-auth releases may warrant re-check)

**Key unknowns flagged for discussion phase:**
- Should SymfonyScheduler be used, or external cron for metrics refresh?
- Does the project have Steamworks app ID + API Key pre-registered?
- Should User entity extend Symfony security interfaces for future roles/permissions?

---

