<!-- refreshed: 2026-05-19 -->
# Testing Patterns

**Analysis Date:** 2026-05-19

## Frontend Testing

### Test Framework

**Runner:**
- Jest 30.4.2 (via Next.js)
- Config: `frontend/jest.config.ts`

**Assertion Library:**
- Jest built-in assertions
- React Testing Library for component testing (v16.3.2)
- User Event for user interaction simulation (v14.6.1)

**Run Commands:**
```bash
npm run test              # Run all Jest tests once
npm run test:watch       # Watch mode (re-run on file changes)
npm run e2e              # Run Playwright E2E tests
```

### Test File Organization

**Location:**
- Unit/integration tests: `frontend/__tests__/` directory (co-located with component structure)
  - Mirrors `components/` directory structure
  - Example: `components/DemoHistoryTable.tsx` → `__tests__/components/DemoHistoryTable.test.tsx`
- E2E tests: `frontend/e2e/` directory
  - Named with `.spec.ts` suffix

**Naming:**
- Format: `{ComponentName}.test.tsx` for components
- Format: `{description}.spec.ts` for E2E tests
- Examples:
  - `DemoHistoryTable.test.tsx`
  - `MapCanvas.test.tsx`
  - `landing-auth-dashboard.spec.ts`
  - `demo-viewer.spec.ts`

**Structure:**
```
frontend/
├── __tests__/
│   └── components/
│       ├── Analytics/
│       │   ├── FilterSidebar.test.tsx
│       │   ├── SensitivityTuner.test.tsx
│       │   └── TrendChart.test.tsx
│       ├── DemoViewer/
│       │   ├── GrenadeInspector.test.tsx
│       │   ├── HeatmapViewer.test.tsx
│       │   ├── MapCanvas.test.tsx
│       │   ├── SuspicionPanel.test.tsx
│       │   └── Timeline.test.tsx
│       └── DemoHistoryTable.test.tsx
└── e2e/
    ├── landing-auth-dashboard.spec.ts
    ├── demo-viewer.spec.ts
    ├── upload-flow.spec.ts
    └── ...
```

### Test Structure

**Setup:**
- Jest setup file: `jest.setup.ts`
  - Mocks Next.js navigation (`next/navigation`, `next/link`)
  - Mocks React Query (`@tanstack/react-query`)
  - Suppresses expected console warnings (useLayoutEffect on server, form.submit)

**Suite Organization:**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { fetchUserDemos } from '@/lib/api'

// Mock external dependencies
jest.mock('@/lib/api', () => ({
  fetchUserDemos: jest.fn(),
}))

const mockedFetchUserDemos = fetchUserDemos as jest.Mock

describe('DemoHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders history rows with console status language', async () => {
    // Arrange
    mockedFetchUserDemos.mockResolvedValue({
      demos: [/* test data */],
      pagination: { total: 2, page: 1, limit: 20, hasMore: false },
    })

    // Act
    render(<DemoHistoryTable />)

    // Assert
    expect(screen.getByText(/loading demo history/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('demo-history-1').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Analyzed').length).toBeGreaterThan(0)
  })
})
```

**Patterns:**
- AAA pattern: Arrange, Act, Assert
- `beforeEach()` to reset mocks before each test
- `jest.clearAllMocks()` in beforeEach to prevent state leakage
- `waitFor()` for async operations and DOM updates

### Mocking

**Framework:** Jest built-in mocking

**Patterns:**
```typescript
// Mock module
jest.mock('@/lib/api', () => ({
  fetchUserDemos: jest.fn(),
}))

// Type the mock for autocomplete
const mockedFetchUserDemos = fetchUserDemos as jest.Mock

// Configure return value
mockedFetchUserDemos.mockResolvedValue({
  demos: [],
  pagination: { total: 0, page: 1, limit: 20, hasMore: false },
})

// Configure error
mockedFetchUserDemos.mockRejectedValueOnce(new Error('History unavailable'))

// Verify calls
expect(mockedFetchUserDemos).toHaveBeenCalledWith(1, 20, 'date', 'desc')
```

**What to Mock:**
- API calls (fetch, axios)
- Next.js navigation hooks
- React Query hooks
- External services
- Third-party libraries

**What NOT to Mock:**
- React Testing Library utilities
- Component rendering
- User interactions
- Custom hooks (test them directly)
- Simple utilities (test the real implementation)

### Fixtures and Factories

**Test Data:**
- Inline mock data within test functions
- Example:
  ```typescript
  const mockDemo = {
    id: 'demo-history-1',
    status: 'done',
    created_at: '2026-05-18T10:00:00Z',
    results: { overall_score: 72, players: [] },
  }
  ```

**Location:**
- Not formalized yet — consider creating `frontend/__tests__/fixtures/` if data becomes complex
- Currently data is inline in tests or small helper functions within test files

## Backend Testing (PHP/Symfony)

### Test Framework

**Runner:**
- PHPUnit 12.5
- Config: `symfony/phpunit.xml.dist`

**Run Commands:**
```bash
# Run all tests (in Docker container)
docker compose -f docker-compose.test.yml run --rm web

# Run specific test file
TEST_ONLY="./tests/TestCase/Service/UserServiceTest.php" \
docker compose -f docker-compose.test.yml run --rm web

# Run specific test method
TEST_ONLY="--filter testMethodName ./tests/TestCase/Service/UserServiceTest.php" \
docker compose -f docker-compose.test.yml run --rm web
```

**Important:** Always run PHP tests in Docker containers to ensure consistent PHP version and environment.

### Test File Organization

**Location:**
- `symfony/tests/` directory
- Mirrors `src/` directory structure
- Format: `{ClassName}Test.php`

**Structure:**
```
symfony/tests/
├── bootstrap.php                              # PHPUnit bootstrap
├── Application/
│   └── ResultIngestHandlerTest.php
├── Domain/
│   └── DomainModelTest.php
└── Repository/
    └── UserRepositoryTest.php
```

**Naming:**
- Test classes: `{ClassBeingTested}Test`
- Test methods: `test{MethodName}{Scenario}` or `it_{describes_scenario}`
- Examples from codebase:
  - `testHandlerWritesResultsAndMarksDemoDone()`
  - `testHandlerCanMarkDemoError()`
  - `testFindBySteamIdReturnsUserWhenExists()`
  - `testCreateOrUpdateCreatesNewUser()`

### Test Structure

**Template:**
```php
<?php

declare(strict_types=1);

namespace App\Tests\Repository;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class UserRepositoryTest extends KernelTestCase
{
    private UserRepository $userRepository;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->userRepository = self::getContainer()->get(UserRepository::class);
    }

    public function testFindBySteamIdReturnsUserWhenExists(): void
    {
        // Arrange: Create test data
        $user = new User('123456789', 'TestPlayer', 'https://avatars.example.com/avatar.jpg');
        $this->userRepository->getEntityManager()->persist($user);
        $this->userRepository->getEntityManager()->flush();

        // Act: Call the method under test
        $found = $this->userRepository->findBySteamId('123456789');

        // Assert: Verify the outcome
        $this->assertNotNull($found);
        $this->assertEquals('123456789', $found->getSteamId());
    }
}
```

**Patterns:**
- Extend `KernelTestCase` for integration tests (access to Symfony container)
- Call `self::bootKernel()` in `setUp()` to initialize the test kernel
- Use dependency injection to get services: `self::getContainer()->get(SomeService::class)`
- Clear state between tests (manual truncate in some tests, or use database rollback)
- AAA pattern: Arrange, Act, Assert

### Common Assertions

```php
// Equality
$this->assertEquals($expected, $actual);
$this->assertSame($expected, $actual);  // Strict comparison

// Boolean
$this->assertTrue($condition);
$this->assertFalse($condition);

// Null
$this->assertNull($value);
$this->assertNotNull($found);

// Collections
$this->assertCount(1, $stored->getAnalysisResults());
$this->assertEmpty($array);
$this->assertNotEmpty($array);

// Type
$this->assertInstanceOf(Demo::class, $stored);
$this->assertSame(DemoStatus::Done, $stored->getStatus());

// String
$this->assertEquals('error message', $stored->getErrorMessage());
$this->assertStringContainsString('substring', $text);

// Exception
$this->expectException(\InvalidArgumentException::class);
$this->validator->validate('invalid');
```

### Mocking and Test Doubles

**Mocks (PHPUnit built-in):**
```php
// Create a mock object
$repository = $this->createMock(UserRepository::class);

// Set expectations
$repository->expects($this->once())
    ->method('findById')
    ->with(1)
    ->willReturn(new User(['id' => 1, 'name' => 'John']));

// Use in test
$service = new UserService($repository);
$user = $service->getUser(1);
```

**Stubs (no call expectations):**
```php
$repository = $this->createStub(UserRepository::class);
$repository->method('findAll')
    ->willReturn([
        new User(['id' => 1, 'name' => 'John']),
    ]);
```

## E2E Testing (Playwright)

### Test Framework

**Runner:**
- Playwright Test 1.60.0
- Config: `frontend/playwright.config.ts`

**Run Commands:**
```bash
npm run e2e                  # Run all E2E tests
npx playwright test --headed # Run with browser visible
npx playwright test --debug  # Debug mode with inspector
```

**Configuration Details:**
```typescript
// frontend/playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Starts dev server automatically
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test File Organization

**Location:**
- `frontend/e2e/` directory
- Suffix: `.spec.ts`

**Naming:**
- Format: `{feature-name}.spec.ts`
- Examples from codebase:
  - `landing-auth-dashboard.spec.ts`
  - `demo-viewer.spec.ts`
  - `upload-flow.spec.ts`
  - `analytics-integration.spec.ts`
  - `error-handling.spec.ts`

### Test Structure

**Page Object Model Pattern:**
```typescript
// Define page interactions in setup
test.beforeEach(async ({ page }) => {
  // Mock API endpoints
  await page.route('**/api/auth/steam-verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-jwt-token-12345',
        user_id: 'test-user-123',
      }),
    })
  })
})

// Test critical user flows
test.describe('Phase 14: Landing Page + Steam Login + Dashboard', () => {
  test('user can login and view dashboard', async ({ page }) => {
    await page.goto('/')
    
    // Interact with page
    await page.getByRole('button', { name: 'Login with Steam' }).click()
    
    // Assert visible elements
    await expect(page.getByText('Welcome')).toBeVisible()
  })
})
```

**Patterns:**
- Use `test.describe()` for test suites
- Use `test.beforeEach()` for common setup
- Use `test.step()` for documenting multi-step flows
- Auto-wait: Playwright waits for elements automatically before interacting
- Use `data-testid` for stable element selection

**Example from codebase:**
```typescript
test.describe('Phase 14: Landing Page + Steam Login + Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Steam OpenID endpoint
    await page.route('**/api/auth/steam-verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-12345',
          user_id: 'test-user-123',
          steam_id: '76561198999999999',
        }),
      })
    })
  })

  test('authenticated user sees dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Dashboard')).toBeVisible()
  })
})
```

### Locator Strategies

**Recommended (stable):**
```typescript
// Role-based (most stable)
await page.getByRole('button', { name: 'Submit' }).click()
await page.getByRole('heading', { name: 'Dashboard' })

// Label text
await page.getByLabel('Email address')

// Test ID
await expect(page.getByTestId('suspicion-panel')).toContainText('snap_ratio')
```

**Avoid (fragile):**
```typescript
// CSS selectors based on structure
await page.locator('.btn.btn-primary').click()  // ❌ Fragile

// XPath
await page.locator('//form/div/input')  // ❌ Fragile

// nth-child
await page.locator('div > form > div:nth-child(2) > input')  // ❌ Fragile
```

### Network Mocking

**Mock API Responses:**
```typescript
await page.route('**/api/users', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ users: [] }),
  })
})
```

**Wait for API Responses:**
```typescript
// Wait for specific response
const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/users') && response.status() === 200,
)
await page.getByRole('button', { name: 'Load Users' }).click()
const response = await responsePromise
const data = await response.json()
```

### Debugging Failing Tests

```typescript
// Run in headed mode (see browser)
npx playwright test --headed

// Run in debug mode (opens inspector)
npx playwright test --debug

// Pause execution to inspect state
await page.pause()

// Take screenshots
await page.screenshot({ path: 'screenshot.png' })

// Trace viewer for detailed debugging
export default defineConfig({
  use: {
    trace: 'on-first-retry',
  },
})
```

## Python Testing (ML Pipeline)

### Test Framework

**Runner:**
- pytest >= 7.0.0 (in `requirements.txt`)
- pytest-cov >= 4.0.0 (for coverage)

**Run Commands:**
```bash
pytest                           # Run all tests
pytest --cov                     # With coverage report
pytest -v                        # Verbose output
pytest -k "test_name_pattern"   # Run specific tests
```

### Test Organization

**Location:**
- `python/` directory (pytest discovery default)
- Test files: `test_*.py` or `*_test.py`

**Structure:**
- Tests are discovered automatically by pytest
- Use `@pytest.fixture` for setup/teardown
- Use `@pytest.mark.parametrize` for data-driven tests

## Coverage Requirements

**Frontend (Jest):**
- No minimum coverage enforced in current setup
- Coverage reports generated to `frontend/coverage/` directory
- Run `npm run test` to generate coverage

**Backend (PHPUnit):**
- Coverage configuration in `phpunit.xml.dist`
- No minimum enforced but coverage tracked
- Run tests with `--coverage` flag if PHPUnit extended with coverage driver

**Python:**
- Coverage tracking via pytest-cov
- Run `pytest --cov` for coverage report

## CI/CD Integration

**Frontend Tests in CI:**
- ESLint: `npm run lint` (configured in package.json)
- Jest: `npm run test` (automatic in CI environment)
- Playwright E2E: `npm run e2e` (runs against deployed app or local dev server)

**Backend Tests in CI:**
- Docker-based execution via `docker-compose.test.yml`
- PHPUnit runs automatically via test bootstrap

**Python Tests in CI:**
- pytest runs on ML pipeline code

## Test Coverage Gaps

**Frontend:**
- Canvas-based rendering (MapCanvas) mocked with `getContext()` returning null
- Some interactions with external libraries may not be fully tested
- E2E tests focus on happy paths and critical flows

**Backend:**
- Limited unit tests; most tests are integration tests using real database
- Manual database cleanup in tests (TRUNCATE statements) — consider using transactions

**Python:**
- Limited test coverage observed; development-stage code

## Known Testing Issues (as of Phase 24)

1. **TypeScript Type Checking:**
   - Standalone `tsc --noEmit` blocked by pre-existing E2E type issues
   - Frontend type checking works within Jest/Next.js build pipeline
   - Recommendation: Fix E2E type issues before enforcing strict type checking

2. **Flaky E2E Tests:**
   - Network mocking in Playwright can be sensitive to timing
   - Some tests have 2 retries configured in CI
   - Recommendation: Use proper wait conditions instead of timeouts

3. **Database State in Tests:**
   - Manual TRUNCATE in each test leads to test isolation issues
   - Recommendation: Implement transaction-based rollback for cleaner test isolation

## Best Practices Summary

**Frontend (Jest/React Testing Library):**
- ✅ Test user behavior, not implementation details
- ✅ Use `data-testid` sparingly; prefer role-based queries
- ✅ Mock external APIs, not internal components
- ✅ Clear mocks between tests with `beforeEach(() => jest.clearAllMocks())`
- ✅ Use `waitFor()` for async operations

**Backend (PHPUnit):**
- ✅ Use `declare(strict_types=1)` in all test files
- ✅ Extend `KernelTestCase` for integration tests
- ✅ Describe test scenario in method name
- ✅ Arrange-Act-Assert pattern
- ✅ Clean up test data in test or use database transactions

**E2E (Playwright):**
- ✅ Test critical user journeys only
- ✅ Use role-based locators
- ✅ Mock external APIs to reduce flakiness
- ✅ Use Page Object Model for complex flows
- ✅ Avoid fixed timeouts; use proper wait conditions

---

*Testing analysis: 2026-05-19*
