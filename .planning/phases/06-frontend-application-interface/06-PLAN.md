---
phase: 06-frontend-application-interface
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/Dockerfile
  - frontend/.env.local
  - frontend/package.json
  - frontend/tsconfig.json
  - frontend/next.config.ts
  - frontend/tailwind.config.ts
  - frontend/jest.config.ts
  - frontend/jest.setup.ts
  - frontend/playwright.config.ts
  - docker-compose.yml
autonomous: true
requirements: [UI-01]

must_haves:
  truths:
    - "Frontend service builds and runs in Docker Compose alongside Symfony API"
    - "Next.js dev server accessible at http://localhost:3000 locally"
    - "Environment variables configured (NEXT_PUBLIC_API_URL pointing to Symfony API)"
    - "Tailwind CSS + shadcn/ui components available for use"
    - "Jest + React Testing Library setup for unit tests"
    - "Playwright configured for E2E tests"
    - "Sentry error tracking initialized"
    - "TypeScript configuration strict and type-safe"
  artifacts:
    - path: "frontend/Dockerfile"
      provides: "Multistage Docker build for Next.js (dev and production)"
      min_lines: 25
    - path: "docker-compose.yml"
      provides: "Next.js service configuration"
      contains: "next-app"
    - path: "frontend/next.config.ts"
      provides: "Next.js configuration (standalone mode, Sentry, build settings)"
      exports: ["output: 'standalone'"]
    - path: "frontend/tailwind.config.ts"
      provides: "Tailwind CSS configuration with shadcn/ui preset"
      contains: "preset"
    - path: "frontend/jest.config.ts"
      provides: "Jest test runner configuration"
      contains: "jsdom"
    - path: "frontend/playwright.config.ts"
      provides: "Playwright E2E test configuration"
      contains: "baseURL"
  key_links:
    - from: "frontend app"
      to: "Symfony API"
      via: "NEXT_PUBLIC_API_URL environment variable"
      pattern: "http://(symfony|localhost)"
    - from: "Jest + React Testing Library"
      to: "test utilities"
      via: "jest.setup.ts global mocks"
      pattern: "jest.mock|setupFilesAfterEnv"
    - from: "Playwright"
      to: "local Next.js dev server"
      via: "baseURL in playwright.config.ts"
      pattern: "baseURL.*3000"
---

<objective>
Initialize the Next.js frontend application with complete development and production infrastructure. This plan sets up the project structure, build tools, testing frameworks, and Docker integration so feature development can begin in subsequent plans. Covers initialization of Next.js with App Router, shadcn/ui component library, Tailwind CSS v4, TanStack React Query, testing infrastructure (Jest + Playwright), Sentry error tracking, and Docker Compose integration.

Purpose: Establish a production-ready foundation for UI development without building features yet. Unblock feature teams by providing a working dev environment and confirmed API contract.

Output: Fully initialized frontend project in `./frontend/` with all build tools, test runners, and infrastructure code ready. Docker Compose runs frontend + backend stack with a single command. Project structure, configs, and example components follow Next.js 16+ App Router best practices.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/06-frontend-application-interface/06-CONTEXT.md
@.planning/phases/06-frontend-application-interface/06-UI-SPEC.md
@.planning/phases/06-frontend-application-interface/06-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize Next.js project with TypeScript, Tailwind, and shadcn/ui</name>
  <files>
    frontend/package.json
    frontend/tsconfig.json
    frontend/next.config.ts
    frontend/tailwind.config.ts
    frontend/.eslintrc.json
    frontend/app/layout.tsx
    frontend/app/page.tsx
  </files>
  <action>
    Initialize a new Next.js 16.x project using create-next-app with TypeScript, Tailwind CSS, and ESLint enabled. Use the App Router preset (--app flag). After initialization, run `npx shadcn-ui@latest init --new-york --base-color-mode light` to set up shadcn/ui component library. Update tsconfig.json to enable strict mode (`strict: true`) and configure paths for `@/` imports. Create minimal root layout.tsx with html/body structure and app/page.tsx with "Upload" page placeholder. Install additional dependencies per 06-RESEARCH.md Standard Stack: @tanstack/react-query, axios, react-hook-form, zod, lucide-react, @sentry/nextjs. Create .env.local with NEXT_PUBLIC_API_URL=http://localhost/api (default for local dev against Symfony).
    
    Reference: Per D-02 (API Contract from UI-SPEC.md), the frontend must target the Symfony backend's /api endpoints. Per D-07 (Separate Docker service), the frontend runs independently but must reach the backend via environment variable.
  </action>
  <verify>
    <automated>
      npm install && npm run build --prefix ./frontend 2>&1 | grep -q "Successfully compiled" || npm run build --prefix ./frontend 2>&1 | grep -q "✓ Creating .next" && grep -q "NEXT_PUBLIC_API_URL" ./frontend/.env.local && test -f ./frontend/next.config.ts && test -f ./frontend/tsconfig.json && grep -q '"strict": true' ./frontend/tsconfig.json
    </automated>
  </verify>
  <done>
    Next.js project builds successfully. TypeScript strict mode enabled. Tailwind CSS and shadcn/ui initialized and components discoverable. Required dependencies installed (React Query, axios, React Hook Form, Zod, Lucide, Sentry). .env.local configured with API URL. Project structure follows Next.js 16 App Router conventions.
  </done>
</task>

<task type="auto">
  <name>Task 2: Configure testing infrastructure (Jest, React Testing Library, Playwright)</name>
  <files>
    frontend/jest.config.ts
    frontend/jest.setup.ts
    frontend/__tests__/setup.ts
    frontend/playwright.config.ts
    frontend/e2e/.gitkeep
  </files>
  <action>
    Create jest.config.ts configured for Next.js with jsdom environment, setupFiles pointing to jest.setup.ts, and moduleNameMapper for @ imports. Create jest.setup.ts that imports @testing-library/jest-dom and mocks next/navigation (useRouter, usePathname, useSearchParams). Install test dependencies: @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jest-environment-jsdom, @types/jest. Create playwright.config.ts with baseURL=http://localhost:3000, webServer command pointing to dev server, projects=[chromium], and screenshot/video on failure. Set testDir='./e2e'. Create e2e/ directory with .gitkeep placeholder. Add npm scripts: "test": "jest", "test:watch": "jest --watch", "e2e": "playwright test".
    
    Reference: Per 06-RESEARCH.md Testing section, Jest and Playwright are official Next.js recommendations. Setup includes mock infrastructure for next/navigation used in client components. Per D-05, full test suite is required for production quality (Jest 70-80% coverage, Playwright E2E for core flows).
  </action>
  <verify>
    <automated>
      npm run build --prefix ./frontend && test -f ./frontend/jest.config.ts && test -f ./frontend/jest.setup.ts && test -f ./frontend/playwright.config.ts && grep -q "baseURL.*3000" ./frontend/playwright.config.ts && grep -q '"test":' ./frontend/package.json
    </automated>
  </verify>
  <done>
    Jest and Playwright configurations committed. Mock infrastructure for next/navigation in place. npm test and npm run e2e commands available and executable. Test directory structure created. Project ready for test file creation in subsequent plans.
  </done>
</task>

<task type="auto">
  <name>Task 3: Configure Sentry error tracking and source maps</name>
  <files>
    frontend/instrumentation.ts
    frontend/sentry.config.ts
    frontend/next.config.ts
  </files>
  <action>
    Run `npx @sentry/wizard -i nextjs` to auto-generate Sentry initialization files. Wizard creates instrumentation.ts and updates next.config.ts with source map upload config. Create .env.local entries for Sentry (NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN). Set sensible defaults: release from git commit hash (or 'dev' if not in CI), tracesSampleRate: 0.1 (10% of transactions), replaysSessionSampleRate: 0.1. Ensure Sentry only initializes in production or when DSN is explicitly set. Add initialization code to catch unhandled promise rejections and API errors.
    
    Reference: Per D-06, Sentry integration required for error tracking + performance monitoring. Per 06-RESEARCH.md Sentry Integration, the wizard approach is fastest and most reliable.
  </action>
  <verify>
    <automated>
      test -f ./frontend/instrumentation.ts && grep -q "@sentry/nextjs" ./frontend/instrumentation.ts && grep -q "sentry" ./frontend/next.config.ts && test -f ./frontend/.env.local && grep -q "SENTRY" ./frontend/.env.local
    </automated>
  </verify>
  <done>
    Sentry error tracking initialized. Instrumentation file created and integrated into Next.js build. Source map upload configured in next.config.ts. Environment variables template in .env.local. Sentry is ready to capture errors from client and server.
  </done>
</task>

<task type="auto">
  <name>Task 4: Create Dockerfile with multistage build and add Next.js service to Docker Compose</name>
  <files>
    frontend/Dockerfile
    docker-compose.yml
  </files>
  <action>
    Create frontend/Dockerfile with three stages: (1) dependencies stage (node:20-alpine, npm ci --only=production), (2) builder stage (npm ci with dev deps, npm run build), (3) runner stage (copy .next/standalone, .next/static, public/, set NODE_ENV=production, expose 3000, cmd node server.js). Set output: 'standalone' in next.config.ts to enable lean production images. Add `next-app` service to docker-compose.yml with build context ./frontend/Dockerfile, ports 3000:3000, environment NEXT_PUBLIC_API_URL=http://symfony:80/api (internal Docker DNS), NODE_ENV=development (for local dev), depends_on: [symfony]. Configure CORS in Symfony .env to allow http://localhost:3000 (local dev) and http://next-app:3000 (Docker compose).
    
    Reference: Per D-01 (Deployment & Infrastructure), frontend runs as separate Docker service. Per D-07 (Development Environment), developer runs `docker-compose up` once; both services start. 06-RESEARCH.md Docker section confirms standalone mode reduces image to <500MB.
  </action>
  <verify>
    <automated>
      test -f ./frontend/Dockerfile && grep -q "output: 'standalone'" ./frontend/next.config.ts && grep -q "next-app:" ./docker-compose.yml && grep -q "3000:3000" ./docker-compose.yml && grep -q "NEXT_PUBLIC_API_URL" ./docker-compose.yml && grep -q "symfony" ./docker-compose.yml
    </automated>
  </verify>
  <done>
    Dockerfile created with multistage build optimized for production. Next.js service added to docker-compose.yml with proper environment, networking, and dependencies. Standalone mode enabled in next.config.ts for lean images. Service is ready for `docker-compose up` local development and production deployment.
  </done>
</task>

<task type="auto">
  <name>Task 5: Create directory structure, type definitions, and API client setup</name>
  <files>
    frontend/lib/api.ts
    frontend/lib/types.ts
    frontend/lib/utils.ts
    frontend/lib/hooks/.gitkeep
    frontend/components/ui/.gitkeep
    frontend/components/.gitkeep
    frontend/tests/__mocks__/.gitkeep
  </files>
  <action>
    Create lib/api.ts with Axios instance (baseURL from NEXT_PUBLIC_API_URL, timeout 10s), request/response interceptors for future auth, and endpoint functions: fetchDemoStatus(id), uploadDemo(file, steamMatchId), fetchDemoList(page, limit), deleteDemo(id), downloadDemoUrl(id). Create lib/types.ts with TypeScript interfaces: Demo (id, status: 'pending'|'done'|'error', results?, error_message?, updated_at), AnalysisResult (players[]), Player (steamId, name, overallVerdict, overallScore, features[]), Feature (name, score, interpretation). Create lib/utils.ts with utility functions: formatScore(score: number): string, verdictColor(score: number): string, verdictLabel(score: number): string, formatTimestamp(date: Date): string. Create empty directories for components/ui/, components/, lib/hooks/, and tests/__mocks__/. These placeholders unblock feature development in subsequent plans.
    
    Reference: Per D-02 (API Contract), UI-SPEC.md defines endpoint paths and response shapes. Types must match exactly (status enum, results structure). Per 06-RESEARCH.md, Axios with interceptors is standard; lib/ organization follows Next.js conventions.
  </action>
  <verify>
    <automated>
      test -f ./frontend/lib/api.ts && grep -q "axios.create" ./frontend/lib/api.ts && grep -q "fetchDemoStatus\|uploadDemo\|fetchDemoList\|deleteDemo" ./frontend/lib/api.ts && test -f ./frontend/lib/types.ts && grep -q "interface Demo\|interface AnalysisResult\|interface Player" ./frontend/lib/types.ts && test -f ./frontend/lib/utils.ts && grep -q "formatScore\|verdictColor\|verdictLabel\|formatTimestamp" ./frontend/lib/utils.ts && test -d ./frontend/components/ui && test -d ./frontend/lib/hooks
    </automated>
  </verify>
  <done>
    API client layer established with Axios and type-safe endpoints. TypeScript interfaces match Symfony API response contract. Utility functions for formatting (score, verdict, timestamp) available. Directory structure for components, hooks, and tests in place. Ready for component development.
  </done>
</task>

<task type="auto">
  <name>Task 6: Verify build, test infrastructure, and document setup</name>
  <files>
    frontend/README.md
    frontend/.env.example
  </files>
  <action>
    Run full build and verification: `npm run build --prefix ./frontend` should succeed. Run `npm test --prefix ./frontend -- --passWithNoTests` to verify Jest is configured (should pass with no tests yet). Run `npx playwright --version` to confirm Playwright is installed. Create frontend/README.md documenting: (1) Quick Start (install, env setup, docker-compose up), (2) Development (npm run dev, port 3000), (3) Testing (npm test, npm run e2e), (4) Build (npm run build, output standalone). Create .env.example with template vars (NEXT_PUBLIC_API_URL, SENTRY_* placeholders). Verify tsconfig.json, next.config.ts, tailwind.config.ts, jest.config.ts, playwright.config.ts are all valid and passing linting. Commit all infrastructure code with a message like "init(06-01): setup Next.js frontend infrastructure — Docker, testing, Sentry, TypeScript".
    
    Reference: Per 06-CONTEXT.md §7 (Development Environment), documentation is minimal but clear. Per D-01, Docker integration must be verified to work with Symfony. Per D-05 and D-06, testing and observability are non-negotiable.
  </action>
  <verify>
    <automated>
      npm run build --prefix ./frontend 2>&1 | grep -q "Successfully compiled\|✓ Creating .next" && npm test --prefix ./frontend -- --passWithNoTests 2>&1 | grep -q "Tests:" && test -f ./frontend/README.md && test -f ./frontend/.env.example && grep -q "NEXT_PUBLIC_API_URL" ./frontend/.env.example && npx playwright --version
    </automated>
  </verify>
  <done>
    Frontend infrastructure complete and verified. Build succeeds with standalone output. Jest and Playwright configured and ready for test files. Documentation covers setup, development, testing, and deployment. Environment variables documented in .env.example. All infrastructure code committed. Project ready for feature development (Task 1 of Plan 02).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Next.js Frontend | User-controlled file uploads, form input |
| Next.js → Symfony Backend | API requests for upload, status polling, results download |
| Next.js → Sentry | Error logs, stack traces, performance metrics |
| CDN / Static assets | CSS, JS bundles served from /.next/static (integrity ensured by Next.js build hash) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Tampering | File upload form | Mitigate | Client-side validation (file type, size) with Zod; backend re-validates (Phase 2 already implemented). Never execute uploaded files; parse only demo data. |
| T-06-02 | Information Disclosure | Sentry error logs | Mitigate | Configure Sentry to redact auth tokens, PII, file contents. Use sampling rate 10% (not 100%) to avoid excessive log volume. Only initialize Sentry in production (gated by env check). |
| T-06-03 | Eavesdropping | HTTP in development | Accept | Local dev uses http://localhost — acceptable in dev-only environment. Production uses https:// (enforced by HTTPS-only upstream). |
| T-06-04 | Denial of Service | File upload size | Mitigate | Client-side size check (100MB max in Zod schema). Backend also validates file size (Phase 2). Rate limiting added in v2 if abuse observed. |
| T-06-05 | Elevation of Privilege | No auth system v1 | Accept | Tool is public/research-oriented (stated in PROJECT.md). No authentication required v1. Auth framework added in v2 if needed. |
| T-06-06 | Repudiation | Demo deletions | Mitigate | All deletions logged to Sentry with demoId and timestamp. Backend maintains soft deletes or audit trail (Phase 2 responsibility). |

</threat_model>

<verification>
## Phase 6 Setup Verification

**Critical gates before Plan 02 (Features) can start:**

1. **Build & Infrastructure**
   - [ ] `npm run build --prefix ./frontend` completes without errors
   - [ ] Docker image builds successfully: `docker build -t cs2-frontend ./frontend`
   - [ ] `docker-compose up` starts both Symfony and Next.js services (verify with `curl http://localhost:3000`)

2. **Configuration**
   - [ ] `.env.local` created with `NEXT_PUBLIC_API_URL=http://localhost/api` (or docker network DNS)
   - [ ] `NEXT_PUBLIC_SENTRY_DSN` placeholder ready in `.env.local`
   - [ ] TypeScript strict mode enabled and no errors: `npx tsc --noEmit`

3. **Testing Infrastructure**
   - [ ] Jest configured: `npm test --prefix ./frontend -- --listTests` shows directory structure
   - [ ] Playwright configured: `npx playwright --version` returns version
   - [ ] Mock setup for `next/navigation` confirmed in `jest.setup.ts`

4. **API Contract Alignment**
   - [ ] `lib/types.ts` has Demo, AnalysisResult, Player interfaces matching UI-SPEC.md
   - [ ] `lib/api.ts` endpoints match CONTEXT.md §2 (POST /api/demos, GET /api/demos/{id}, etc.)
   - [ ] No type `any` in interfaces (strict TypeScript enforced)

5. **Documentation**
   - [ ] `README.md` covers: install, env setup, dev server, test commands, Docker
   - [ ] `.env.example` provides template for all required vars

**All gates must PASS before proceeding to Plan 02.**
</verification>

<success_criteria>
## Phase 6 Plan 01 Success

1. **Project Initialization**
   - Next.js 16.x frontend project created with TypeScript, Tailwind CSS v4, shadcn/ui
   - All required dependencies installed (React Query, axios, React Hook Form, Zod, Lucide, Sentry)
   - Build completes without errors

2. **Infrastructure & DevOps**
   - Frontend Dockerfile created with multistage build (dev & production optimized)
   - Next.js service added to docker-compose.yml and verified to run alongside Symfony
   - Environment variables configured (NEXT_PUBLIC_API_URL, Sentry credentials)
   - CORS configured in Symfony to allow frontend requests

3. **Testing Foundation**
   - Jest + React Testing Library configured with jsdom environment
   - Playwright E2E test runner configured with Next.js dev server
   - Mock infrastructure for next/navigation created
   - npm test and npm run e2e commands functional

4. **Type Safety & API Client**
   - TypeScript strict mode enabled
   - Type definitions created (Demo, AnalysisResult, Player, Feature) matching Symfony API contract
   - Axios client configured with error handling and interceptors
   - Utility functions created (formatScore, verdictColor, verdictLabel, formatTimestamp)

5. **Observability**
   - Sentry initialized and configured
   - Source map upload configured in next.config.ts
   - Error capture ready for unhandled exceptions and API errors

6. **Documentation**
   - README.md covers setup, development, testing, deployment
   - .env.example documents all required environment variables
   - Code structure follows Next.js 16 App Router conventions

**Overall:** Frontend infrastructure fully initialized and verified. Development team can build features in Plans 02+ without revisiting setup. Docker Compose runs full stack (Symfony + Next.js) locally. CI/CD ready for testing and deployment.
</success_criteria>

<output>
After completion, create `.planning/phases/06-frontend-application-interface/06-01-SUMMARY.md`

Include:
- Commands run and results (build, test setup verification)
- Docker Compose stack verification (curl localhost:3000, curl localhost:8000/api)
- GitHub commit hash for infrastructure code
- Any manual setup steps required (e.g., Sentry DSN acquisition)
- Notes on next steps (Plan 02 begins feature development)
</output>
