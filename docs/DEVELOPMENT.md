# Development Guide

Guidelines for contributing to CS2 Demo Cheat Detection.

## Development Environment Setup

### Using Docker (Recommended)

```bash
# Clone and start services
git clone https://github.com/Tr0nYx/cs2-demo-cheat-detection.git
cd cs2-demo-cheat-detection
cp .env.example .env
make up

# Services run in background; access:
# - Frontend: http://localhost:3000
# - API: http://localhost:8000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Local Development (Without Docker)

**Frontend (Next.js):**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

**Backend (Symfony):**
```bash
cd symfony
composer install
symfony server:start  # Runs on http://localhost:8000
```

**Python Worker:**
```bash
cd python
pip install -r requirements.txt
python -m rq worker demo_analysis
```

## Code Organization

### Frontend (`frontend/`)

```
app/                          # Next.js App Router
├── page.tsx                  # Landing page (/)
├── dashboard/
│   └── page.tsx             # User dashboard
├── results/
│   └── [id]/page.tsx        # Result viewer
├── auth/
│   └── callback/page.tsx    # Steam auth callback
└── api/                      # API routes (if needed)

components/                   # Reusable React components
├── DemoViewer/             # Interactive demo viewer
│   ├── DemoViewer.tsx
│   ├── MapCanvas.tsx       # Heatmap rendering
│   ├── Timeline.tsx        # Timeline scrubber
│   ├── GrenadeInspector.tsx
│   └── ...
├── LandingPage/            # Landing page UI
└── ...

lib/                        # Utilities and hooks
├── hooks/
│   ├── useMapTransform.ts  # Canvas transformation
│   ├── usePlayback.ts      # Playback state
│   └── ...
├── api.ts                  # API client
└── ...

__tests__/                  # Unit tests
├── components/
├── lib/
└── ...

e2e/                        # E2E tests (Playwright)
└── *.spec.ts
```

### Backend (`symfony/`)

```
src/
├── Presentation/
│   ├── Controller/        # HTTP Controllers
│   └── ...
├── Application/
│   ├── Handler/          # Use case handlers
│   ├── Query/            # Read queries
│   ├── Service/          # Application services
│   ├── Command/          # Messages/commands
│   └── ...Dto.php        # DTOs
├── Domain/
│   ├── Demo/            # Demo aggregate
│   ├── Player/          # Player entity
│   ├── Viewer/          # Viewer entities (heatmap, etc)
│   └── ...
├── Infrastructure/
│   ├── Persistence/     # Repository implementations
│   ├── Cache/          # Cache repositories
│   ├── Queue/          # Job queue
│   └── ...
└── Entity/             # Doctrine entities

tests/                  # PHPUnit tests
├── Application/
├── Domain/
└── Infrastructure/
```

### Python (`python/`)

```
parser/                # CS2 demo parser
├── demo_parser.py    # Main parser
├── events.py         # Event types
└── ...

features/              # Feature extraction
├── extractor.py
├── statistical.py
└── ml_features.py

ml/                    # ML models
├── model.py
├── training.py
└── inference.py

viewer/               # Visualization
├── heatmap.py       # Heatmap generation
├── tick_exporter.py # Tick data export
└── ...

tests/               # Pytest tests
```

## Coding Standards

### Frontend (TypeScript/React)

```typescript
// Use functional components with hooks
export function MyComponent({ prop }: MyComponentProps) {
  const [state, setState] = useState<string>('')
  
  return <div>{state}</div>
}

interface MyComponentProps {
  prop: string
}

// Export type-first
export type SuspicionScore = {
  player_id: string
  score: number
  confidence: number
}
```

- Use TypeScript strict mode
- Prefer `interface` for props, `type` for unions
- Name components with PascalCase, utilities with camelCase
- Keep components focused and testable
- Use TailwindCSS for styling (no CSS modules)

### Backend (PHP)

```php
// Use type hints and return types
function analyzeDemo(Demo $demo): AnalysisResult
{
    return $this->handler->handle(new AnalyzeDemoCommand($demo));
}

// Follow PSR-12 (PHP-FIG coding standard)
// Use dependency injection for services
// Return domain objects, not arrays
```

- Run `make format` to auto-fix style
- Use nullable types (`?string`) explicitly
- Inject dependencies via constructor
- Return domain objects, not arrays
- Add docblocks only for complex logic

### Python

```python
def extract_features(demo: Demo) -> FeatureVector:
    """Extract statistical and ML features from demo."""
    statistical = extract_statistical_features(demo)
    ml_features = extract_ml_features(demo)
    return FeatureVector(statistical, ml_features)

# Use type hints consistently
# Follow PEP 8
# Use dataclasses or Pydantic for data structures
```

- Type hint all function signatures
- Use `black` for formatting (run `make format`)
- Use dataclasses or Pydantic for structured data
- Keep functions focused and pure when possible
- Add docstrings for public functions

## Testing

### Frontend

```bash
# Unit tests (Jest)
npm test
npm run test:watch

# E2E tests (Playwright)
npm run e2e

# Coverage
npm test -- --coverage
```

**Guidelines:**
- Test user interactions, not implementation
- Mock API calls, not business logic
- Use `data-testid` for hard-to-select elements

### Backend

```bash
# Unit & integration tests
make test-php
# or
php vendor/bin/phpunit

# Coverage
php vendor/bin/phpunit --coverage-html htmlcov
```

**Guidelines:**
- Test handlers and repositories
- Use fixtures for test data
- Keep tests isolated (no cross-test dependencies)
- Mock external services (Steam API, file storage)

### Python

```bash
# Unit tests
pytest
pytest -v  # Verbose
pytest -k test_name  # Run specific test

# Coverage
pytest --cov=python
```

**Guidelines:**
- Test parsing, feature extraction, model inference separately
- Use fixtures for demo files
- Mock external model loading

## Git Workflow

### Branches

- `main` — Production-ready code
- `feature/*` — New features
- `bugfix/*` — Bug fixes
- `docs/*` — Documentation

### Commits

```bash
# Clear, descriptive messages
git commit -m "feat(frontend): add heatmap visualization controls"
git commit -m "fix(backend): correct player suspicion score calculation"
git commit -m "docs: update API documentation"

# Commit format: <type>(<scope>): <description>
# Types: feat, fix, docs, style, refactor, test, chore
```

### Pull Requests

- Link related issues
- Describe changes clearly
- Reference any breaking changes
- Request review from maintainers

## Common Development Tasks

### Add a New API Endpoint

1. Create handler in `symfony/src/Application/Handler/`
2. Create controller in `symfony/src/Presentation/Controller/`
3. Define routes in `symfony/config/routes.yaml`
4. Add tests in `symfony/tests/Presentation/Controller/`
5. Update API docs

### Add a New Frontend Page

1. Create page component in `frontend/app/new-page/page.tsx`
2. Add components in `frontend/components/` as needed
3. Create tests in `frontend/__tests__/`
4. Add to navigation/routing

### Add a New Feature Extractor

1. Create module in `python/features/`
2. Implement extraction logic
3. Add tests in `python/tests/`
4. Integrate into feature pipeline
5. Update ML training config if needed

### Update Database Schema

1. Create migration: `symfony/bin/console make:migration`
2. Review migration in `symfony/migrations/`
3. Run: `symfony/bin/console doctrine:migrations:migrate`
4. Update entity in `symfony/src/Entity/`

## Performance Considerations

### Frontend

- Use React.memo for expensive components
- Use TanStack Query for smart caching
- Code-split large modules
- Optimize images (WebP, responsive sizes)

### Backend

- Index frequently queried fields
- Use query optimization in repositories
- Cache expensive computations (Redis)
- Batch database operations when possible

### Python

- Profile with `cProfile` for bottlenecks
- Use NumPy for vectorized operations
- Cache model weights in memory
- Use GPU acceleration when available

## Debugging

### Frontend

```bash
# Browser DevTools
# - Open http://localhost:3000
# - F12 for DevTools
# - Console for logs, Network for API calls

# VS Code
# - Install "Debugger for Firefox" or Chrome extension
# - Set breakpoints, debug directly in editor
```

### Backend

```bash
# Logs
make logs

# Symfony debug tools
# Add dump($variable) in controller
# Check http://localhost:8000/_debug

# Database
docker exec cs2-postgres psql -U cs2_app -d cs2_detection
```

### Python

```bash
# Logs (check Docker output)
make logs

# VS Code debugger
# - Create .vscode/launch.json for Python debugging

# Profiling
python -m cProfile -s cumulative script.py
```

## IDE Setup

### VS Code

**Extensions:**
- Prettier (Code formatter)
- ESLint (JavaScript linting)
- Tailwind CSS IntelliSense
- Thunder Client (API testing)
- Remote - Containers (Docker debugging)
- PHP Intelephense
- Python

### PhpStorm

- Built-in PHP/JavaScript/Python support
- Docker integration
- Git integration
- Database tools

## Release Process

1. Update version in `package.json`, `composer.json`, `setup.py`
2. Create release notes in `CHANGELOG.md`
3. Create git tag: `git tag v1.2.3`
4. Push tag: `git push origin v1.2.3`
5. GitHub Actions builds and deploys
6. Verify deployment health

## Getting Help

- Check existing issues and discussions
- Read related code (tests are great examples)
- Ask in development team channels
- Review similar PRs for patterns
