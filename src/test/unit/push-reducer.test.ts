import { describe, it, expect } from 'vitest';
import {
  pushReducer,
  DEFAULT_PUSH_STATE,
  DEFAULT_PUSH_PREFERENCES,
} from '@contexts/push-notifications/push-notifications.reducer';
import type {
  PushState,
  PushAction,
} from '@contexts/push-notifications/push-notifications.reducer';

describe('unit: pushReducer', () => {
  describe('SET_SUPPORTED action', () => {
    it('should set isSupported to true', () => {
      /**
       * Test that SET_SUPPORTED action updates isSupported state.
       */
      // Arrange
      const initialState = { ...DEFAULT_PUSH_STATE, isSupported: false };
      const action: PushAction = { type: 'SET_SUPPORTED', supported: true };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSupported).toBe(true);
    });

    it('should set isSupported to false', () => {
      /**
       * Test that SET_SUPPORTED can set isSupported to false.
       */
      // Arrange
      const initialState = { ...DEFAULT_PUSH_STATE, isSupported: true };
      const action: PushAction = { type: 'SET_SUPPORTED', supported: false };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSupported).toBe(false);
    });

    it('should not modify other state properties', () => {
      /**
       * Test immutability - other properties remain unchanged.
       */
      // Arrange
      const initialState: PushState = {
        ...DEFAULT_PUSH_STATE,
        isSupported: false,
        permission: 'granted',
        isSubscribed: true,
      };
      const action: PushAction = { type: 'SET_SUPPORTED', supported: true };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.permission).toBe('granted');
      expect(result.isSubscribed).toBe(true);
    });
  });

  describe('SET_PERMISSION action', () => {
    it('should set permission to granted', () => {
      /**
       * Test that permission is updated to granted.
       */
      // Arrange
      const initialState = {
        ...DEFAULT_PUSH_STATE,
        permission: 'default' as NotificationPermission,
      };
      const action: PushAction = {
        type: 'SET_PERMISSION',
        permission: 'granted',
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.permission).toBe('granted');
    });

    it('should set permission to denied', () => {
      /**
       * Test that permission is updated to denied.
       */
      // Arrange
      const initialState = {
        ...DEFAULT_PUSH_STATE,
        permission: 'default' as NotificationPermission,
      };
      const action: PushAction = {
        type: 'SET_PERMISSION',
        permission: 'denied',
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.permission).toBe('denied');
    });
  });

  describe('SET_SUBSCRIBED action', () => {
    it('should set isSubscribed to true with endpoint', () => {
      /**
       * Test subscription state with endpoint.
       */
      // Arrange
      const initialState = DEFAULT_PUSH_STATE;
      const endpoint = 'https://push.example.com/abc123';
      const action: PushAction = {
        type: 'SET_SUBSCRIBED',
        subscribed: true,
        endpoint,
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSubscribed).toBe(true);
      expect(result.subscriptionEndpoint).toBe(endpoint);
    });

    it('should set isSubscribed to false and clear endpoint', () => {
      /**
       * Test unsubscription clears endpoint.
       */
      // Arrange
      const initialState: PushState = {
        ...DEFAULT_PUSH_STATE,
        isSubscribed: true,
        subscriptionEndpoint: 'https://push.example.com/abc123',
      };
      const action: PushAction = {
        type: 'SET_SUBSCRIBED',
        subscribed: false,
        endpoint: null,
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSubscribed).toBe(false);
      expect(result.subscriptionEndpoint).toBeNull();
    });

    it('should default endpoint to null if not provided', () => {
      /**
       * Test that endpoint defaults to null when not provided.
       */
      // Arrange
      const initialState = DEFAULT_PUSH_STATE;
      const action: PushAction = {
        type: 'SET_SUBSCRIBED',
        subscribed: true,
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSubscribed).toBe(true);
      expect(result.subscriptionEndpoint).toBeNull();
    });
  });

  describe('SET_PREFERENCES action', () => {
    it('should merge partial preferences', () => {
      /**
       * Test that preferences are merged, not replaced.
       */
      // Arrange
      const initialState: PushState = {
        ...DEFAULT_PUSH_STATE,
        preferences: {
          enabled: true,
          reminders: true,
          orders: true,
          promotions: false,
          updates: true,
        },
      };
      const action: PushAction = {
        type: 'SET_PREFERENCES',
        preferences: { promotions: true },
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.preferences.promotions).toBe(true);
      expect(result.preferences.reminders).toBe(true); // unchanged
      expect(result.preferences.orders).toBe(true); // unchanged
    });

    it('should update multiple preferences at once', () => {
      /**
       * Test updating multiple preferences.
       */
      // Arrange
      const initialState = DEFAULT_PUSH_STATE;
      const action: PushAction = {
        type: 'SET_PREFERENCES',
        preferences: {
          enabled: false,
          reminders: false,
          orders: false,
        },
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.preferences.enabled).toBe(false);
      expect(result.preferences.reminders).toBe(false);
      expect(result.preferences.orders).toBe(false);
    });
  });

  describe('HYDRATE action', () => {
    it('should hydrate state from partial state', () => {
      /**
       * Test state hydration (e.g., from localStorage).
       */
      // Arrange
      const initialState = DEFAULT_PUSH_STATE;
      const savedState: Partial<PushState> = {
        isSupported: true,
        isSubscribed: true,
        subscriptionEndpoint: 'https://push.example.com/saved',
        permission: 'granted',
      };
      const action: PushAction = { type: 'HYDRATE', state: savedState };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSupported).toBe(true);
      expect(result.isSubscribed).toBe(true);
      expect(result.subscriptionEndpoint).toBe(
        'https://push.example.com/saved',
      );
      expect(result.permission).toBe('granted');
    });

    it('should preserve existing state when hydrating partial', () => {
      /**
       * Test that non-hydrated fields remain unchanged.
       */
      // Arrange
      const initialState: PushState = {
        ...DEFAULT_PUSH_STATE,
        preferences: {
          enabled: true,
          reminders: true,
          orders: false,
          promotions: false,
          updates: true,
        },
      };
      const action: PushAction = {
        type: 'HYDRATE',
        state: { isSubscribed: true },
      };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result.isSubscribed).toBe(true);
      expect(result.preferences.orders).toBe(false); // preserved
    });
  });

  describe('RESET action', () => {
    it('should reset to default state', () => {
      /**
       * Test that RESET returns default state.
       */
      // Arrange
      const initialState: PushState = {
        isSupported: true,
        permission: 'granted',
        isSubscribed: true,
        subscriptionEndpoint: 'https://push.example.com/abc',
        preferences: {
          enabled: false,
          reminders: false,
          orders: false,
          promotions: true,
          updates: false,
        },
      };
      const action: PushAction = { type: 'RESET' };

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result).toEqual(DEFAULT_PUSH_STATE);
    });
  });

  describe('unknown action', () => {
    it('should return current state for unknown action', () => {
      /**
       * Test that unknown actions don't modify state.
       */
      // Arrange
      const initialState = DEFAULT_PUSH_STATE;
      const action = { type: 'UNKNOWN_ACTION' } as unknown as PushAction;

      // Act
      const result = pushReducer(initialState, action);

      // Assert
      expect(result).toBe(initialState);
    });
  });

  describe('default values', () => {
    it('should have correct DEFAULT_PUSH_STATE', () => {
      /**
       * Test default state values.
       */
      expect(DEFAULT_PUSH_STATE).toEqual({
        isSupported: false,
        permission: 'default',
        isSubscribed: false,
        subscriptionEndpoint: null,
        preferences: DEFAULT_PUSH_PREFERENCES,
      });
    });

    it('should have correct DEFAULT_PUSH_PREFERENCES', () => {
      /**
       * Test default preferences values.
       */
      expect(DEFAULT_PUSH_PREFERENCES).toEqual({
        enabled: true,
        reminders: true,
        orders: true,
        promotions: false,
        updates: true,
      });
    });
  });
});
