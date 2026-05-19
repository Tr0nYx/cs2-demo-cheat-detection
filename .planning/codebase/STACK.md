# Technology Stack

**Analysis Date:** 2026-05-19

## Languages

**Primary:**
- PHP 8.3 - Backend API (Symfony 7 framework)
- TypeScript 5 - Frontend and CLI applications (Next.js)
- Python 3.12 - ML pipeline and worker services

**Secondary:**
- JavaScript - Node.js services (hltv-scraper, frontend build tools)

## Runtime

**Environment:**
- PHP-FPM 8.3 (Docker container: `php:8.3-fpm`)
- Node.js 20-alpine (Docker: frontend build and runtime)
- Python 3.12-slim (Docker: `python:3.12-slim`)

**Package Managers:**
- Composer 2 - PHP dependency management (lockfile: `symfony/composer.lock`)
- npm (Node.js, JavaScript) - Frontend and hltv-scraper dependencies (lockfiles: `frontend/package-lock.json`, `hltv-scraper/package-lock.json`)
- pip - Python dependency management (requirements file: `python/requirements.txt`)

## Frameworks

**Core Backend:**
- Symfony 7.4.* - Full-stack PHP framework for REST API (`symfony/composer.json`)
  - Doctrine ORM 3.6 - Database abstraction and mapping
  - Doctrine DBAL 4.4 - Database layer
  - Symfony Messenger 7.4 - Message queue/pub-sub implementation
  - Symfony Validator 7.4 - Request/entity validation
  - Symfony Serializer 7.4 - JSON serialization
  - Symfony HTTP Client 7.4 - External API requests
  - Symfony Redis Messenger 7.4 - Redis-backed message transport

**Frontend:**
- Next.js 16.2.6 - React meta-framework for UI and SSR
- React 19.2.4 - UI components
- React Hook Form 7.75.0 - Form state management
- NextAuth 4.24.14 - Authentication handling (Steam OpenID 2.0)

**Testing:**
- PHPUnit 12.5 - PHP unit testing (backend)
- Jest 30.4.2 - JavaScript/TypeScript testing (frontend)
- Playwright 1.60.0 - E2E testing (frontend and hltv-scraper automation)
- pytest 7.0.0 - Python testing
- pytest-cov 4.0.0 - Python test coverage

**Build/Dev Tools:**
- Tailwind CSS 4 - Utility-first CSS framework (frontend)
- PostCSS 4 - CSS transformation (frontend)
- ESLint 9 - JavaScript/TypeScript linting (frontend)
- TypeScript 5 - Static typing for JavaScript

## Key Dependencies

**Critical Backend:**
- `symfony/messenger` 7.4 - Message queue routing and handling
- `symfony/http-client` 7.4 - HTTP requests to external APIs
- `doctrine/orm` 3.6 - ORM for entity persistence
- `symfony/redis-messenger` 7.4 - Redis support for async messages

**Critical Frontend:**
- `axios` 1.16.1 - HTTP client for API calls (wrapper around fetch)
- `@tanstack/react-query` 5.100.10 - Server state management and caching
- `next-auth` 4.24.14 - OpenID authentication with Steam
- `zod` 4.4.3 - Runtime schema validation

**UI Components:**
- `@radix-ui/react-tabs` 1.1.13 - Accessible tab component
- `shadcn` 4.7.0 - Copy-paste UI component library
- `lucide-react` 1.16.0 - SVG icon library
- `recharts` 2.14.5 - Chart and visualization library

**Critical ML/Python:**
- `demoparser2` >=0.37.0 - Counter-Strike 2 demo file parsing
- `torch` >=2.3.0 - PyTorch deep learning framework
- `scikit-learn` >=1.4.0 - Classical ML algorithms
- `imbalanced-learn` >=0.11.0 - Handling class imbalance in ML
- `pandas` >=2.2.0 - Data manipulation
- `numpy` >=1.26.0 - Numerical computing
- `psycopg2-binary` >=2.9.9 - PostgreSQL driver
- `redis` >=5.0.0 - Redis client
- `httpx` >=0.25.0 - Async HTTP client with retry support
- `tenacity` >=8.3.1 - Retry decorator for resilience

**Observability:**
- `@sentry/nextjs` 10.53.1 - Error tracking and performance monitoring (frontend)
- `python-json-logger` 2.0.7 - Structured JSON logging (Python)

## Configuration

**Environment:**
- `.env` files (git-ignored) - Local development configuration
- `docker-compose.yml` - Service orchestration and env variable defaults
- `docker-compose.prod.yml` - Production overrides
- Symfony config files in `symfony/config/packages/` - Framework-specific configs:
  - `doctrine.yaml` - ORM and database settings
  - `messenger.yaml` - Message transport and routing
  - `services.yaml` - Service container configuration

**Build:**
- `next.config.js` - Next.js build configuration (frontend)
- `tsconfig.json` - TypeScript compiler options (frontend)
- `jest.config.js` - Jest test runner configuration (frontend)
- `playwright.config.ts` - Playwright E2E test configuration
- `Dockerfile` (multiple) - Container definitions for each service

## Platform Requirements

**Development:**
- Docker 20+ (recommended)
- Docker Compose 2.20+
- PostgreSQL 16 client tools (for local psql connections)
- Redis CLI (for local Redis connections)
- Node.js 20+ (for running npm scripts locally)
- PHP 8.3+ (for running Symfony commands locally)
- Python 3.12+ (for running Python scripts locally)

**Production:**
- Docker / Kubernetes container orchestration
- PostgreSQL 16 database (can be managed by Docker)
- Redis 7 cache/queue backend (can be managed by Docker)
- Reverse proxy (Nginx, provided in `docker/nginx/`)
- HTTPS/TLS termination required (recommended at load balancer level)

## Version Summary

| Component | Version | Purpose |
|-----------|---------|---------|
| PHP | 8.3 | Backend runtime |
| Symfony | 7.4.* | API framework |
| Node.js | 20-alpine | Frontend/tooling runtime |
| Next.js | 16.2.6 | Frontend framework |
| Python | 3.12 | ML pipeline |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache and message queue |
| Nginx | 1.27-alpine | Reverse proxy |

---

*Stack analysis: 2026-05-19*
