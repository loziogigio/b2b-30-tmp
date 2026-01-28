# Testing Standards for vinc-b2b

Comprehensive testing standards for the Next.js 15 / TypeScript / Vitest project.

## Philosophy

Our testing approach follows these principles:

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Fast feedback loops** - Run tests frequently during development
3. **Confidence in deployment** - Tests should give confidence that production will work
4. **Maintainable tests** - Tests should be easy to understand and update
5. **Pragmatic coverage** - Aim for high coverage of critical paths, not 100% everywhere

## Test Pyramid

```
         /\
        /  \         E2E Tests (10-20%)
       /    \        - Playwright
      /______\       - Critical user journeys
     /        \      - Real browser
    /          \     Integration Tests (20-30%)
   /            \    - API routes
  /              \   - Real service interactions
 /                \  Unit Tests (50-70%)
/                  \ - Fast, isolated
____________________\- Business logic
                     - No external dependencies
```

### Target Distribution

| Test Type   | Percentage | Execution Time |
| ----------- | ---------- | -------------- |
| Unit        | 60-70%     | ~2 seconds     |
| Integration | 20-30%     | ~10 seconds    |
| E2E         | 10-20%     | ~30 seconds    |

---

## Tech Stack

| Tool                       | Purpose                         |
| -------------------------- | ------------------------------- |
| **Vitest**                 | Test runner (fast, Vite-native) |
| **@testing-library/react** | React component testing         |
| **jsdom**                  | DOM environment for tests       |
| **Playwright**             | E2E browser testing (optional)  |

---

## Test Types

### 1. Unit Tests

**What to test**:

- Business logic functions
- Data validation
- Calculations and transformations
- Edge cases and error conditions
- Pure utility functions
- Reducers and state logic

**Characteristics**:

- Fast (< 0.1s per test)
- Isolated (no external dependencies)
- Precise (test one thing)
- Mocked (all external calls mocked)

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from '@framework/push';

describe('unit: urlBase64ToUint8Array', () => {
  it('should convert base64 VAPID key to Uint8Array', () => {
    /**
     * Test base64 to Uint8Array conversion for VAPID keys.
     */
    // Arrange
    const base64Key = 'BNhRi0dculcGqcy6fFhTI7QMQ';

    // Act
    const result = urlBase64ToUint8Array(base64Key);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

**File location**: `src/test/unit/{module}.test.ts`

---

### 2. Integration Tests

**What to test**:

- Next.js API route handlers
- Service layer interactions
- Multiple components working together
- Error handling across layers

**Characteristics**:

- Real dependencies where practical
- Full stack (API → Service → External)
- Data persistence verified
- Automatic cleanup between tests

**Example**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock external dependencies
vi.mock('@framework/utils/httpB2B', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));

import { subscribe, getVapidPublicKey } from '@framework/push';
import * as http from '@framework/utils/httpB2B';

describe('integration: Push API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe with correct user_id format', async () => {
    /**
     * Test that subscription sends correct payload format.
     */
    // Arrange
    vi.mocked(http.post).mockResolvedValueOnce({ success: true });
    const subscription = {
      endpoint: 'https://push.example.com/abc',
      keys: { p256dh: 'key1', auth: 'key2' },
    };

    // Act
    await subscribe(subscription);

    // Assert
    expect(http.post).toHaveBeenCalledWith(
      '/push/subscribe',
      expect.objectContaining({
        user_id: expect.stringMatching(/^.+-\d+-\d+$/),
        subscription,
      }),
    );
  });
});
```

**File location**: `src/test/api/{module}.test.ts`

---

### 3. Hook Tests

**What to test**:

- React hooks behavior
- State transitions
- Side effects
- Browser API interactions (mocked)

**Example**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '@/hooks/use-push-notifications';

// Mock browser APIs
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(),
};

vi.stubGlobal('Notification', mockNotification);
vi.stubGlobal('navigator', {
  serviceWorker: {
    register: vi.fn(),
    ready: Promise.resolve({ pushManager: {} }),
  },
});

describe('unit: usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotification.permission = 'default';
  });

  it('should detect browser support', () => {
    // Act
    const { result } = renderHook(() => usePushNotifications());

    // Assert
    expect(result.current.isSupported).toBe(true);
  });
});
```

**File location**: `src/test/hooks/{hook-name}.test.ts`

---

### 4. End-to-End (E2E) Tests

**What to test**:

- Complete user journeys
- Multi-step workflows
- Real-world scenarios
- Cross-module interactions

**Example** (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test.describe('e2e: Push Notification Flow', () => {
  test('should enable push notifications', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // 2. Go to settings
    await page.goto('/account/settings');

    // 3. Enable notifications
    await page.click('[data-testid="enable-notifications"]');

    // 4. Verify
    await expect(
      page.locator('[data-testid="notifications-enabled"]'),
    ).toBeVisible();
  });
});
```

**File location**: `e2e/{flow}.spec.ts`

---

## Test Structure

### File Organization

```
src/test/
  TESTING_STANDARDS.md  # This file
  setup.ts              # Vitest global setup
  conftest.ts           # Shared fixtures & factories
  unit/
    push.test.ts        # Unit tests for push module
    reducers.test.ts    # Reducer tests
  api/
    push-api.test.ts    # Integration tests
  hooks/
    use-push-notifications.test.ts
  components/
    Button.test.tsx     # React component tests

e2e/                    # Playwright E2E tests (optional)
  notifications.spec.ts
```

### Arrange-Act-Assert (AAA) Pattern

All tests should follow the AAA pattern:

```typescript
it('should do something', async () => {
  /**
   * Description of what is being tested.
   */
  // Arrange - Set up test data
  const input = createTestData();

  // Act - Perform the action
  const result = await functionUnderTest(input);

  // Assert - Verify the outcome
  expect(result.status).toBe('success');
});
```

### Test Naming Convention

Use descriptive names:

**Good**:

```typescript
it('should convert base64 VAPID key to Uint8Array');
it('should return denied when notification permission not granted');
it('should include user_id in subscription payload');
```

**Bad**:

```typescript
it('converts key');
it('test permission');
it('subscribe test');
```

---

## Mocking Strategy

### When to Mock

**Mock these**:

- External APIs (push servers, backend services)
- Browser APIs (Notification, ServiceWorker, localStorage)
- Session/auth state
- Non-deterministic behavior (nanoid, Date.now)

**Don't mock** (in integration tests):

- Business logic
- Data validation
- State reducers

### How to Mock

**1. Module-level mocking** (must be before imports):

```typescript
import { vi } from 'vitest';

vi.mock('@framework/utils/httpB2B', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));

// Import after mock
import { subscribe } from '@framework/push';
```

**2. Browser API mocking**:

```typescript
import { vi } from 'vitest';

// Mock Notification API
vi.stubGlobal('Notification', {
  permission: 'granted',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);
```

**3. Per-test mocking**:

```typescript
import { vi } from 'vitest';
import * as http from '@framework/utils/httpB2B';

it('should handle API error', async () => {
  vi.spyOn(http, 'post').mockRejectedValueOnce(new Error('Network error'));

  const result = await subscribe(subscription);
  expect(result.success).toBe(false);
});
```

---

## Test Fixtures

### Shared Fixtures (`conftest.ts`)

```typescript
import { vi } from 'vitest';
import { nanoid } from 'nanoid';

// Browser API mocks
export function setupBrowserMocks() {
  vi.stubGlobal('Notification', {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(() =>
      Promise.resolve('granted' as NotificationPermission),
    ),
  });

  vi.stubGlobal('navigator', {
    serviceWorker: {
      register: vi.fn(() => Promise.resolve({})),
      ready: Promise.resolve({
        pushManager: {
          subscribe: vi.fn(() =>
            Promise.resolve({
              endpoint: 'https://push.example.com/test',
              toJSON: () => ({
                endpoint: 'https://push.example.com/test',
                keys: { p256dh: 'test-key', auth: 'test-auth' },
              }),
            }),
          ),
          getSubscription: vi.fn(() => Promise.resolve(null)),
        },
      }),
    },
  });

  const storage: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    }),
  });
}

export function clearBrowserMocks() {
  vi.clearAllMocks();
}
```

### Factories

```typescript
export const PushSubscriptionFactory = {
  create(overrides?: Partial<PushSubscriptionData>) {
    return {
      endpoint: `https://push.example.com/${nanoid(10)}`,
      keys: {
        p256dh: `p256dh-${nanoid(20)}`,
        auth: `auth-${nanoid(10)}`,
      },
      ...overrides,
    };
  },
};

export const PushPreferencesFactory = {
  create(overrides?: Partial<PushPreferences>) {
    return {
      enabled: true,
      reminders: true,
      orders: true,
      promotions: false,
      updates: true,
      ...overrides,
    };
  },
};
```

---

## Running Tests

### Commands

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test push

# Watch mode
pnpm test --watch

# Run with UI
pnpm test --ui

# Coverage
pnpm test --coverage
```

### Vitest Configuration

**`vitest.config.ts`**:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@framework': path.resolve(__dirname, './src/framework/basic-rest'),
    },
  },
});
```

---

## Code Coverage

### Targets

| Component   | Target     |
| ----------- | ---------- |
| API clients | 85-95%     |
| Hooks       | 80-90%     |
| Reducers    | 90-95%     |
| Utilities   | 85-95%     |
| Components  | 70-80%     |
| **Overall** | **80-90%** |

### What Not to Cover

- Auto-generated code
- Type-only files
- Configuration files
- Debug/logging code

---

## Best Practices

### DO

1. Write tests first (TDD approach)
2. Test behavior, not implementation
3. Use descriptive test names
4. Keep tests simple and focused
5. Clean up test data between tests
6. Use factories for test data
7. Mock external dependencies
8. Test error cases
9. Verify edge cases

### DON'T

1. Don't test implementation details
2. Don't have tests depend on each other
3. Don't use hardcoded IDs (use nanoid)
4. Don't skip error cases
5. Don't mock internal business logic
6. Don't write brittle tests
7. Don't ignore failing tests
8. Don't aim for 100% coverage blindly

---

## Troubleshooting

### Browser API Mocking Issues

```typescript
// Make sure to mock before importing the module under test
vi.stubGlobal('Notification', mockNotification);
vi.stubGlobal('navigator', mockNavigator);

// Then import
import { usePushNotifications } from '@/hooks/use-push-notifications';
```

### Tests Failing Randomly

- Use unique test data (nanoid)
- Clear mocks in beforeEach()
- Check for race conditions

### Import Errors

Ensure mocks are defined before imports:

```typescript
// WRONG
import { subscribe } from '@framework/push';
vi.mock('@framework/utils/httpB2B');

// CORRECT
vi.mock('@framework/utils/httpB2B');
import { subscribe } from '@framework/push';
```

---

## Quick Reference

```bash
# All tests
pnpm test

# Specific file
pnpm test push

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage

# Specific test by name
pnpm test -t "should convert base64"
```

---

**Last Updated**: January 2026
**Version**: 1.0
**Status**: Active Standard
