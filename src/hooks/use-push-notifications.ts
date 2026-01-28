'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getVapidPublicKey,
  subscribe as apiSubscribe,
  unsubscribe as apiUnsubscribe,
  serializePushSubscription,
  urlBase64ToUint8Array,
} from '@framework/push';

const SW_PATH = '/sw.js';
const LS_KEY = 'push-subscription-endpoint';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Hook for managing Web Push notifications
 *
 * Usage:
 * ```tsx
 * const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
 *
 * if (isSupported && permission !== 'denied') {
 *   return <button onClick={subscribe}>Enable Notifications</button>;
 * }
 * ```
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check browser support and current state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Check if already subscribed (from localStorage)
      const savedEndpoint = localStorage.getItem(LS_KEY);
      if (savedEndpoint) {
        setIsSubscribed(true);
      }
    }
  }, []);

  // Register service worker
  const registerServiceWorker =
    useCallback(async (): Promise<ServiceWorkerRegistration> => {
      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      return registration;
    }, []);

  // Request notification permission
  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!isSupported) {
        return 'denied';
      }

      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      } catch (err) {
        console.error('[usePushNotifications] Permission request failed:', err);
        return 'denied';
      }
    }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission if not granted
      let currentPermission = permission;
      if (currentPermission === 'default') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // 2. Register service worker
      const registration = await registerServiceWorker();

      // 3. Get VAPID public key from server
      const { public_key } = await getVapidPublicKey();

      // 4. Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      // 5. Send subscription to server
      const serialized = serializePushSubscription(subscription);
      const response = await apiSubscribe(serialized);

      if (response.success) {
        // Save endpoint to localStorage for quick checks
        localStorage.setItem(LS_KEY, serialized.endpoint);
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      } else {
        throw new Error(response.message || 'Failed to save subscription');
      }
    } catch (err) {
      console.error('[usePushNotifications] Subscribe failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, permission, requestPermission, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        await apiUnsubscribe(endpoint);
      }

      // Clear localStorage
      localStorage.removeItem(LS_KEY);
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

export default usePushNotifications;
