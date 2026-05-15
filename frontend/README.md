# CS2 Demo Cheat Detection - Frontend

Next.js 16 frontend application for CS2 demo analysis and cheat detection. Provides user interface for uploading demo files, viewing analysis results, and managing demo history.

## Quick Start

### Prerequisites

- Node.js 20.x LTS or newer
- npm or yarn
- Docker (for production deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` with configuration (copy from `.env.example`):
```bash
cp .env.example .env.local
```

3. Configure API endpoint in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Docker Compose (Full Stack)

From the project root:

```bash
docker-compose up
```

This starts:
- Frontend at http://localhost:3000
- Backend API at http://localhost:8000
- PostgreSQL, Redis, and Python worker services

## Development

### Available Scripts

- `npm run dev` — Start development server with hot reload
- `npm run build` — Build for production (creates `.next/standalone`)
- `npm start` — Start production server
- `npm test` — Run Jest unit tests
- `npm run test:watch` — Run tests in watch mode
- `npm run e2e` — Run Playwright E2E tests
- `npm run lint` — Run ESLint

### Project Structure

```
frontend/
├── app/              # Next.js App Router
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home/upload page
│   └── globals.css   # Global styles
├── components/       # React components
│   ├── ui/          # shadcn/ui components (copy-paste)
│   └── ...          # Custom components
├── lib/
│   ├── api.ts       # Axios instance + API endpoints
│   ├── types.ts     # TypeScript type definitions
│   ├── utils.ts     # Utility functions
│   └── hooks/       # Custom React hooks
├── __tests__/       # Jest unit tests
├── e2e/            # Playwright E2E tests
├── public/         # Static assets
├── .env.local      # Local environment variables (git-ignored)
├── .env.example    # Environment variable template
├── Dockerfile      # Production Docker image
├── jest.config.ts  # Jest configuration
├── playwright.config.ts  # Playwright configuration
├── next.config.ts  # Next.js configuration
├── tailwind.config.ts  # Tailwind CSS configuration
└── package.json    # Dependencies
```

## Testing

### Unit Tests (Jest)

```bash
npm test
npm test -- --coverage    # With coverage report
npm run test:watch        # Watch mode
```

### E2E Tests (Playwright)

```bash
npm run e2e                 # Headless mode
npm run e2e -- --headed     # With browser visible
npm run e2e -- --debug      # Debug mode
```

## Build

### Development Build

```bash
npm run build
npm start
```

### Production Build (Docker)

```bash
docker build -t cs2-frontend ./frontend
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost/api cs2-frontend
```

The build uses standalone mode (`output: 'standalone'` in next.config.ts), which:
- Copies only necessary files to `.next/standalone`
- Reduces image size to ~300MB (from 2GB+ with full node_modules)
- Runs with `node server.js` without separate build dependencies

## Configuration

### Environment Variables

Create `.env.local` (git-ignored) with:

```env
# API endpoint
NEXT_PUBLIC_API_URL=http://localhost/api

# Sentry error tracking (optional)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=sntrys_...
NEXT_PUBLIC_RELEASE=dev
```

See `.env.example` for all available variables.

## Architecture

### Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State Management:** TanStack React Query v5
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios
- **Testing:** Jest + React Testing Library (unit), Playwright (E2E)
- **Error Tracking:** Sentry
- **Containerization:** Docker (multistage build)

### Key Features

- **File Upload:** Drag-and-drop or click to upload `.dem` files (max 100MB)
- **Status Polling:** Real-time polling of analysis results every 2 seconds
- **Results Display:** Verdict badges and feature breakdown tables
- **History:** View previous analyses with filtering
- **Error Handling:** Graceful degradation with user-friendly error messages
- **Type Safety:** Full TypeScript strict mode
- **Accessible:** shadcn/ui components with WCAG 2.1 AA compliance
- **Responsive:** Mobile-first design (320px+)

## API Integration

### Base URL

The frontend communicates with the Symfony backend via `NEXT_PUBLIC_API_URL`. In Docker Compose:

```env
NEXT_PUBLIC_API_URL=http://php:80/api
```

For local development (without Docker):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### CORS

The backend must allow requests from the frontend origin. Configure in Symfony `.env`:

```env
CORS_ALLOW_ORIGIN=^https?://(localhost|127\.0\.0\.1|next-app)(:[0-9]+)?$
```

This allows:
- `http://localhost:3000` — local dev
- `http://127.0.0.1:3000` — loopback
- `http://next-app:3000` — Docker Compose internal DNS

## Troubleshooting

### Build Issues

1. **Memory error during build:**
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 npm run build
   ```

2. **TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

3. **Dependencies mismatch:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Runtime Issues

1. **API not responding:**
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`
   - Verify backend is running: `curl http://localhost:8000/api/health`
   - Check CORS headers in DevTools Network tab

2. **Polling not working:**
   - Check React Query: `import { useIsFetching } from '@tanstack/react-query'`
   - Verify demo ID is correct
   - Check Analysis service logs

3. **File upload fails:**
   - Ensure file is `.dem` format
   - Check file size < 100MB
   - Verify backend endpoint exists: `POST /api/demos`

## Deployment

### Docker Compose (Development)

```bash
docker-compose up next-app
```

### Docker (Standalone)

```bash
docker build -t cs2-frontend:latest ./frontend
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.example.com \
  -e NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/... \
  cs2-frontend:latest
```

### Vercel (Alternative - Not Recommended for v1)

This project is designed for Docker deployment. Vercel support may be added in v2.

## Next Steps

### Phase 2: Feature Implementation

1. Upload form component with validation
2. Results page with polling logic
3. History page with filtering
4. Error boundaries and loading states
5. Unit and E2E test coverage

### v2 Features (Post-MVP)

- Dark mode toggle
- Advanced filtering (sortable columns)
- Real-time WebSocket updates
- Trend analytics dashboard
- Performance monitoring (Lighthouse)
- Mobile-specific E2E tests

## Contributing

Follow the patterns in this README for:
- Creating new components (use shadcn/ui as base)
- Adding API endpoints (use `lib/api.ts`)
- Writing tests (Jest for units, Playwright for E2E)
- Handling errors (Sentry + user-friendly messages)

## License

ISC
