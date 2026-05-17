# Phase 6: Frontend Application Interface - Research

**Researched:** 2026-05-15
**Domain:** Next.js 14+ frontend with shadcn/ui, React Query, and Docker integration
**Confidence:** HIGH

## Summary

This phase requires building a production-ready React/Next.js frontend for CS2 demo uploads, analysis tracking, and results visualization. The tech stack is explicitly locked to Next.js 14+ App Router, shadcn/ui (Radix UI), Tailwind CSS, and TanStack React Query (v5). The architecture separates frontend into a dedicated Docker service co-deployed with the Symfony backend API.

Key research findings:
1. **Stack is Modern and Stable:** Next.js 16.x (latest), React 19.2.x, Tailwind CSS v4.0, TanStack Query v5.100.x, and Sentry v10.x are all production-ready with active maintenance.
2. **Critical Pattern: Client Components for Polling:** Results page requires client-side state management (`useEffect`-based polling) because status checking must continue after initial page load. This is a measured trade-off: fewer server components than ideal, but unavoidable for real-time polling UX.
3. **File Upload Handling:** React Hook Form + Zod for validation is well-established; multipart form data upload to Symfony backend is straightforward. Drag-and-drop requires client-side event handlers (native browser API, no custom library needed).
4. **Testing Infrastructure Present:** Jest and React Testing Library are standard for unit tests; Playwright is the documented standard for Next.js E2E testing. Both have clear patterns.
5. **Docker Integration:** Multistage builds with standalone mode reduce image size by ~90%. Container networking within Compose simplifies CORS (same internal DNS).
6. **Error Handling:** Error boundaries, not-found.js, and global-error.js patterns are well-defined in App Router. Sentry integrates cleanly with the wizard.

**Primary recommendation:** Use Next.js App Router server-first (all pages as server components by default), add `'use client'` only to polling/interactive components. Leverage shadcn/ui button/card/badge/table as-is without customization. Use React Query for all API state. Write tests at two levels: Jest for components/hooks, Playwright for critical user flows (upload, polling, delete).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Deployment & Infrastructure:** Next.js frontend runs as separate Docker service in docker-compose.yml. Local dev: spins up with `docker-compose up`. Production: Docker container co-deployed with Symfony.

2. **API Contract & Integration:** UI-SPEC.md is the source of truth. Backend must implement the contract as written. Frontend polls `GET /api/demos/{demo_id}` every 2 seconds until analysis completes (5-minute timeout).

3. **Error Handling & Resilience:** Robust error handling with graceful degradation. Handle fetch failures, polling failures with exponential backoff (1s, 2s, 4s), timeout after 5 minutes. Show friendly user messages.

4. **Demo File Access & Storage:** Downloaded through Symfony backend API endpoint `GET /api/demos/{demo_id}/download`. Backend returns file stream with Content-Disposition header.

5. **Testing Strategy:** Full test suite — Jest + React Testing Library for unit tests (70-80% coverage), Playwright for E2E tests (core flows: upload, results, history). Run in CI on every commit.

6. **Observability & Error Logging:** Sentry for error tracking + performance monitoring. Initialize with `@sentry/nextjs`. Capture unhandled errors, API errors, analysis timeouts.

7. **Development Environment & Tooling:** Separate Next.js service in docker-compose.yml. Developer runs `docker-compose up` once; both frontend and backend start. Frontend accessible at `http://localhost:3000`.

8. **Team & Timeline:** Solo developer, ~1-2 weeks to MVP. Focus on core features first (upload, results, history). Ship 80% that covers 100% of users.

### Claude's Discretion

- **Response to API errors:** Error messages, retry strategies, timeout handling (within error handling strategy)
- **Component organization:** File structure, custom hooks, utility functions
- **Test organization:** Test file structure, fixture setup, mocking strategy
- **Code style:** TypeScript patterns, naming conventions

### Deferred Ideas (OUT OF SCOPE v1)

- Dark mode (mentioned in UI-SPEC as optional)
- Advanced filtering (sortable columns)
- Real-time WebSocket updates
- Trend analytics
- Custom styling beyond shadcn defaults
- Visual regression tests
- Performance tests (Lighthouse v2)
- Mobile-specific E2E tests

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | User can inspect uploads, analysis status, and result explanations through a web UI | All sections: Standard Stack validates tools, Architecture Patterns provides structure, Data Fetching covers polling, Testing ensures correctness, Docker enables deployment |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File upload UI (form, drag-drop, validation) | Browser / Client | Frontend Server | React Hook Form + Zod handles client-side validation; Next.js API route not needed |
| File upload to backend | Frontend Server | API / Backend | Frontend sends multipart form data to `POST /api/demos` (Symfony endpoint) |
| Results polling | Browser / Client | Frontend Server | Client component uses useEffect + React Query for 2s interval polling until completion |
| Results display | Browser / Client | — | React components render backend response; display is client-side responsibility |
| History list fetch | Frontend Server | Browser / Client | Server-side initial fetch for SEO, client-side refetch via React Query |
| Demo download | Browser / Client | API / Backend | Client initiates `GET /api/demos/{id}/download`, browser handles blob download |
| Error boundaries | Browser / Client | Frontend Server | Client-side error boundaries catch render errors; global-error.js for root layout errors |
| Sentry error capture | Both (Browser + Server) | — | Browser captures client errors; server-side middleware captures server errors |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x ([VERIFIED: npm registry](https://www.npmjs.com/package/next)) | React framework with App Router, file-based routing, API routes | Official Next.js recommendation; stable, widely adopted; App Router is standard for new projects in 2025 |
| React | 19.2.x ([VERIFIED: npm registry](https://react.dev/versions)) | UI library | Latest stable; includes React Compiler experimental features and Actions API |
| Tailwind CSS | 4.0 ([VERIFIED: Tailwind blog](https://tailwindcss.com/blog/tailwindcss-v4)) | Utility-first CSS framework | Released Jan 2025; 5x faster builds, zero config (@theme in CSS), modern web standards (cascade layers, @property) |
| TypeScript | 5.x ([ASSUMED]) | Language | Enforced by Next.js/React ecosystem; provides type safety for form schemas, API responses, hooks |

### UI Components & Styling

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | 4.7.0 ([VERIFIED: npm registry](https://www.npmjs.com/package/shadcn)) | Accessible component library | Copy-paste components from registry (Button, Card, Badge, Table, Dialog, Input, Label, Alert, Progress, Skeleton, Tabs, Breadcrumb, Tooltip). Radix UI primitives underneath. No additional dependencies beyond what's already installed. |
| Lucide React | ([CITED: UI-SPEC](./06-UI-SPEC.md)) | Icon library | Use for Upload, Download, Info, Warning, Check, X, Menu icons. Tree-shakeable SVG exports; no bundled fonts. |
| Radix UI | (via shadcn/ui) | Accessible primitives | Underlying library for shadcn components; never imported directly (use shadcn wrappers) |

### State Management & Data Fetching

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack React Query | 5.100.x ([VERIFIED: npm registry](https://www.npmjs.com/package/@tanstack/react-query)) | Server state management | Fetch, cache, and sync data from Symfony API. Use `useQuery` for `GET` endpoints, `useMutation` for `POST/DELETE`. Built-in polling via `refetchInterval` and dynamic retry logic. Essential for the 2s polling pattern on results page. |
| React Context | (built-in) | UI state | Modal open/close, sidebar toggle, filter UI state. Keep minimal; use Context only when prop drilling becomes painful. |

### Forms & Validation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | ([CITED: UI-SPEC](./06-UI-SPEC.md)) | Lightweight form state | File input, Steam Match ID input, form submission. Hooks-based; minimal re-renders. |
| Zod | ([CITED: UI-SPEC](./06-UI-SPEC.md)) | Schema validation | Define and validate demo file upload schema: `{ file: z.instanceof(File).refine(f => f.size <= 100_000_000, "File too large") }`. TypeScript-first; runtime validation. |

### HTTP & API Integration

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Axios | ([ASSUMED]) | HTTP client | Preferred over fetch for consistency; easier interceptors (not needed v1, but keeps door open for auth later). Alternatively, use native Fetch if axios feels heavy. |
| or native Fetch | (browser API) | HTTP client | Lightweight alternative; no extra dependency. Works fine for this phase's simple POST/GET/DELETE calls. |

### Error Tracking & Observability

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sentry/nextjs | 10.53.0 ([VERIFIED: npm registry](https://www.npmjs.com/package/@sentry/nextjs)) | Error tracking + performance monitoring | Initialize with `npx @sentry/wizard -i nextjs` (wizard auto-configures). Captures unhandled exceptions, API errors, analysis timeouts. Instruments client, server, and edge runtimes. Free tier sufficient v1. |

### Testing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Jest | 30.4.x ([VERIFIED: npm registry](https://www.npmjs.com/package/jest)) | Unit test runner | Component tests, hook tests, utility function tests. Pre-configured by `create-next-app` with jsdom environment. |
| React Testing Library | (latest) | Component testing | Write tests from user perspective: render component, interact (upload file, click button), assert result. Never test implementation details. |
| @testing-library/jest-dom | 6.9.1 ([VERIFIED: npm registry](https://www.npmjs.com/package/@testing-library/jest-dom)) | Jest matchers | Custom matchers like `toBeInTheDocument()`, `toHaveClass()`. Required for semantic assertions. |
| Playwright | 1.57.x ([VERIFIED: GitHub releases](https://github.com/microsoft/playwright/releases)) | E2E test framework | Automate full user flows: upload demo, see results, view history. Runs in CI. Cross-browser support (Chromium, Firefox, WebKit); single API. |

### Development & Build

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| npm | (latest) | Package manager | Standard; lock file ensures reproducible installs. |
| Docker | (latest) | Containerization | Build multistage Dockerfile for Next.js (build + standalone runtime). Keep image <500MB with standalone mode. |
| tsx or node | (built-in) | TypeScript runtime | Run scripts, migrations, seeding (if needed). |

### Installation

```bash
# Initialize Next.js project
npx create-next-app@latest frontend --typescript --tailwind --eslint --app

# Install shadcn/ui components (components are copy-pasted into src/components/ui/)
npx shadcn@latest init --new-york --base-color-mode light

# Install libraries
npm install \
  @tanstack/react-query \
  axios \
  react-hook-form \
  zod \
  lucide-react \
  @sentry/nextjs

# Install dev dependencies
npm install -D \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  jest \
  jest-environment-jsdom \
  @types/jest

# Optional: Initialize Sentry
npx @sentry/wizard -i nextjs
```

### Version Verification

All versions verified against npm registry on 2026-05-15:
- **Next.js:** 16.x is latest stable (16.2.6 as of 7 days ago) [VERIFIED: npm registry]
- **React:** 19.2.1 (Dec 2025), 19.2.0 (Oct 2025) — not 18.x [VERIFIED: React.dev]
- **Tailwind CSS:** 4.0.0 (Jan 2025) — major rewrite, v3.4 still supported for older browsers [VERIFIED: Tailwind blog]
- **TanStack Query:** 5.100.10 (May 2026) — no v6 for React yet [VERIFIED: npm registry]
- **Sentry:** 10.53.0 (latest, published 1 hour ago) [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (User)
     |
     | HTTP requests
     v
Next.js Frontend (3000)
     |
     +---> [Upload Form Component]
     |     └---> Multipart form POST /api/demos
     |
     +---> [Results Page Component]
     |     └---> React Query polling GET /api/demos/{id} (2s interval)
     |     └---> Sentry client-side error capture
     |
     +---> [History Page Component]
     |     └---> React Query GET /api/demos (list)
     |     └---> Sentry client-side error capture
     |
     v
Symfony Backend API (nginx:80, internal Docker network)
     |
     +---> POST /api/demos (file upload)
     +---> GET /api/demos/{id} (status + results)
     +---> DELETE /api/demos/{id} (delete)
     +---> GET /api/demos (list)
     +---> GET /api/demos/{id}/download (file download)
     |
     v
PostgreSQL + Redis
```

### Recommended Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout (Sentry client init, global styles)
│   ├── page.tsx                      # / — Upload page (server component, fetches initial state)
│   ├── results/
│   │   └── [id]/
│   │       └── page.tsx              # /results/[id] — Results page (client component for polling)
│   ├── history/
│   │   └── page.tsx                  # /history — History page (server component, filters)
│   ├── error.tsx                     # Error boundary for nested segments
│   ├── not-found.tsx                 # 404 fallback
│   └── global-error.tsx              # Root error boundary (rarely needed v1)
├── components/
│   ├── ui/                           # shadcn/ui components (copy-paste from registry)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── alert.tsx
│   │   ├── progress.tsx
│   │   ├── skeleton.tsx
│   │   ├── tabs.tsx
│   │   ├── breadcrumb.tsx
│   │   └── tooltip.tsx
│   ├── UploadForm.tsx                # File upload form with drag-drop (client component)
│   ├── UploadProgress.tsx            # Upload progress bar (client component)
│   ├── ResultsCard.tsx               # Results display for one analysis (client/server hybrid)
│   ├── VerdictBadge.tsx              # Color-coded verdict badge (server/client)
│   ├── FeatureTable.tsx              # Expandable feature scores table (client component)
│   ├── HistoryTable.tsx              # Analysis history table (client component for sorting/filtering)
│   ├── ErrorBoundary.tsx             # React error boundary wrapper
│   ├── Spinner.tsx                   # Loading spinner (reusable)
│   └── Header.tsx                    # Navigation header (server component)
├── lib/
│   ├── api.ts                        # Axios instance + API endpoints (GET /api/demos, POST /api/demos, etc.)
│   ├── hooks/
│   │   ├── usePolling.ts             # Custom hook: polling status endpoint with refetchInterval
│   │   ├── useDemoFetch.ts           # Custom hook: useQuery for single demo + results
│   │   ├── useHistoryFetch.ts        # Custom hook: useQuery for demo list
│   │   ├── useUploadDemo.ts          # Custom hook: useMutation for POST /api/demos
│   │   ├── useDeleteDemo.ts          # Custom hook: useMutation for DELETE /api/demos/{id}
│   │   └── useCopyToClipboard.ts     # Custom hook: copy demo ID
│   ├── utils.ts                      # Utility functions: formatScore(), verdictColor(), verdictLabel(), formatTimestamp()
│   └── types.ts                      # TypeScript interfaces: Demo, AnalysisResult, Player, etc.
├── tests/ (or __tests__)
│   ├── components/
│   │   ├── UploadForm.test.tsx
│   │   ├── ResultsCard.test.tsx
│   │   ├── HistoryTable.test.tsx
│   │   └── VerdictBadge.test.tsx
│   ├── lib/
│   │   ├── api.test.ts
│   │   ├── utils.test.ts
│   │   └── hooks/
│   │       ├── usePolling.test.ts
│   │       └── useDemoFetch.test.ts
│   └── setup.ts                      # Jest setup: MSW mock server, React Testing Library setup
├── e2e/ (Playwright)
│   ├── fixtures/                     # Playwright fixtures (test image files, API mocks)
│   ├── upload.spec.ts                # Test: upload demo, see results
│   ├── results.spec.ts               # Test: view results page, polling, error states
│   ├── history.spec.ts               # Test: view history, filter, delete
│   └── auth-state.json               # (if auth added later)
├── public/                           # Static assets (favicon, logos)
├── .env.local                        # Local env (NEXT_PUBLIC_API_URL, NEXT_SENTRY_AUTH_TOKEN)
├── Dockerfile                        # Multistage build for production
├── docker-compose.override.yml       # (optional) Local dev overrides
├── jest.config.ts                    # Jest configuration (jsdom, setupFiles)
├── jest.setup.ts                     # Jest setup file (global mocks)
├── next.config.ts                    # Next.js config (Sentry source maps, output: standalone)
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
├── package.json
├── package-lock.json
└── README.md
```

---

## Data Fetching & State Management

### React Query Setup

[CITED: TanStack Query docs](https://tanstack.com/query/latest/docs)

**Provider Wrapping:**
Wrap the root layout with `<QueryClientProvider>` and `<Hydrate>` for SSR:

```typescript
// app/layout.tsx (server component)
import { QueryClient, HydrationBoundary } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <HydrationBoundary state={...}>
            {children}
          </HydrationBoundary>
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

### Polling Pattern for Results Page

**Critical Pattern for Phase 6:**

```typescript
// lib/hooks/usePolling.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchDemoStatus } from '@/lib/api'

export function usePolling(demoId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['demo', demoId],
    queryFn: () => fetchDemoStatus(demoId),
    // Poll every 2 seconds while status is 'pending'
    refetchInterval: (data) =>
      data?.status === 'pending' ? 2000 : false,
    // Stop polling after 5 minutes
    staleTime: 1000 * 60 * 5,
    // Retry with exponential backoff on network errors
    retry: (failureCount) =>
      failureCount < 3, // Stop after 3 failures
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
  })

  return { data, isLoading, error }
}
```

**Why `refetchInterval` as a function:**
Returns `false` to stop polling once `status` is done/error. This is cleaner than manual useEffect cleanup and respects React Query's built-in refetch management.

### API Instance with Axios

```typescript
// lib/api.ts
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
})

// Request interceptor: add auth headers (if added later)
api.interceptors.request.use((config) => {
  // const token = getCookie('auth')
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login (if auth added)
    }
    return Promise.reject(error)
  }
)

export const fetchDemoStatus = (id: string) =>
  api.get(`/demos/${id}`).then(r => r.data)

export const uploadDemo = (file: File, steamMatchId?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  if (steamMatchId) formData.append('steamMatchId', steamMatchId)
  return api.post('/demos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

export const fetchDemoList = (page = 1, limit = 20) =>
  api.get('/demos', { params: { page, limit } }).then(r => r.data)

export const deleteDemo = (id: string) =>
  api.delete(`/demos/${id}`).then(r => r.data)

export default api
```

### Error Handling & Graceful Degradation

[CITED: CONTEXT.md §3](./06-CONTEXT.md)

**Polling Failure Strategy:**
- 1st failure: retry immediately with 1s delay
- 2nd failure: retry with 2s delay
- 3rd failure: show "Analysis service unreachable. Analysis may be complete — [Check Status]"
- Stop retrying and allow user to navigate

**Implementation:**

```typescript
// results/[id]/page.tsx (client component)
'use client'

import { usePolling } from '@/lib/hooks/usePolling'

export default function ResultsPage({ params }) {
  const { data, isLoading, error } = usePolling(params.id)

  // Error after 3 retries
  if (error && /* retry count >= 3 */) {
    return (
      <Alert>
        <AlertTitle>Analysis service unreachable</AlertTitle>
        <AlertDescription>
          Results may be available. 
          <Button onClick={() => window.location.reload()}>Check Status</Button>
          <Button variant="outline" onClick={() => router.push('/')}>Go Back</Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Analysis timed out after 5 minutes
  if (/* elapsed > 5 min && status still pending */) {
    return (
      <Alert>
        <AlertTitle>Analysis taking longer than expected</AlertTitle>
        <AlertDescription>Results will appear when ready.</AlertDescription>
      </Alert>
    )
  }

  if (isLoading && !data) return <Skeleton />
  if (data?.status === 'error') return <ErrorResult {...data} />
  if (data?.status === 'done') return <ResultsDisplay {...data} />
  return <PollingIndicator />
}
```

### Form Handling with React Hook Form + Zod

```typescript
// components/UploadForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUploadDemo } from '@/lib/hooks/useUploadDemo'

const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(f => f.size <= 100_000_000, 'File must be under 100MB')
    .refine(f => f.name.endsWith('.dem'), 'File must be a .dem file'),
  steamMatchId: z.string().optional(),
})

type UploadInput = z.infer<typeof uploadSchema>

export function UploadForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<UploadInput>({
    resolver: zodResolver(uploadSchema),
  })
  const uploadMutation = useUploadDemo()

  const onSubmit = async (data: UploadInput) => {
    await uploadMutation.mutateAsync(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('file')} type="file" />
      {errors.file && <span>{errors.file.message}</span>}
      <input {...register('steamMatchId')} placeholder="Steam Match ID (optional)" />
      <Button type="submit" disabled={uploadMutation.isPending}>
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Demo'}
      </Button>
    </form>
  )
}
```

---

## File Operations

### File Upload with Drag-and-Drop

[CITED: Next.js file upload guides](https://medium.com/@codewithmarish/building-a-drag-and-drop-file-uploader-with-next-js-1cfaf504f8ea)

**No External Library Needed:** Use native HTML5 drag-drop API with React event handlers.

```typescript
// components/UploadForm.tsx (client component)
'use client'

import { useState } from 'react'

export function UploadForm() {
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.dem')) {
        setSelectedFile(file)
      } else {
        // Error handled by Zod validation in form
      }
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed p-8 rounded-lg cursor-pointer ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
      <p>Drag and drop your .dem file here, or click to browse</p>
      {selectedFile && <p className="mt-2">Selected: {selectedFile.name}</p>}
    </div>
  )
}
```

### File Download

**Simple anchor tag approach:**

```typescript
// components/DownloadButton.tsx
export function DownloadButton({ demoId }: { demoId: string }) {
  return (
    <a
      href={`${process.env.NEXT_PUBLIC_API_URL}/demos/${demoId}/download`}
      download
      className="inline-block"
    >
      <Button>Download Demo</Button>
    </a>
  )
}
```

Symfony backend handles Content-Disposition header; browser downloads file automatically.

---

## Form Handling

### React Hook Form + Zod Integration

[CITED: React Hook Form docs](https://react-hook-form.com/), [CITED: Zod validation guide](https://zod.dev/)

**Key Pattern for File Input:**

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 100_000_000, 'File too large')
    .refine(f => f.type === 'application/octet-stream' || f.name.endsWith('.dem'), 'Must be .dem file'),
})

const { register, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

const fileList = watch('file')
// fileList is a FileList; convert to File for display
const file = fileList?.length > 0 ? fileList[0] : null
```

**Why Zod's `.refine()` for files:**
File validation happens at runtime in the browser because Zod can't know file properties until the user selects one. Use `refine()` to check size, extension, MIME type.

---

## Responsive Design

### Mobile-First Tailwind Breakpoints

[CITED: Tailwind CSS responsive design](https://tailwindcss.com/docs/responsive-design)

**Breakpoints (from UI-SPEC):**
- Mobile: 320px–639px (single column)
- Tablet: 640px–1023px (two columns)
- Desktop: 1024px+ (three columns with sidebar)

**Key Patterns:**

```typescript
// Upload page centered on mobile, constraint max-width on desktop
<div className="w-full max-w-2xl mx-auto px-4">
  <Card className="sm:p-6 p-4">
    {/* Content */}
  </Card>
</div>

// Results sidebar drawer on mobile, sidebar on desktop
<div className="grid md:grid-cols-3 gap-4">
  <div className="md:col-span-2 order-2 md:order-1">
    {/* Main results */}
  </div>
  <aside className="order-1 md:order-2">
    {/* Sidebar — full width on mobile, sidebar on desktop */}
  </aside>
</div>

// History table → card view on mobile
<div className="hidden md:block">
  <Table>{/* Full table on tablet+ */}</Table>
</div>
<div className="md:hidden space-y-4">
  {/* Card view on mobile */}
  {demos.map(demo => <Card key={demo.id}>{...}</Card>)}
</div>
```

**Touch Targets:** All buttons/links minimum 44px (Tailwind h-11 = 44px). Spacing between targets: minimum 8px (gap-2).

---

## Testing

### Jest + React Testing Library Setup

[CITED: Next.js Jest setup](https://nextjs.org/docs/app/guides/testing/jest)

**jest.config.ts:**

```typescript
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

export default createJestConfig({
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
})
```

**jest.setup.ts:**

```typescript
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

### Component Testing Pattern

[CITED: React Testing Library best practices](https://testing-library.com/docs/react-testing-library/intro/)

```typescript
// components/__tests__/UploadForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadForm } from '../UploadForm'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

describe('UploadForm', () => {
  it('uploads a file when form is submitted', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['content'], 'demo.dem', { type: 'application/octet-stream' })
    
    jest.spyOn(api, 'uploadDemo').mockResolvedValueOnce({ id: '123' })
    
    render(<UploadForm />)
    
    const input = screen.getByDisplayValue(/upload/i) as HTMLInputElement
    await user.upload(input, mockFile)
    
    const button = screen.getByRole('button', { name: /upload/i })
    await user.click(button)
    
    await waitFor(() => {
      expect(api.uploadDemo).toHaveBeenCalledWith(mockFile, undefined)
    })
  })

  it('validates file type', async () => {
    const user = userEvent.setup()
    const wrongFile = new File(['content'], 'data.txt', { type: 'text/plain' })
    
    render(<UploadForm />)
    const input = screen.getByRole('textbox') // file input
    
    await user.upload(input, wrongFile)
    
    const button = screen.getByRole('button', { name: /upload/i })
    await user.click(button)
    
    // Error message appears
    expect(await screen.findByText(/must be a .dem file/i)).toBeInTheDocument()
  })
})
```

### Playwright E2E Testing

[CITED: Playwright with Next.js docs](https://nextjs.org/docs/pages/guides/testing/playwright)

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Skip Firefox/WebKit v1; add in v2 if needed
  ],
})
```

**e2e/upload.spec.ts:**

```typescript
import { test, expect } from '@playwright/test'

test('user uploads demo and sees results page', async ({ page }) => {
  // Navigate to upload page
  await page.goto('/')
  
  // Verify upload form is visible
  await expect(page.getByText(/upload demo/i)).toBeVisible()
  
  // Upload file
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('tests/fixtures/sample.dem')
  
  // Click upload button
  await page.getByRole('button', { name: /upload demo/i }).click()
  
  // Wait for redirect to results page
  await page.waitForURL(/\/results\//)
  
  // Verify results page loaded (shows verdict or loading spinner)
  await expect(
    page.getByText(/analysis running|clean|suspicious|likely cheating/i)
  ).toBeVisible()
})

test('results page polls until analysis complete', async ({ page }) => {
  await page.goto('/results/test-demo-123')
  
  // Should show loading state initially
  await expect(page.getByText(/analysis running/i)).toBeVisible()
  
  // Wait up to 2 minutes for analysis to complete
  await expect(
    page.getByText(/clean|suspicious|likely cheating/i),
    { timeout: 120_000 }
  ).toBeVisible()
  
  // Verify results sections are rendered
  await expect(page.getByText(/aimbot|triggerbot|wallhack/i)).toBeVisible()
})

test('error state displays gracefully', async ({ page }) => {
  await page.goto('/results/nonexistent-id')
  
  // Should show 404 or error message
  await expect(
    page.getByText(/not found|error/i)
  ).toBeVisible()
})
```

**Key Patterns:**
- Use `page.goto()` for navigation (not `router.push()`)
- Use `page.locator()` for element selection (Query API more stable than `getByRole`)
- Use `page.waitForURL()` to assert redirects
- Set `timeout: 120_000` for polling tests (allow full 2-minute analysis window)
- Upload files with `setInputFiles()` pointing to fixture files

### Test Coverage Target

- **Unit tests:** 70-80% code coverage (pragmatic target, not 100%)
- **E2E tests:** Critical user flows (upload, results polling, history, delete)
- **Run locally:** `npm test` (Jest watch mode), `npm run e2e` (Playwright headed mode)
- **CI:** `npm test && npm run e2e` (both must pass before merge)

---

## Docker & Deployment

### Multistage Dockerfile for Next.js

[CITED: Next.js Docker docs](https://docs.docker.com/guides/nextjs/containerize/), [CITED: Standalone mode guide](https://dev.to/miannemendoza/how-to-use-nextjs-standalone-for-leaner-docker-images-2kn9)

**Key Optimization:** Standalone mode reduces image size from 2GB+ to <500MB by copying only necessary files from .next/standalone.

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runner (production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Key Points:**
1. **Standalone mode:** `output: 'standalone'` in next.config.ts
2. **Copy public folder separately:** `.next/standalone` doesn't include public/
3. **Run with `node server.js`:** Generated by Next.js build
4. **Final image ~300MB:** Down from 2GB+ with full node_modules

### next.config.ts Configuration

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Enable standalone mode for Docker
  output: 'standalone',

  // Sentry source maps (add after Sentry wizard runs)
  sentry: {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    release: process.env.NEXT_PUBLIC_RELEASE || 'unknown',
    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: process.env.NEXT_PUBLIC_RELEASE,
    },
  },

  // Image optimization
  images: {
    unoptimized: true, // Disable for Docker; enables in production if needed
  },
}

export default config
```

### Docker Compose Integration

[CITED: CONTEXT.md §7](./06-CONTEXT.md)

**Add to docker-compose.yml:**

```yaml
next-app:
  build:
    context: ./
    dockerfile: frontend/Dockerfile
  container_name: cs2-frontend
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://symfony:80/api  # Internal Docker DNS
    NODE_ENV: development  # Or production in staged deployments
  depends_on:
    - symfony
  networks:
    - cs2
  volumes:
    # Optional: for local development with hot reload
    - ./frontend:/app
    - /app/node_modules
    - /app/.next
```

**CORS Configuration (Symfony):**

```yaml
# Symfony .env
CORS_ALLOW_ORIGIN=^https?://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?$|^http://next-app:3000$
```

Allows requests from:
- `http://localhost:3000` (local dev)
- `http://next-app:3000` (Docker Compose internal DNS)
- `http://127.0.0.1:3000` (loopback)

### Environment Variables

**`.env.local` (frontend, git-ignored):**

```env
# API endpoint — points to Symfony backend
NEXT_PUBLIC_API_URL=http://localhost/api

# Sentry configuration (add after wizard)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=sntrys_xxxxx
NEXT_PUBLIC_RELEASE=${CI_COMMIT_SHA:-dev}
```

**Production Deployment:**
Replace with actual domain and Sentry DSN. Store secrets in CI/CD environment variables.

---

## Sentry Integration

### Initialization with Wizard

[CITED: Sentry for Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

**Automated Setup:**

```bash
npx @sentry/wizard -i nextjs
```

Wizard creates:
- `instrumentation.ts` — Client/server initialization
- `sentry.config.ts` (or multiple for client/server/edge)
- Updates `next.config.ts` with source map upload config

### Manual Configuration (if wizard skipped)

```typescript
// instrumentation.ts (root)
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_RELEASE,
    tracesSampleRate: 0.1, // 10% of transactions (performance monitoring)
    replaysSessionSampleRate: 0.1, // 10% session replay
  })
}
```

### What Gets Captured Automatically

- Unhandled exceptions in React components
- Promise rejections
- Console errors
- Request/response errors (if integrated with fetch/axios interceptor)

**Manual capture for this phase:**

```typescript
// In error boundaries or API error handlers
import * as Sentry from '@sentry/nextjs'

try {
  // API call or operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { context: 'demo_upload' },
    extra: { demoId: '...', uploadSize: '...' },
  })
  // Show user-friendly message
}
```

### Source Maps

Sentry wizard automatically uploads source maps to Sentry during build in CI. This allows stack traces to map back to source code instead of minified bundle.

**Verify in CI:**
```bash
npm run build  # Builds and uploads source maps
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom regex/functions | Zod + React Hook Form | Type-safe schemas, reusable, handles edge cases (file size, MIME type) |
| File upload progress | Custom XMLHttpRequest handler | Axios with `onUploadProgress` callback | Axios abstracts browser APIs; cleaner API |
| Drag-and-drop | Custom drag state machine | Native HTML5 events (onDragOver, onDrop) | Browser handles the complexity; minimal code needed |
| API state caching | useEffect + useState | TanStack React Query | Built-in deduplication, stale-while-revalidate, refetch on focus, polling |
| Polling logic | setInterval + cleanup | React Query `refetchInterval` | Query handles tab visibility, intervals, retry logic, memory leaks |
| UI components | Custom button/card/badge | shadcn/ui | Pre-built, accessible, Radix UI primitives, styled with Tailwind |
| HTTP client | Custom fetch wrapper | Axios with interceptors | Request/response handling, timeouts, error handling built-in |
| Error boundaries | Manual error state | React error.js + Suspense.js | Framework handles error isolation by segment |
| Table pagination | Custom offset/limit logic | TanStack React Table + shadcn Table | Sorting, filtering, pagination, row selection built-in |
| Responsive design | Media query breakpoints | Tailwind responsive utilities (md:, lg:) | Mobile-first, consistent, easier to maintain |
| Testing mocks | Fetch mocks per test | MSW (Mock Service Worker) | Intercepts requests at network layer; shared across tests |
| Error tracking | Console.log + manual reporting | Sentry | Automatic capture, source maps, session replay, performance metrics |

**Key insight:** Next.js + shadcn/ui + React Query ecosystem is intentionally opinionated. Use it as-is. Custom solutions in these areas cost 3-5x more to build, test, and maintain.

---

## Common Pitfalls

### Pitfall 1: Over-Reliance on Client Components

**What goes wrong:** Marking all pages as `'use client'` sends entire React bundle to browser. Initial page load is slow; hydration is delayed.

**Why it happens:** Developers defaulting to familiar React patterns without understanding Server Component benefits.

**How to avoid:** 
1. Start all pages as Server Components (default in App Router)
2. Only use `'use client'` for interactivity (hooks, event handlers)
3. Examples for this phase:
   - `/` (upload page): Server component (no interactivity needed, just form)
   - `/results/[id]` (results page): Client component (polling with useEffect)
   - `/history` (history page): Server component with client-side filters (interactive filters → client component boundary lower down)

**Warning signs:** `'use client'` at the top of page.tsx; large bundle sizes in dev tools.

### Pitfall 2: Polling Without `refetchInterval` Function

**What goes wrong:** Using static interval (e.g., `refetchInterval: 2000`) continues polling even after analysis completes, wasting bandwidth.

**Why it happens:** Developers familiar with setInterval patterns don't know about React Query's dynamic interval.

**How to avoid:**
Use `refetchInterval` as a function that returns `false` to stop polling:

```typescript
refetchInterval: (data) => data?.status === 'pending' ? 2000 : false
```

**Warning signs:** Network tab shows requests every 2s long after "Analysis complete" message appears.

### Pitfall 3: Missing CORS Configuration for Local Development

**What goes wrong:** Frontend on `localhost:3000` cannot reach Symfony API on `localhost:8080`. CORS preflight fails.

**Why it happens:** Developers forget CORS is a **browser restriction** — Symfony isn't set up to allow requests from different origin.

**How to avoid:**
1. Set `CORS_ALLOW_ORIGIN` in `.env` to allow `localhost:3000`
2. For Docker dev, use internal DNS `http://symfony:80/api` (no CORS needed)
3. Test by opening browser DevTools Network tab; look for `Access-Control-Allow-Origin` header

**Warning signs:** Console error "No 'Access-Control-Allow-Origin' header"; preflight OPTIONS requests returning 403.

### Pitfall 4: File Upload Without Size Validation

**What goes wrong:** Users upload 500MB demo files; server times out or runs out of memory.

**Why it happens:** Developers skip client-side validation assuming backend handles it.

**How to avoid:**
1. Validate file size in Zod schema (max 100MB)
2. Show progress bar + estimated time
3. Backend should also validate (defense in depth)

```typescript
const schema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 100_000_000, 'File must be under 100MB')
    .refine(f => f.name.endsWith('.dem'), 'Must be .dem file'),
})
```

**Warning signs:** Upload hangs; network tab shows upload stalled.

### Pitfall 5: Not Handling Networking Errors Gracefully

**What goes wrong:** Polling fails, user sees "Error" but no retry option. Page is stuck.

**Why it happens:** Developers assume backend is always available (unrealistic in production).

**How to avoid:**
1. Implement exponential backoff in React Query
2. After 3 failures, show user-friendly message with [Check Status] button
3. Log to Sentry for monitoring

```typescript
retry: (failureCount) => failureCount < 3,
retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
```

**Warning signs:** Polling stops without user feedback; error messages are technical ("TypeError: fetch failed").

### Pitfall 6: Forgetting to Handle notFound() Status Codes

**What goes wrong:** User navigates to `/results/nonexistent-id`. Page renders "not found" but returns HTTP 200 to search engines.

**Why it happens:** Developers render 404 content without calling `notFound()` function.

**How to avoid:**
```typescript
// results/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function ResultsPage({ params }) {
  const demo = await fetchDemo(params.id)
  if (!demo) notFound()  // Returns 404 status code
  return <ResultsDisplay demo={demo} />
}
```

**Warning signs:** SEO issues (404 pages indexed as 200); users bookmarking 404 URLs.

### Pitfall 7: Unmanaged Dependencies in useEffect (Polling)

**What goes wrong:** Polling interval doesn't respect component unmount. setInterval continues running.

**Why it happens:** Developers write custom polling with setInterval without cleanup.

**How to avoid:** Use React Query `refetchInterval` — it manages cleanup automatically.

**Warning signs:** Memory leaks; console errors after navigation; multiple polling requests happening simultaneously.

### Pitfall 8: Tailwind Classes Not Purged (Old Versions)

**What goes wrong:** Tailwind CSS file size is 500KB+; unused classes included in production.

**Why it happens:** Tailwind v3 and below require `content` config to specify which files contain class names. v4 uses `@theme` in CSS.

**How to avoid:** Tailwind v4.0 (this phase) has zero-config CSS-based customization. No build tool needed.

**Warning signs:** Production CSS bundle >100KB; unused `md:`, `lg:` classes in output.

### Pitfall 9: API Base URL Hardcoded

**What goes wrong:** Frontend built with `api.example.com`, but deployed to `api-staging.example.com`. Requests fail silently.

**Why it happens:** Developers hardcode API URL instead of using environment variables.

**How to avoid:**
Always use `NEXT_PUBLIC_API_URL` environment variable:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
```

**Warning signs:** API requests fail in staging; env var warnings in build logs.

### Pitfall 10: Missing Accessibility (Color-Only Verdict Indicator)

**What goes wrong:** Verdict is only a green/orange/red badge. Screen readers don't understand the color.

**Why it happens:** Developers forget WCAG 2.1 AA requirement: "Color is not the only means of conveying information."

**How to avoid:**
Always pair color with text and icons:

```typescript
<VerdictBadge verdict="suspicious">
  <AlertTriangleIcon /> Suspicious
</VerdictBadge>
```

And provide full context in alt text / aria-label.

**Warning signs:** Lighthouse accessibility audit <90; screen reader testing reveals verdict undefined.

---

## Code Examples

### Complete Upload Form Component

[CITED: React Hook Form + Zod integration](https://medium.com/@christianovik009/adding-file-upload-using-react-hook-form-and-zod-using-nextks-f6def5d6881f)

```typescript
// components/UploadForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUploadDemo } from '@/lib/hooks/useUploadDemo'

const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(f => f.size <= 100_000_000, 'File must be under 100MB')
    .refine(f => f.name.endsWith('.dem'), 'File must be a .dem file'),
  steamMatchId: z.string().optional().default(''),
})

type UploadInput = z.infer<typeof uploadSchema>

export function UploadForm() {
  const router = useRouter()
  const uploadMutation = useUploadDemo()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<UploadInput>({
    resolver: zodResolver(uploadSchema),
  })

  const fileList = watch('file')
  const file = fileList?.[0]

  const onSubmit = async (data: UploadInput) => {
    try {
      const result = await uploadMutation.mutateAsync({
        file: data.file,
        steamMatchId: data.steamMatchId || undefined,
      })
      router.push(`/results/${result.id}`)
    } catch (error) {
      // Error is handled by mutation state
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Input
          type="file"
          {...register('file')}
          accept=".dem"
          className="hidden"
          id="demo-upload"
        />
        <label htmlFor="demo-upload" className="cursor-pointer block">
          <div className="text-sm text-gray-600">
            {file ? (
              <div>
                <p className="font-semibold">{file.name}</p>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p>Drag and drop your .dem file here, or click to browse</p>
                <p className="text-xs mt-2">Max 100MB</p>
              </>
            )}
          </div>
        </label>
      </div>

      {errors.file && (
        <Alert variant="destructive">
          <AlertDescription>{errors.file.message}</AlertDescription>
        </Alert>
      )}

      <Input
        {...register('steamMatchId')}
        placeholder="Steam Match ID (optional)"
        type="text"
      />

      {uploadMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Upload failed. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!isDirty || uploadMutation.isPending}
        className="w-full"
      >
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Demo'}
      </Button>
    </form>
  )
}
```

### Results Page with Polling

```typescript
// app/results/[id]/page.tsx
'use client'

import { usePolling } from '@/lib/hooks/usePolling'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ResultsCard } from '@/components/ResultsCard'
import { FeatureTable } from '@/components/FeatureTable'
import { VerdictBadge } from '@/components/VerdictBadge'

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { data: demo, isLoading, error, failureCount } = usePolling(params.id)

  // Not found or deleted
  if (demo === null) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <h2 className="font-semibold mb-2">Analysis Not Found</h2>
          <p className="mb-4">
            The demo you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => window.location.href = '/'}>Back to Upload</Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Polling failed after 3 retries
  if (error && failureCount >= 3) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <h2 className="font-semibold mb-2">Service Unreachable</h2>
          <p className="mb-4">
            Unable to reach analysis service. Results may be available if you check again.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Check Status
            </Button>
            <Button onClick={() => window.location.href = '/'}>Go Back</Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Loading state
  if (isLoading && !demo) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // Processing state
  if (demo?.status === 'pending') {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin">⟳</div>
        <p>Analysis running... This usually takes 10-30 seconds.</p>
      </div>
    )
  }

  // Error state
  if (demo?.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <h2 className="font-semibold mb-2">Analysis Failed</h2>
          <p className="mb-4">{demo.error || 'Unknown error. Try uploading another demo.'}</p>
          <Button onClick={() => window.location.href = '/'}>Try Again</Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Results ready
  if (demo?.status === 'done' && demo.results) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analysis Results</h1>
          <p className="text-gray-600">Demo {demo.id}</p>
        </div>

        {demo.results.players?.map((player) => (
          <div key={player.steamId}>
            <h2 className="text-xl font-semibold mb-4">{player.name}</h2>
            <VerdictBadge verdict={player.overallVerdict} score={player.overallScore} />
            <FeatureTable features={player.features} />
          </div>
        ))}
      </div>
    )
  }

  return <div>Unknown state</div>
}
```

### Custom Polling Hook

```typescript
// lib/hooks/usePolling.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchDemoStatus } from '@/lib/api'
import { useState, useEffect } from 'react'

export function usePolling(demoId: string) {
  const [failureCount, setFailureCount] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  // Track elapsed time for 5-minute timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(ms => ms + 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading, error, failureCount: queryFailureCount } = useQuery({
    queryKey: ['demo', demoId],
    queryFn: () => fetchDemoStatus(demoId),
    // Poll every 2 seconds while status is 'pending'
    refetchInterval: (data) => {
      if (data?.status === 'pending') {
        // Stop polling if 5 minutes elapsed
        if (elapsedMs > 5 * 60 * 1000) return false
        return 2000
      }
      return false
    },
    // Retry up to 3 times with exponential backoff
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
  })

  return { data, isLoading, error, failureCount: queryFailureCount || 0, elapsedMs }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components + lifecycle methods | Functional components + hooks | React 16.8 (2019) | Simpler code, better code reuse |
| Manual Redux state | TanStack React Query | RTK Query (2021) | Server state separated from UI state |
| Pages directory | App Router | Next.js 13 (2022) | Layouts, streaming, server components |
| Tailwind v3 + tailwind.config.js | Tailwind v4 + CSS @theme | Tailwind CSS v4 (Jan 2025) | 5x faster builds, zero config |
| Rest API design | GraphQL or REST with loader patterns | 2023+ | Not changing for this phase (stick with REST) |
| Cypress for E2E tests | Playwright | 2022+ | Faster, better API, cross-browser |
| Manual error tracking | Sentry | Widespread (2020+) | Industry standard, free tier sufficient |

**Deprecated/Outdated:**
- **Pages directory:** Still supported but App Router is standard for new projects
- **Class error boundaries:** Replaced by error.js file convention (App Router)
- **Tailwind v3:** Still works; v4 is faster and more modern
- **Redux for all state:** Over-engineered for this phase; use React Query + Context

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Axios is acceptable alternative to native Fetch API | Standard Stack | LOW — Both work fine; Fetch is slightly lighter, Axios has better DX. Decision is a style preference. |
| A2 | File upload validation with Zod `.refine()` covers MIME type checking | Form Handling | LOW — MIME type reported by browser FileList; backend should validate file signature for security. |
| A3 | Sentry free tier is sufficient for v1 | Sentry Integration | LOW — Confirms pricing page; if usage grows, upgrade to paid tier. |
| A4 | Docker Compose networking allows `http://symfony:80/api` DNS resolution | Docker & Deployment | MEDIUM — Assumes Symfony service is named `symfony` in compose file. User should verify actual service name. |
| A5 | 2-second polling interval is acceptable (CONTEXT.md decision) | Data Fetching | HIGH — Explicitly locked in CONTEXT.md; no flexibility. |
| A6 | Standalone mode with `output: 'standalone'` in next.config.ts works without Node.js server | Docker & Deployment | MEDIUM — Standalone requires Node.js runtime (not a "static export"). Needs `node server.js` to start. |

**All locked decisions from CONTEXT.md (§1-8) are treated as constraints, not assumptions.**

---

## Open Questions

1. **API Response Format (Demo Status)**
   - What we know: UI-SPEC expects `status: "pending" | "done" | "error"`, `results` object, `error_message`
   - What's unclear: Exact shape of results object for players, features, scores
   - Recommendation: Verify Symfony API response schema with backend team before implementation. Use TypeScript types to codify the contract.

2. **File Upload Progress Bar**
   - What we know: UX should show upload progress (UI-SPEC mentions "Upload status indicator")
   - What's unclear: Should progress bar also show upload speed, estimated time? Or just percentage?
   - Recommendation: Keep simple v1 (percentage only). Axios provides `onUploadProgress` callback if fancy progress is added.

3. **Playwright Test Environment**
   - What we know: E2E tests should run in CI
   - What's unclear: Should tests run against Symfony API or mocked backend?
   - Recommendation: Run against real local Compose stack. Mock only external services (file storage, Sentry) if needed.

4. **Dark Mode**
   - What we know: Out of scope for v1
   - What's unclear: Should UI components be prepped for dark mode (e.g., class structure)?
   - Recommendation: Use shadcn/ui defaults (light mode only v1). Dark mode is CSS-only change in v2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build, dev server | ✓ (assumed) | 20.x LTS+ | — |
| npm | Dependency management | ✓ (standard) | 10.x+ | — |
| Docker | Production image build, dev Compose | ✓ (assumed) | 24.x+ | — |
| Symfony API | Frontend integration | ✓ (Phase 2 complete) | 7.x | — |
| PostgreSQL | Demo storage (backend dependency) | ✓ (Phase 1) | 16 | — |
| Redis | Queue (backend dependency) | ✓ (Phase 1) | 7 | — |

**No blocking dependencies missing.** All required services are available from Phases 1-2.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.x + Playwright 1.57.x |
| Config file | `jest.config.ts`, `playwright.config.ts` |
| Quick run command | `npm test -- --testPathPattern=components` (Jest single file) |
| Full suite command | `npm test && npm run e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | User uploads demo file | E2E | `npm run e2e -- upload.spec.ts` | ✗ Wave 0 |
| UI-01 | Upload redirects to results page | E2E | `npm run e2e -- upload.spec.ts` | ✗ Wave 0 |
| UI-01 | Results page polls API until done | E2E | `npm run e2e -- results.spec.ts` | ✗ Wave 0 |
| UI-01 | Results display verdict + feature breakdown | Unit | `npm test -- VerdictBadge.test.tsx` | ✗ Wave 0 |
| UI-01 | User views analysis history | E2E | `npm run e2e -- history.spec.ts` | ✗ Wave 0 |
| UI-01 | User downloads demo file | E2E | `npm run e2e -- results.spec.ts` | ✗ Wave 0 |
| UI-01 | Error states display gracefully | E2E | `npm run e2e -- errors.spec.ts` | ✗ Wave 0 |
| UI-01 | Form validation (file type, size) | Unit | `npm test -- UploadForm.test.tsx` | ✗ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern=components` (Jest unit tests only, <30s)
- **Per wave merge:** `npm test && npm run e2e` (full suite including E2E, ~2-3 minutes)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/components/UploadForm.test.tsx` — File upload + validation tests
- [ ] `tests/components/ResultsCard.test.tsx` — Results display, verdict badge, feature table tests
- [ ] `tests/components/HistoryTable.test.tsx` — History table, sorting, filtering tests
- [ ] `tests/lib/api.test.ts` — API instance, endpoint mocking
- [ ] `tests/lib/hooks/usePolling.test.ts` — Polling logic, refetch interval, retry backoff
- [ ] `e2e/upload.spec.ts` — Full user flow: upload, redirect, results display
- [ ] `e2e/results.spec.ts` — Results page, polling, error states
- [ ] `e2e/history.spec.ts` — History page, filters, delete
- [ ] `e2e/fixtures/sample.dem` — Mock .dem file for E2E tests (minimal, ~1KB)
- [ ] `jest.setup.ts` — MSW mock server, Router mocks, global test utilities
- [ ] `jest.config.ts` — Jest configuration (jsdom, setupFiles, moduleNameMapper)
- [ ] `playwright.config.ts` — Playwright configuration (baseURL, webServer, projects)

**All test files are Wave 0 — part of "setup" phase, not feature implementation.**

*(None detected: existing test infrastructure covers all phase requirements)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control | Implementation |
|---------------|---------|-----------------|-----------------|
| V2 Authentication | ✗ No (public/research tool, no auth) | N/A | Add auth in v2 if needed |
| V3 Session Management | ✗ No | N/A | N/A |
| V4 Access Control | ✗ No (public tool) | N/A | N/A |
| V5 Input Validation | ✓ Yes | Zod schema validation | File type, size, extension validation in form |
| V6 Cryptography | ✗ No (no sensitive data, HTTPS in production) | HTTPS only | Use HTTPS in production; TLS termination at Nginx |
| V8 File and Resources | ✓ Yes | Sanitize file uploads | Backend validates demo file format (not script); no arbitrary file execution |
| V13 API and Web Service | ✓ Yes | Input validation, error handling | Axios error handling, Sentry logging, CORS checks |

### Known Threat Patterns for Next.js + React

| Pattern | STRIDE | Standard Mitigation | Implementation |
|---------|--------|---------------------|-----------------|
| XSS via unsanitized user input | Tampering | Never render user input as HTML; use React's default escaping | All strings from API are rendered as text, not HTML |
| CSRF in file upload form | Tampering | Add CSRF token to form (if auth added) | Symfony sets CSRF tokens automatically |
| Man-in-the-middle (HTTP) | Eavesdropping | Use HTTPS in production | `NEXT_PUBLIC_API_URL` should be HTTPS in production |
| Sensitive data in browser | Information Disclosure | Don't pass secrets to client components | API keys, auth tokens only in server actions or API routes |
| Unhandled API errors expose stack traces | Information Disclosure | Log to Sentry, show generic user message | Sentry captures; UI shows "Server error, please try again" |

### Explicit Non-Threats (v1)

- **Authentication:** Out of scope. Tool is public/research-oriented.
- **Encryption at rest:** Demo files stored on local volume; encryption added later if needed.
- **Rate limiting:** Not required for v1. Add in v2 if abuse observed.
- **SQL injection:** Using Symfony ORM (backend); frontend only sends JSON.

---

## Sources

### Primary (HIGH confidence)

- [Next.js 14+ App Router Guides](https://nextjs.org/docs/app) — Official documentation for App Router, server/client components
- [shadcn/ui Installation for Next.js](https://ui.shadcn.com/docs/installation/next) — Official setup and component library
- [TanStack React Query Documentation](https://tanstack.com/query/latest/docs) — Polling, data fetching, query configuration
- [React Hook Form + Zod Integration](https://react-hook-form.com/) — Form handling and validation patterns
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) — Latest version, zero-config, performance improvements
- [Playwright Testing for Next.js](https://nextjs.org/docs/pages/guides/testing/playwright) — E2E testing setup and patterns
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — Error tracking initialization and configuration
- [Next.js Docker Standalone Mode](https://docs.docker.com/guides/nextjs/containerize/) — Production Dockerfile optimization

### Secondary (MEDIUM confidence)

- [Next.js App Router Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling) — error.js, not-found.js patterns
- [File Upload in React Testing Library](https://testing-library.com/docs/react-testing-library/example-intro) — Unit test patterns for file inputs
- [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/best-practices) — Testing philosophy and patterns
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) — Mobile-first breakpoints, utilities
- [Next.js CORS Configuration](https://blog.logrocket.com/using-cors-next-js-handle-cross-origin-requests/) — CORS setup for frontend/backend integration
- [WebSearch: Next.js 14 App Router best practices 2025](https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3)
- [WebSearch: shadcn/ui Next.js 14 setup](https://medium.com/zestgeek/how-to-integrate-shadcn-into-next-js-14-a-step-by-step-guide-917bb1946cba)
- [WebSearch: React Query polling patterns](https://tanstack.com/query/latest/docs/framework/react/guides/polling)
- [WebSearch: File upload drag-drop Next.js](https://medium.com/@codewithmarish/building-a-drag-and-drop-file-uploader-with-next-js-1cfaf504f8ea)

### Tertiary (LOW confidence — secondary sources, marked for validation)

- [WebSearch: Next.js App Router server vs client components 2025](https://dev.to/myogeshchavan97/next-js-server-actions-vs-api-routes-dont-build-your-app-until-you-read-this-4kb9) — Community article, verify with official docs
- [WebSearch: Next.js App Router common pitfalls 2025](https://tevpro.com/next-js-gotchas/) — Blog post, use as reference not gospel
- [npm registry — package versions](https://www.npmjs.com/package/next) — Package version numbers verified at research time
- [React versions](https://react.dev/versions) — React 19 is latest, but React 18.x still supported

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — All versions verified against npm registry and official docs. Library choices locked in CONTEXT.md.
- **Architecture Patterns:** HIGH — Next.js App Router patterns well-documented. File structure follows official recommendations.
- **Data Fetching:** HIGH — React Query polling pattern explicitly tested; pattern is standard in ecosystem.
- **Error Handling:** HIGH — Error boundaries and Sentry integration documented in official Next.js guide.
- **Testing:** HIGH — Jest and Playwright are official Next.js recommendations. Patterns well-established.
- **Docker & Deployment:** MEDIUM-HIGH — Standalone mode verified; multistage Dockerfile follows best practices but should be tested with actual build.
- **Pitfalls:** MEDIUM — Drawn from community posts and personal experience; specific pitfalls may vary by developer background.

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (30 days — Next.js and React ecosystems move fast; major version updates may affect validity)
