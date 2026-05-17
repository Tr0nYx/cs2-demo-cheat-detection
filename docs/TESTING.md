# Testing Strategy

Comprehensive testing approach for all system components.

## Overview

The project uses a layered testing strategy:

```
┌──────────────────────────────────────┐
│      E2E Tests (Playwright)          │  Full user workflows
├──────────────────────────────────────┤
│    Integration Tests                 │  Component boundaries
├──────────────────────────────────────┤
│      Unit Tests                      │  Individual modules
└──────────────────────────────────────┘
```

## Running All Tests

```bash
# Run all tests (frontend + backend + Python)
make test

# Run specific suites
make test-php
make test-python
make test-frontend    # (if defined)
```

## Frontend Tests

### Unit Tests (Jest)

**Location:** `frontend/__tests__/`

```bash
# Run all tests
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Coverage report
npm test -- --coverage
```

**Test Structure:**

```typescript
// __tests__/components/DemoViewer.test.tsx
import { render, screen } from '@testing-library/react'
import { DemoViewer } from '@/components/DemoViewer'

describe('DemoViewer', () => {
  it('should render demo metadata', () => {
    const demo = { id: '123', map: 'de_dust2' }
    render(<DemoViewer demo={demo} />)
    expect(screen.getByText('de_dust2')).toBeInTheDocument()
  })

  it('should handle timeline scrub', async () => {
    render(<DemoViewer demo={mockDemo} />)
    const timeline = screen.getByRole('slider')
    await userEvent.click(timeline)
    // Assert state update
  })
})
```

**Guidelines:**
- Test user interactions, not implementation details
- Use `data-testid` for hard-to-select elements
- Mock API calls with `jest.mock()`
- Keep tests focused and isolated
- Use `@testing-library/react` best practices

### E2E Tests (Playwright)

**Location:** `frontend/e2e/`

```bash
# Run all E2E tests
npm run e2e

# Run specific test
npm run e2e -- demo-viewer.spec.ts

# Run in headed mode (see browser)
npm run e2e -- --headed

# Debug mode
npm run e2e -- --debug
```

**Test Structure:**

```typescript
// e2e/demo-viewer.spec.ts
import { test, expect } from '@playwright/test'

test('user can view demo heatmap', async ({ page }) => {
  // Navigate to demo
  await page.goto('/results/123')
  
  // Wait for heatmap to load
  await page.waitForSelector('canvas')
  
  // Verify heatmap is visible
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  
  // Scrub timeline
  const timeline = page.locator('input[type="range"]')
  await timeline.fill('50')
  
  // Verify data updated
  await expect(page.locator('[data-testid="frame-count"]'))
    .toContainText('Frame: 50')
})
```

**Best Practices:**
- Test complete user workflows (upload → view → analyze)
- Use `page.goto()` for navigation
- Wait for elements with `waitForSelector()` or `locator().fill()`
- Test across browsers (Chrome, Firefox, Safari via Playwright)
- Run in CI for every PR

## Backend Tests

### Unit Tests (PHPUnit)

**Location:** `symfony/tests/`

```bash
# Run all tests
make test-php

# Run specific test
php vendor/bin/phpunit tests/Application/HandlerTest.php

# Run with coverage
php vendor/bin/phpunit --coverage-html htmlcov
```

**Test Structure:**

```php
// tests/Application/Handler/AnalyzeDemoHandlerTest.php
namespace App\Tests\Application\Handler;

use PHPUnit\Framework\TestCase;
use App\Application\Handler\AnalyzeDemoHandler;

class AnalyzeDemoHandlerTest extends TestCase
{
    private AnalyzeDemoHandler $handler;
    private DemoRepository $demoRepo;

    protected function setUp(): void
    {
        // Use real repository or mock
        $this->demoRepo = $this->createMock(DemoRepository::class);
        $this->handler = new AnalyzeDemoHandler($this->demoRepo);
    }

    public function testHandleEnqueuesDemoAnalysis(): void
    {
        $demo = Demo::create('path/to/demo.dem');
        $command = new AnalyzeDemoCommand($demo);

        $this->demoRepo->expects($this->once())
            ->method('save')
            ->with($this->callback(fn($d) => $d->status === 'queued'));

        $result = $this->handler->handle($command);

        $this->assertInstanceOf(AnalysisResult::class, $result);
    }
}
```

**Guidelines:**
- Test handlers, repositories, and domain logic
- Mock external dependencies (file storage, APIs)
- Use fixtures for test data
- Assert on domain objects, not SQL queries
- Keep tests isolated and repeatable
- Test both happy path and error cases

### Integration Tests

**Location:** `symfony/tests/Integration/`

```php
// tests/Integration/DemoUploadFlowTest.php
class DemoUploadFlowTest extends WebTestCase
{
    public function testDemoUploadStartsAnalysis(): void
    {
        $client = static::createClient();
        
        // Upload demo
        $client->request('POST', '/api/demos', [], [
            'file' => new UploadedFile(
                'fixtures/demo.dem',
                'demo.dem',
                'application/octet-stream'
            )
        ]);

        $this->assertResponseStatusCodeSame(200);
        
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEquals('queued', $data['status']);
    }
}
```

**What to Test:**
- API endpoint contracts
- Job enqueuing
- Database persistence
- Cross-component workflows

## Python Tests

### Unit Tests (Pytest)

**Location:** `python/tests/`

```bash
# Run all tests
make test-python

# Run specific test
pytest python/tests/test_demo_parser.py::test_parse_demo

# Watch mode
pytest-watch

# Coverage
pytest --cov=python
```

**Test Structure:**

```python
# tests/test_demo_parser.py
import pytest
from python.parser import DemoParser
from python.domain import Demo

@pytest.fixture
def demo_file():
    """Fixture: load test demo file."""
    return 'fixtures/demo.dem'

def test_parse_demo_extracts_players(demo_file):
    """Test that parser extracts all players."""
    parser = DemoParser()
    demo = parser.parse(demo_file)
    
    assert len(demo.players) == 10  # 5v5
    assert all(p.name for p in demo.players)

def test_parse_demo_extracts_events(demo_file):
    """Test that parser extracts all events."""
    parser = DemoParser()
    demo = parser.parse(demo_file)
    
    assert len(demo.events) > 0
    assert any(e.type == 'shot' for e in demo.events)

@pytest.mark.parametrize('expected_kills', [15, 20, 25])
def test_kill_count_varies_by_demo(expected_kills):
    """Test with different demo files."""
    # Parameterized test
    pass
```

**Guidelines:**
- Use fixtures for test data (demo files, configs)
- Test parsing, feature extraction, model inference separately
- Use pytest marks (`@pytest.mark.slow`) for slow tests
- Mock external model loading
- Keep tests deterministic (no randomness)

## Test Data

### Demo Files

Test demo files stored in:
- `frontend/__tests__/fixtures/` (frontend tests)
- `symfony/tests/fixtures/` (backend tests)
- `python/tests/fixtures/` (Python tests)

### Creating Test Data

```python
# Generate synthetic demo for testing
from python.domain import Demo, Player, Event

def create_test_demo():
    demo = Demo(id='test-123', map='de_dust2')
    demo.add_player(Player(id='1', name='Player1', team='T'))
    demo.add_player(Player(id='2', name='Player2', team='CT'))
    demo.add_event(Event(type='shot', player_id='1', tick=100))
    return demo
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main` or PR
- Nightly scheduled runs
- Manual trigger

**Pipeline:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run frontend tests
        run: cd frontend && npm test
      - name: Run backend tests
        run: make test-php
      - name: Run Python tests
        run: make test-python
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Frontend Components | 80% | 75% |
| Backend Handlers | 85% | 82% |
| Python ML Pipeline | 80% | 78% |
| Integration Tests | 70% | 65% |

## Debugging Failed Tests

### Frontend

```bash
# Run single test in watch mode
npm test -- DemoViewer.test

# Run with logs
npm test -- --verbose

# Debug in browser
npm run e2e -- --debug

# Check screenshots
ls frontend/test-results/
```

### Backend

```bash
# Run single test with output
php vendor/bin/phpunit tests/Application/Handler/Test.php -v

# Stop on first failure
php vendor/bin/phpunit -x

# Dump debug info
dump($variable);  // In test code
```

### Python

```bash
# Run single test with output
pytest python/tests/test_parser.py::test_name -v

# Show print statements
pytest -s

# Drop into debugger
import pdb; pdb.set_trace()  # In test code
```

## Performance Testing

### Load Testing (Optional)

```bash
# Use Apache Bench or k6
ab -n 1000 -c 10 http://localhost/api/demos

# Or with k6
k6 run tests/load.js
```

### Profiling

```bash
# Frontend bundle size
npm run build
npx bundle-analyzer .next/standalone/.next

# Backend query profiling
# Enable Symfony Profiler in dev environment
```

## Test Maintenance

- **Review test failures** immediately on CI
- **Update tests** when requirements change
- **Remove obsolete tests** to keep suite fast
- **Keep fixtures up-to-date** with schema changes
- **Monitor coverage** to identify gaps

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [PHPUnit Documentation](https://phpunit.de/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about/)
