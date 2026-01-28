import { vi } from 'vitest';
import type {
  PushSubscriptionData,
  PushPreferences,
} from '@framework/push/types';

// ============================================
// Browser API Mocks
// ============================================

export interface MockNotification {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
}

export interface MockPushManager {
  subscribe: ReturnType<typeof vi.fn>;
  getSubscription: ReturnType<typeof vi.fn>;
}

export interface MockServiceWorkerRegistration {
  pushManager: MockPushManager;
}

export interface MockServiceWorker {
  register: ReturnType<typeof vi.fn>;
  ready: Promise<MockServiceWorkerRegistration>;
}

export interface MockNavigator {
  serviceWorker: MockServiceWorker;
}

export interface MockStorage {
  store: Record<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

export function createMockNotification(
  permission: NotificationPermission = 'default',
): MockNotification {
  return {
    permission,
    requestPermission: vi.fn(() =>
      Promise.resolve('granted' as NotificationPermission),
    ),
  };
}

export function createMockPushSubscription(
  endpoint = 'https://push.example.com/test',
) {
  return {
    endpoint,
    unsubscribe: vi.fn(() => Promise.resolve(true)),
    toJSON: () => ({
      endpoint,
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    }),
  };
}

export function createMockPushManager(): MockPushManager {
  return {
    subscribe: vi.fn(() => Promise.resolve(createMockPushSubscription())),
    getSubscription: vi.fn(() => Promise.resolve(null)),
  };
}

export function createMockServiceWorker(): MockServiceWorker {
  const pushManager = createMockPushManager();
  const registration: MockServiceWorkerRegistration = { pushManager };

  return {
    register: vi.fn(() => Promise.resolve(registration)),
    ready: Promise.resolve(registration),
  };
}

export function createMockNavigator(): MockNavigator {
  return {
    serviceWorker: createMockServiceWorker(),
  };
}

export function createMockLocalStorage(): MockStorage {
  const store: Record<string, string> = {};

  return {
    store,
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
}

export function setupBrowserMocks(options?: {
  notificationPermission?: NotificationPermission;
}) {
  const mockNotification = createMockNotification(
    options?.notificationPermission,
  );
  const mockNavigator = createMockNavigator();
  const mockLocalStorage = createMockLocalStorage();

  vi.stubGlobal('Notification', mockNotification);
  vi.stubGlobal('navigator', mockNavigator);
  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.stubGlobal('window', {
    Notification: mockNotification,
    navigator: mockNavigator,
    localStorage: mockLocalStorage,
    atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
  });

  return {
    mockNotification,
    mockNavigator,
    mockLocalStorage,
  };
}

export function clearBrowserMocks() {
  vi.unstubAllGlobals();
}

// ============================================
// Factories
// ============================================

let subscriptionCounter = 0;

export const PushSubscriptionFactory = {
  create(overrides?: Partial<PushSubscriptionData>): PushSubscriptionData {
    subscriptionCounter++;
    return {
      endpoint: `https://push.example.com/subscription-${subscriptionCounter}`,
      keys: {
        p256dh: `p256dh-key-${subscriptionCounter}`,
        auth: `auth-key-${subscriptionCounter}`,
      },
      ...overrides,
    };
  },

  reset() {
    subscriptionCounter = 0;
  },
};

export const PushPreferencesFactory = {
  create(overrides?: Partial<PushPreferences>): PushPreferences {
    return {
      enabled: true,
      reminders: true,
      orders: true,
      promotions: false,
      updates: true,
      ...overrides,
    };
  },

  createDisabled(): PushPreferences {
    return {
      enabled: false,
      reminders: false,
      orders: false,
      promotions: false,
      updates: false,
    };
  },
};

// ============================================
// HTTP Mock Helpers
// ============================================

export function mockHttpResponse<T>(data: T) {
  return vi.fn(() => Promise.resolve(data));
}

export function mockHttpError(message: string, status = 500) {
  return vi.fn(() => Promise.reject(new Error(`HTTP ${status}: ${message}`)));
}
