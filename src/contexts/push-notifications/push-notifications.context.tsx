'use client';

import * as React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import { useUI } from '@contexts/ui.context';
import {
  getVapidPublicKey,
  subscribe as apiSubscribe,
  unsubscribe as apiUnsubscribe,
  getPreferences as apiGetPreferences,
  updatePreferences as apiUpdatePreferences,
  serializePushSubscription,
  urlBase64ToUint8Array,
} from '@framework/push';
import {
  pushReducer,
  DEFAULT_PUSH_STATE,
  type PushState,
  type PushPreferences,
} from './push-notifications.reducer';

const SW_PATH = '/sw.js';
const LS_KEY = 'push-notifications-state';

export interface PushResult {
  success: boolean;
  error?: string;
}

export interface PushNotificationsContextValue extends PushState {
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<PushResult>;
  unsubscribe: () => Promise<PushResult>;
  requestPermission: () => Promise<NotificationPermission>;
  updatePreferences: (prefs: Partial<PushPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PushNotificationsContext = React.createContext<
  PushNotificationsContextValue | undefined
>(undefined);
PushNotificationsContext.displayName = 'PushNotificationsContext';

export function usePushNotifications(): PushNotificationsContextValue {
  const ctx = React.useContext(PushNotificationsContext);
  if (!ctx) {
    throw new Error(
      'usePushNotifications must be used within PushNotificationsProvider',
    );
  }
  return ctx;
}

export function usePushNotificationsOptional():
  | PushNotificationsContextValue
  | undefined {
  return React.useContext(PushNotificationsContext);
}

export function PushNotificationsProvider(props: React.PropsWithChildren) {
  const { isAuthorized } = useUI();
  const [state, dispatch] = React.useReducer(pushReducer, DEFAULT_PUSH_STATE);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // LocalStorage persistence
  const [saved, save] = useLocalStorage(
    LS_KEY,
    JSON.stringify(DEFAULT_PUSH_STATE),
  );

  // Bootstrap from localStorage on mount
  const bootstrapped = React.useRef(false);
  React.useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Check browser support
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    dispatch({ type: 'SET_SUPPORTED', supported });

    if (!supported) return;

    // Load permission
    dispatch({ type: 'SET_PERMISSION', permission: Notification.permission });

    // Load saved state
    try {
      const snapshot = JSON.parse(saved ?? '');
      if (snapshot) {
        dispatch({
          type: 'HYDRATE',
          state: {
            isSubscribed: snapshot.isSubscribed,
            subscriptionEndpoint: snapshot.subscriptionEndpoint,
            preferences: snapshot.preferences,
          },
        });
      }
    } catch {
      // ignore bad LS
    }

    // Check actual subscription status
    checkSubscriptionStatus();
  }, [saved]);

  // Persist on change
  React.useEffect(() => {
    try {
      save(
        JSON.stringify({
          isSubscribed: state.isSubscribed,
          subscriptionEndpoint: state.subscriptionEndpoint,
          preferences: state.preferences,
        }),
      );
    } catch {
      // ignore quota
    }
  }, [state.isSubscribed, state.subscriptionEndpoint, state.preferences, save]);

  // Note: Preferences are NOT auto-synced on load to avoid blocking UI.
  // Call refreshPreferences() manually when needed (e.g., settings tab opened).

  // Check actual browser subscription status
  const checkSubscriptionStatus = React.useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        dispatch({
          type: 'SET_SUBSCRIBED',
          subscribed: true,
          endpoint: subscription.endpoint,
        });
      } else {
        dispatch({ type: 'SET_SUBSCRIBED', subscribed: false, endpoint: null });
      }
    } catch (err) {
      console.error('[PushContext] Failed to check subscription:', err);
    }
  }, []);

  // Register service worker
  const registerServiceWorker =
    React.useCallback(async (): Promise<ServiceWorkerRegistration> => {
      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
      return registration;
    }, []);

  // Request notification permission
  const requestPermission =
    React.useCallback(async (): Promise<NotificationPermission> => {
      if (!state.isSupported) return 'denied';

      try {
        const result = await Notification.requestPermission();
        dispatch({ type: 'SET_PERMISSION', permission: result });
        return result;
      } catch (err) {
        console.error('[PushContext] Permission request failed:', err);
        return 'denied';
      }
    }, [state.isSupported]);

  // Subscribe to push notifications
  const subscribe = React.useCallback(async (): Promise<PushResult> => {
    if (!state.isSupported) {
      const error = 'Push notifications not supported';
      setError(error);
      return { success: false, error };
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission
      let currentPermission = state.permission;
      if (currentPermission === 'default') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        const error = 'Permesso notifiche negato';
        setError(error);
        setIsLoading(false);
        return { success: false, error };
      }

      // 2. Register service worker
      const registration = await registerServiceWorker();

      // 3. Get VAPID public key
      const { publicKey } = await getVapidPublicKey();

      // 4. Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Send to server
      const serialized = serializePushSubscription(subscription);
      const response = await apiSubscribe(serialized);

      if (response.success) {
        dispatch({
          type: 'SET_SUBSCRIBED',
          subscribed: true,
          endpoint: serialized.endpoint,
        });
        setIsLoading(false);
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to save subscription');
      }
    } catch (err: unknown) {
      // Handle specific error cases
      let errorMessage = "Errore durante l'attivazione";
      let isExpectedError = false;

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { error?: string } };
        };
        const status = axiosError.response?.status;
        const serverError = axiosError.response?.data?.error;

        if (status === 404) {
          // Web push not enabled for this tenant - this is expected, not an error
          errorMessage =
            serverError || 'Notifiche push non abilitate per questo account';
          isExpectedError = true;
          // Note: Don't disable isSupported - browser still supports push,
          // just not enabled for this tenant. User can retry later.
        } else if (status === 401) {
          errorMessage = 'Autenticazione richiesta';
        } else if (status === 500) {
          errorMessage = 'Errore del server';
        } else if (serverError) {
          errorMessage = serverError;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Only log unexpected errors
      if (!isExpectedError) {
        console.error('[PushContext] Subscribe failed:', err);
      }

      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [
    state.isSupported,
    state.permission,
    requestPermission,
    registerServiceWorker,
  ]);

  // Unsubscribe from push notifications
  const unsubscribe = React.useCallback(async (): Promise<PushResult> => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications not supported' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        // Don't fail if server unsubscribe fails - local unsubscribe succeeded
        try {
          await apiUnsubscribe(endpoint);
        } catch (err) {
          console.warn(
            '[PushContext] Server unsubscribe failed (ignored):',
            err,
          );
        }
      }

      dispatch({ type: 'SET_SUBSCRIBED', subscribed: false, endpoint: null });
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('[PushContext] Unsubscribe failed:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Errore durante la disattivazione';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [state.isSupported]);

  // Update preferences
  const updatePreferences = React.useCallback(
    async (prefs: Partial<PushPreferences>): Promise<void> => {
      try {
        const response = await apiUpdatePreferences(prefs);
        dispatch({ type: 'SET_PREFERENCES', preferences: response });
      } catch (err) {
        console.error('[PushContext] Update preferences failed:', err);
        // Still update locally for optimistic UI
        dispatch({ type: 'SET_PREFERENCES', preferences: prefs });
      }
    },
    [],
  );

  // Refresh preferences from server (requires auth token)
  const refreshPreferences = React.useCallback(async (): Promise<void> => {
    // Skip if not authorized - preferences require userId from session
    if (!isAuthorized) {
      return;
    }
    try {
      const response = await apiGetPreferences();
      dispatch({ type: 'SET_PREFERENCES', preferences: response });
    } catch (err) {
      // Silently ignore 401 - token might not be ready yet
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          return;
        }
      }
      console.error('[PushContext] Refresh preferences failed:', err);
    }
  }, [isAuthorized]);

  const value = React.useMemo<PushNotificationsContextValue>(
    () => ({
      ...state,
      isLoading,
      error,
      subscribe,
      unsubscribe,
      requestPermission,
      updatePreferences,
      refreshPreferences,
    }),
    [
      state,
      isLoading,
      error,
      subscribe,
      unsubscribe,
      requestPermission,
      updatePreferences,
      refreshPreferences,
    ],
  );

  return <PushNotificationsContext.Provider value={value} {...props} />;
}
