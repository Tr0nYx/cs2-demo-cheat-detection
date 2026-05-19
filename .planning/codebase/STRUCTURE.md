# Codebase Structure

**Analysis Date:** 2026-05-19

## Directory Layout

```
[project-root]/
├── symfony/                    # Symfony 7.4 backend
│   ├── src/
│   │   ├── UI/Api/            # HTTP REST API layer
│   │   ├── Application/       # Use case handlers, services, DTOs
│   │   ├── Domain/            # Domain entities, value objects
│   │   ├── Infrastructure/    # Queue, storage, database, APIs
│   │   ├── Entity/            # Doctrine ORM entities
│   │   ├── Repository/        # Doctrine query repositories
│   │   └── Controller/        # Auth and legacy controllers
│   ├── config/                # Symfony services, routes, bundles
│   ├── migrations/            # Doctrine database migrations
│   ├── tests/                 # PHPUnit test suites
│   ├── public/                # Public web root (index.php)
│   ├── composer.json          # PHP dependencies
│   └── phpunit.xml.dist       # Test runner config
│
├── python/                     # Python 3.12 ML pipeline
│   ├── worker.py             # Main worker loop (Redis consumer)
│   ├── import_worker.py       # Sharecode import job consumer
│   ├── parser/               # Demo parsing layer
│   │   ├── adapter.py        # DemoParserAdapter (protobuf → pandas)
│   │   └── types.py          # ParsedDemo, DemoParseError
│   ├── features/             # Feature extraction algorithms
│   │   ├── base.py          # AbstractFeatureExtractor, FeatureResult
│   │   ├── aimbot.py        # Snap/jerk detection
│   │   ├── wallhack.py      # Visibility prediction errors
│   │   ├── triggerbot.py    # Reaction time anomalies
│   │   ├── recoil.py        # Recoil control patterns
│   │   ├── bhop.py          # Bunnyhop exploit detection
│   │   ├── session.py       # Consistency scoring
│   │   └── patterns/        # Shared pattern utilities
│   ├── ml/                   # Machine learning utilities
│   │   ├── config.py        # Load ML config
│   │   └── augmentation.py  # Data augmentation pipeline
│   ├── scoring/              # Score aggregation
│   │   ├── weighted_scorer.py    # Combines feature scores
│   │   ├── trace_rating.py       # TRACE rating calculation
│   │   └── trace_calibration.py  # Calibration management
│   ├── persistence/          # Database write layer
│   │   └── result_writer.py  # PostgreSQL result persistence
│   ├── platforms/            # Platform-specific demo fetchers
│   │   ├── steam.py         # Steam demo download
│   │   ├── faceit.py        # FaceIt demo fetch
│   │   ├── esea.py          # ESEA demo fetch
│   │   └── base.py          # Abstract fetcher, error types
│   ├── requirements.txt       # Python dependencies
│   ├── tests/                # pytest test suites
│   └── fixtures/             # Test data
│
├── frontend/                  # Next.js 16 frontend
│   ├── app/                  # Next.js 13+ app router
│   │   ├── matches/          # Match detail pages
│   │   ├── players/          # Player profile pages
│   │   ├── leaderboards/    # Leaderboard views
│   │   ├── analytics/        # Analytics/trends pages
│   │   ├── dashboard/        # User dashboard
│   │   ├── api/              # Route handlers (auth, webhooks)
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # Reusable React components
│   │   ├── Console/          # Layout components (header, panel)
│   │   ├── MatchDetail/      # Match view components
│   │   ├── ui/               # Shadcn/ui base components
│   │   └── [feature]/        # Feature-specific components
│   ├── lib/                  # Utilities and hooks
│   │   ├── hooks/            # React hooks (data fetching)
│   │   ├── api.ts            # Axios API client
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── auth.ts           # NextAuth configuration
│   │   └── utils.ts          # Helper functions
│   ├── public/               # Static assets (images, fonts)
│   ├── __tests__/            # Jest test suites
│   ├── e2e/                  # Playwright E2E tests
│   ├── package.json          # npm dependencies
│   ├── tsconfig.json         # TypeScript config
│   ├── next.config.ts        # Next.js configuration
│   └── playwright.config.ts  # E2E test runner config
│
├── docker/                    # Docker Compose & service configs
├── data/                      # Local test data, fixtures
└── .planning/codebase/        # This analysis (ARCHITECTURE.md, STRUCTURE.md)
```

## Directory Purposes

**symfony/src/UI/Api/**
- Purpose: HTTP REST API endpoints
- Contains: Controllers with `#[Route]` attributes
- Key files: `DemoController.php`, `AnalyticsController.php`, `ResultIngestController.php`, `PlayerController.php`
- Routes defined via PHP attributes (no YAML routing for API endpoints)

**symfony/src/Application/**
- Purpose: Application/use-case layer (CQRS-style handlers)
- Contains: 
  - `Command/`: Async message classes (AnalyzeDemoMessage, ImportDemoMessage)
  - `Handler/`: Message handlers that implement use cases
  - `Service/`: Business logic services (UploadDemoService, ImportSharecodeService)
  - `Dto/`: Data transfer objects for API responses
  - `Query/`: Query classes for handler dispatch
- Key principle: Handlers are stateless and orchestrate domain + infrastructure

**symfony/src/Domain/**
- Purpose: Core business entities and value objects (DDD)
- Contains:
  - `Demo/Demo.php`: Aggregate root for demo file
  - `Analysis/AnalysisResult.php`: Feature scores + raw data per player
  - `Player/Player.php`: Player identity
  - `Demo/DemoStatus.php`: Enum (Uploaded, Queued, Done, Error)
  - `Analysis/SuspicionLabel.php`: Enum (clean, suspicious, likely_cheating)
- Key principle: No infrastructure code; pure business logic

**symfony/src/Infrastructure/**
- Purpose: External dependency implementations
- Contains:
  - `Queue/`: Redis publisher (RedisAnalysisJobPublisher)
  - `Storage/`: File storage (LocalDemoStorage)
  - `Steam/`: Steam API clients (SteamOpenIdValidator, SteamProfileClient)
  - `Persistence/`: Doctrine repositories
  - `Event/`: Symfony event subscribers
- Key principle: Swappable via dependency injection (DI container)

**python/worker.py**
- Purpose: Main analysis pipeline orchestrator
- Entry point: Runs forever, consuming Redis queue
- Responsibilities:
  - Pops job from queue (LPOP blocking)
  - Calls DemoParserAdapter to parse file
  - Instantiates each FeatureExtractor, calls extract()
  - Calls WeightedScorer.score() to combine features
  - Calls ResultWriter.write_result() to persist to PostgreSQL
  - HTTP POSTs to ResultIngestController to notify Symfony
- Error handling: Catches exceptions, logs to JSON stdout, continues

**python/features/**
- Purpose: Pluggable cheat detection algorithms
- Base class: `AbstractFeatureExtractor` (base.py)
- Concrete extractors:
  - `AimbotExtractor`: Snap angle detection, jerk analysis
  - `WallhackExtractor`: Visibility prediction checks
  - `TriggerbotExtractor`: Reaction time anomaly detection
  - `RecoilExtractor`: Spray pattern analysis
  - `BhopExtractor`: Bundhop exploit detection
  - `SessionConsistencyExtractor`: Performance variance across rounds
- Each returns: `FeatureResult(score: 0-1, raw_measurements: dict, metadata: dict)`

**python/parser/**
- Purpose: Demo file parsing layer
- `DemoParserAdapter`: Calls external protobuf parser, returns `ParsedDemo`
- `ParsedDemo` type: Contains `ticks_df` (player state), `events_df` (gameplay events), `map_name`
- Error type: `DemoParseError` (fatal, fails entire demo)

**python/scoring/**
- Purpose: Score aggregation and rating systems
- `WeightedScorer`: Combines 6 feature scores using weights (aimbot: 0.28, etc.)
- `TraceRating`: Optional advanced rating (eKILL, AIM, KAST, UTIL, CLUTCH components)
- `TraceCalibration`: Calibration manager for ongoing model recalibration

**frontend/app/**
- Purpose: Next.js app router (13+ routing system)
- Structure: File-based routing (page.tsx = route)
- Key routes:
  - `/matches/[demoId]/page.tsx`: Match detail view
  - `/players/[playerId]/page.tsx`: Player profile
  - `/leaderboards/page.tsx`: Global leaderboards
  - `/api/auth/[...nextauth]/route.ts`: NextAuth route handler
- Layout: `layout.tsx` provides page structure, styling

**frontend/lib/hooks/**
- Purpose: React Query data-fetching hooks
- Pattern: Custom hooks wrapping `useQuery()` / `useMutation()`
- Examples:
  - `useMatchDetail()`: Fetches demo detail + rounds + events
  - `useUploadDemo()`: Mutates POST /api/demos
  - `useFilteredLeaderboard()`: Queries leaderboard with filters
  - `useDemoEvents()`: Fetches gameplay events
- Key: Handles caching, retries, polling

**frontend/components/**
- Purpose: Reusable React components
- Structure:
  - `ui/`: Shadcn/ui primitives (Button, Modal, etc.)
  - `Console/`: Layout wrapper components
  - `MatchDetail/`: Match-specific components (events table, rounds list, heatmap)
  - Feature-organized subdirectories
- Pattern: Functional components with TypeScript props

## Key File Locations

**Entry Points:**
- `symfony/public/index.php`: PHP app entry point (Symfony kernel)
- `symfony/bin/console`: Symfony CLI commands
- `frontend/app/layout.tsx`: React root layout
- `python/worker.py`: ML pipeline entry point (main loop)

**Configuration:**
- `symfony/config/services.yaml`: Dependency injection container config
- `symfony/config/routes.yaml`: Route imports
- `frontend/auth.ts`: NextAuth config and Steam provider
- `frontend/next.config.ts`: Next.js build config
- `python/requirements.txt`: Python package dependencies

**Core Logic:**
- `symfony/src/Application/Demo/UploadDemoService.php`: Demo upload workflow
- `symfony/src/Application/Handler/AnalyzeDemoHandler.php`: Job dispatch to Python
- `symfony/src/UI/Api/ResultIngestController.php`: Result webhook from Python
- `python/worker.py`: Analysis orchestration
- `python/scoring/weighted_scorer.py`: Feature score combination

**Testing:**
- `symfony/tests/`: PHPUnit test suites (functional + unit)
- `frontend/__tests__/`: Jest test suites
- `frontend/e2e/`: Playwright E2E tests
- `python/tests/`: pytest test suites

## Naming Conventions

**Files:**
- PHP: `PascalCaseClass.php` (one public class per file)
- Python: `snake_case_module.py` (functions and classes in lowercase_underscore)
- TypeScript: `camelCase.ts` for utilities, `PascalCase.tsx` for components
- Tests: `*Test.php` (PHP), `*.test.ts` (JavaScript), `test_*.py` (Python)

**Directories:**
- PHP namespaces map to directory structure: `App\Domain\Demo` → `src/Domain/Demo/`
- Python packages use lowercase: `features/`, `persistence/`
- Next.js pages use brackets for params: `[demoId]`, `[playerId]`

**Functions:**
- PHP: `camelCase()` public methods, `private function` keyword for private
- Python: `snake_case_functions()`, `_private_functions()`
- TypeScript: `camelCase()` functions, `PascalCase` for class/interface names

**Variables:**
- PHP: `$camelCase` local variables, `$CONSTANT` for class constants
- Python: `snake_case_variable`, `CONSTANT_NAME` for module constants
- TypeScript: `camelCase` variables, `UPPERCASE` for constants

**Types/Interfaces:**
- PHP: `#[ORM\Entity]` for Doctrine entities, `readonly class` for immutable DTOs
- Python: `@dataclass` for data classes, `TypedDict` for strict dicts
- TypeScript: `interface Name {}` for object contracts, `type Union = A | B` for unions

## Where to Add New Code

**New Feature (e.g., new cheat detection type):**
- Implementation: `python/features/new_cheat.py` extending `AbstractFeatureExtractor`
- Tests: `python/tests/test_new_cheat_extractor.py`
- Scoring integration: Update `WeightedScorer` weights if changing feature importance
- Result display: Add field to `AnalysisResult` entity and `Feature` type in frontend

**New Endpoint:**
- Handler: `symfony/src/Application/Handler/GetNewDataHandler.php`
- Controller: Add route to `symfony/src/UI/Api/DesiredController.php`
- DTO: `symfony/src/Application/Dto/NewResponseDto.php`
- Frontend hook: `frontend/lib/hooks/useNewData.ts`
- Frontend page: `frontend/app/new-route/page.tsx`

**New Component/Module:**
- Pages: `frontend/app/[route]/page.tsx`
- Reusable component: `frontend/components/[Feature]/ComponentName.tsx`
- Layout wrapper: `frontend/components/Console/[Component].tsx`
- Styles: Use Tailwind classes inline (no CSS files); theme colors from `tailwind.config.ts`

**Utilities:**
- Shared helpers: `frontend/lib/utils.ts` or `frontend/lib/[feature].ts`
- API methods: Add to `frontend/lib/api.ts` (axios client)
- Type definitions: `frontend/lib/types.ts`

## Special Directories

**symfony/migrations/**
- Purpose: Doctrine migration files for schema changes
- Generated: By `bin/console doctrine:migrations:generate`
- Committed: Yes (version control for schema)
- Usage: Applied on deploy via `bin/console doctrine:migrations:migrate`

**frontend/.next/**
- Purpose: Next.js build output and cache
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)
- Size: ~400MB; cleaned by `npm run clean`

**frontend/node_modules/**
- Purpose: npm package cache
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)
- Size: ~500MB; regenerated from package-lock.json

**python/__pycache__/**
- Purpose: Python bytecode cache
- Generated: Yes (by Python runtime)
- Committed: No (.gitignore)
- Cleaned: `rm -rf python/__pycache__`

**data/ & symfony/var/uploads/**
- Purpose: Local development test data and demo files
- Generated: At runtime (demos uploaded by tests)
- Committed: No (.gitignore)
- Retention: Can be deleted; will regenerate on next test run

**docker/**
- Purpose: Docker Compose configs and entrypoint scripts
- Committed: Yes
- Used: In development and CI/CD pipeline
- Files: `docker-compose.yml`, Dockerfiles, startup scripts

---

*Structure analysis: 2026-05-19*
