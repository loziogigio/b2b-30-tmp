import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window.atob for Node.js environment
vi.stubGlobal('window', {
  atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
});

import {
  urlBase64ToUint8Array,
  serializePushSubscription,
} from '@framework/push';

describe('unit: urlBase64ToUint8Array', () => {
  it('should convert standard base64 string to Uint8Array', () => {
    /**
     * Test basic base64 to Uint8Array conversion.
     * Input: "SGVsbG8=" (base64 for "Hello")
     * Expected: Uint8Array with bytes for "Hello"
     */
    // Arrange
    const base64 = 'SGVsbG8='; // "Hello" in base64

    // Act
    const result = urlBase64ToUint8Array(base64);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
    expect(String.fromCharCode(...result)).toBe('Hello');
  });

  it('should handle URL-safe base64 characters (- and _)', () => {
    /**
     * Test that URL-safe base64 characters are properly converted.
     * URL-safe base64 uses - instead of + and _ instead of /
     */
    // Arrange
    // This is a URL-safe base64 string with - and _
    const urlSafeBase64 = 'SGVs-G8_'; // Contains - and _

    // Act
    const result = urlBase64ToUint8Array(urlSafeBase64);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should add padding when needed', () => {
    /**
     * Test that padding is correctly added for base64 strings
     * that don't have proper padding.
     */
    // Arrange
    const noPadding = 'SGVsbG8'; // "Hello" without = padding

    // Act
    const result = urlBase64ToUint8Array(noPadding);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...result)).toBe('Hello');
  });

  it('should handle typical VAPID public key format', () => {
    /**
     * Test conversion of a typical VAPID public key.
     * VAPID keys are 65 bytes when decoded.
     */
    // Arrange
    // A sample VAPID-like key (65 bytes when decoded)
    const vapidKey =
      'BNhRi0dculcGqcy6fFhTI7QMQwkLVxyqHYpOQnFwVjUBwAM7X8K9JlxPdrnqXdh5z0jcHJzJqUd9qrJsWbQcSgE';

    // Act
    const result = urlBase64ToUint8Array(vapidKey);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(65); // VAPID keys are 65 bytes
  });

  it('should return empty Uint8Array for empty string', () => {
    /**
     * Test edge case with empty string.
     */
    // Arrange
    const emptyString = '';

    // Act
    const result = urlBase64ToUint8Array(emptyString);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });
});

describe('unit: serializePushSubscription', () => {
  it('should serialize PushSubscription to correct format', () => {
    /**
     * Test that browser PushSubscription is serialized correctly.
     */
    // Arrange
    const mockSubscription = {
      toJSON: () => ({
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
        expirationTime: null,
      }),
    } as unknown as PushSubscription;

    // Act
    const result = serializePushSubscription(mockSubscription);

    // Assert
    expect(result).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
      expirationTime: null,
    });
  });

  it('should handle subscription with expirationTime', () => {
    /**
     * Test serialization when expirationTime is present.
     */
    // Arrange
    const expirationTime = Date.now() + 86400000; // 24 hours from now
    const mockSubscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub123',
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
        expirationTime,
      }),
    } as unknown as PushSubscription;

    // Act
    const result = serializePushSubscription(mockSubscription);

    // Assert
    expect(result.expirationTime).toBe(expirationTime);
  });

  it('should handle missing keys gracefully', () => {
    /**
     * Test that missing keys default to empty strings.
     */
    // Arrange
    const mockSubscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub123',
        keys: undefined,
        expirationTime: null,
      }),
    } as unknown as PushSubscription;

    // Act
    const result = serializePushSubscription(mockSubscription);

    // Assert
    expect(result.keys.p256dh).toBe('');
    expect(result.keys.auth).toBe('');
  });

  it('should handle missing endpoint gracefully', () => {
    /**
     * Test that missing endpoint defaults to empty string.
     */
    // Arrange
    const mockSubscription = {
      toJSON: () => ({
        endpoint: undefined,
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
      }),
    } as unknown as PushSubscription;

    // Act
    const result = serializePushSubscription(mockSubscription);

    // Assert
    expect(result.endpoint).toBe('');
  });
});
