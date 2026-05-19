<!-- refreshed: 2026-05-19 -->
# Coding Conventions

**Analysis Date:** 2026-05-19

## Naming Patterns

**Files:**
- TypeScript/React: `camelCase.ts` for utilities, `PascalCase.tsx` for components
  - Example: `useDemoFetch.ts`, `DemoHistoryTable.tsx`, `api.ts`
- Test files: `{ComponentName}.test.tsx` or `{name}.spec.ts`
  - Located co-located in `__tests__/` directory or alongside source in `e2e/` directory
- PHP: `PascalCase.php` for classes
  - Example: `User.php`, `UserRepository.php`, `ResultIngestHandler.php`
- Python: `snake_case.py` for modules
  - Example: `import_worker.py`, `sharecode_parser.py`

**Functions:**
- TypeScript/JavaScript: `camelCase` for all functions
  - Hooks: `use{FeatureName}` pattern (e.g., `useDemoFetch`, `usePolling`, `usePlayerComparison`)
  - Components: `PascalCase` only
- PHP: `camelCase` for method names, `PascalCase` for class names
- Python: `snake_case` for functions and methods

**Variables:**
- TypeScript/JavaScript: `camelCase` consistently
- PHP: `$camelCase` for variable names, `$CONSTANT_CASE` for constants
- Python: `snake_case` for variables

**Types:**
- TypeScript: `PascalCase` for interfaces and types
  - Example: `UseDemoFetchResult`, `Demo`, `AnalysisResult`, `DemoEventsResponseDto`
- PHP: Type hints use `PascalCase` for class names, `type` hints on properties
  - Example: `private Uuid $id`, `private string $steamId`
- Python: Type hints using standard Python conventions

## Code Style

**Formatting:**
- **Frontend (TypeScript/React):**
  - No explicit formatter configured; uses Next.js ESLint defaults
  - 2-space indentation implied by linter config
  - Template strings preferred over concatenation

- **Backend (PHP):**
  - PHP-CS-Fixer configured but not enforced in current setup
  - Symfony style conventions preferred (based on require-dev structure)
  - 4-space indentation standard for PHP

- **Python:**
  - Standard Python PEP 8 conventions
  - 4-space indentation

**Linting:**
- **Frontend:** ESLint 9 with `eslint-config-next` (core-web-vitals + TypeScript)
  - Config: `eslint.config.mjs` in `frontend/`
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
  - Rules from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

- **Backend:** No linter enforced in runtime, but dependencies available for manual checks
  - PHP-CS-Fixer available as dev dependency for style checks
  - PHPStan/Psalm not configured (could be added)

- **Run command:**
  ```bash
  npm run lint  # Frontend linting
  ```

## Import Organization

**Order (TypeScript/React):**
1. External dependencies from `node_modules` (e.g., `import axios from 'axios'`, `import { expect, test } from '@playwright/test'`)
2. Internal absolute imports using `@/` alias
3. React hooks from `next/` or `@tanstack/react-query`
4. Type imports grouped last

**Path Aliases:**
- Frontend: `@/*` maps to root of `frontend/` directory
  - Example: `import { Demo } from '@/lib/types'`
- PHPUnit: PSR-4 autoload
  - `App\` → `src/`
  - `App\Tests\` → `tests/`

**Example (TypeScript):**
```typescript
import axios from 'axios'
import type { Demo, Feature } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
```

## Error Handling

**Patterns:**
- **TypeScript/React:** Async/await with try/catch for API calls
  - Example from `useDemoFetch.ts`: Return error state in hook result object
  - Components catch and display errors via UI state

- **PHP (Symfony):** Exceptions propagate up, caught at handler level
  - Example from tests: `expectException(\InvalidArgumentException::class)` pattern
  - Handlers use Symfony's exception listeners

- **Python:** Standard try/except with proper logging

## Logging

**Framework:**
- **TypeScript/React:** `console` object for client-side debugging
  - Structured logging via `console.log()` with descriptive prefixes
  - Example: `console.log('[E2E Session Mock] Returning authenticated user session')`

- **PHP:** Symfony's logger service (PSR-3)
  - Injected via dependency injection

- **Python:** Python's standard `logging` module

**Patterns:**
- Log at request/response boundaries (API calls)
- Include context identifiers (user IDs, demo IDs, request IDs)
- Avoid logging sensitive data (passwords, tokens)

## Comments

**When to Comment:**
- Comment "why", not "what" — code should be self-documenting
- Complex algorithms or business logic requiring explanation
- Workarounds and their justifications
- Integration points with external systems

**JSDoc/TSDoc:**
- Used for public functions and hooks
- Include `@param`, `@returns` tags
- Example from `useDemoFetch.ts`:
  ```typescript
  /**
   * Wrapper hook around usePolling for cleaner API.
   * Returns demo data with loading and error states.
   */
  export function useDemoFetch(demoId: string): UseDemoFetchResult
  ```

- PHP: Type hints replace PHPDoc in most cases; use PHPDoc for complex return types
- Example from `User.php`:
  ```php
  public function getId(): Uuid
  {
      return $this->id;
  }
  ```

## Function Design

**Size:**
- Keep functions small and focused (single responsibility)
- React hooks typically 20-50 lines
- Service methods/functions typically under 30 lines

**Parameters:**
- Prefer object parameters over many primitives
- Example: `DemoFetchOptions` object instead of 5 boolean flags
- Use typed interfaces for complex parameter lists

**Return Values:**
- Explicitly type all returns (TypeScript strict mode enabled)
- Return objects that bundle related values (e.g., `{ data, isLoading, error }`)
- Use `Promise<T>` for async functions explicitly

## Module Design

**Exports:**
- Named exports preferred over default exports
  - Exception: React components with lifecycle can use default
- Example: `export function useDemoFetch(...)` not `export default useDemoFetch`

- PHP: Single class per file (PSR-1)
  - Example: `class User` lives alone in `User.php`

**Barrel Files:**
- Used selectively in `lib/` directories
- Example: Re-export types from `lib/types.ts`
- Not overused; avoid circular dependencies

## Commit Message Conventions

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `test:` Adding/updating tests
- `chore:` Build, dependencies, tooling
- `refactor:` Code restructuring without feature change

**Scope (optional):**
- Area affected: `feat(api):`, `test(frontend):`, `docs(22):`
- Phase number for phase work: `feat(24-03):`, `test(24-04):`

**Subject:**
- Imperative mood: "add" not "added" or "adds"
- No period at end
- Under 50 characters

**Body:**
- Explain why, not what
- Wrap at 72 characters
- Separate from subject with blank line

**Examples from codebase:**
```
feat: add steamid link to steam profile and fix match detail navigation

feat(24-03): assemble match detail route

test(24-04): verify match detail page

docs(22): complete phase 22 plan 04 - transformer integration

chore: commit all phase 20, 21, 22 artifacts and remaining uncommitted changes
```

## Type Safety

**TypeScript:**
- `strict: true` enabled in `tsconfig.json`
- `noEmit: true` for type checking
- All public APIs have explicit return types
- No `any` types without `// @ts-ignore` comment explaining why

**PHP:**
- `declare(strict_types=1);` required at top of every file
  - Example: `<?php declare(strict_types=1);`
- All method parameters and returns must be typed
- Type hints required for properties (via attributes)

**Python:**
- Type hints using `typing` module
- Runtime type checking via pytest fixtures

## Documentation Standards

**Code Files:**
- Module-level docstring explaining purpose
- Public function/method docstrings with params and return type
- Complex business logic inline comments

**README/Generated Docs:**
- Markdown format
- Include setup, running, and testing instructions
- Link to relevant phase documentation

**Test Files:**
- Test names are self-documenting
- describe blocks explain what is being tested
- No separate comments needed if test name is clear

---

*Convention analysis: 2026-05-19*
