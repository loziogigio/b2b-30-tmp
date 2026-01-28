import { get, post, patch, del } from '@framework/utils/httpPIM';
import type {
  PushSubscriptionData,
  PushPreferences,
  PushSubscriptionResponse,
  VapidPublicKeyResponse,
  PushPreferencesResponse,
} from './types';

// Push API endpoints (vinc-commerce-suite)
// Routes through /api/proxy/pim/ → tenant.api.pimApiUrl from DB
// Backend gets userId from session auth (cookies)
const EP = {
  VAPID_PUBLIC_KEY: 'api/b2b/push/vapid-public-key',
  SUBSCRIBE: 'api/b2b/push/subscribe',
  PREFERENCES: 'api/b2b/push/preferences',
  NOTIFICATIONS: 'api/b2b/push/notifications',
};

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  action_url?: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: NotificationItem[];
  unread_count: number;
  total: number;
}

/**
 * Get VAPID public key for push subscription
 */
export async function getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
  return get<VapidPublicKeyResponse>(EP.VAPID_PUBLIC_KEY);
}

/**
 * Subscribe to push notifications
 * Backend expects flat structure and gets userId from session auth
 */
export async function subscribe(
  subscription: PushSubscriptionData,
): Promise<PushSubscriptionResponse> {
  return post<PushSubscriptionResponse>(EP.SUBSCRIBE, {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    expirationTime: subscription.expirationTime,
  });
}

/**
 * Unsubscribe from push notifications
 * Uses DELETE method on subscribe endpoint
 */
export async function unsubscribe(
  endpoint: string,
): Promise<{ success: boolean; message?: string }> {
  return del<{ success: boolean; message?: string }>(
    `${EP.SUBSCRIBE}?endpoint=${encodeURIComponent(endpoint)}`,
  );
}

/**
 * Get push notification preferences
 */
export async function getPreferences(): Promise<PushPreferencesResponse> {
  return get<PushPreferencesResponse>(EP.PREFERENCES);
}

/**
 * Update push notification preferences
 */
export async function updatePreferences(
  preferences: Partial<PushPreferences>,
): Promise<PushPreferencesResponse> {
  return post<PushPreferencesResponse>(EP.PREFERENCES, preferences);
}

/**
 * Get notification history for the current user
 */
export async function getNotifications(options?: {
  limit?: number;
  skip?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.skip) params.set('skip', options.skip.toString());
  if (options?.unreadOnly) params.set('unread', 'true');

  const query = params.toString();
  return get<NotificationsResponse>(
    `${EP.NOTIFICATIONS}${query ? `?${query}` : ''}`,
  );
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds?: string[],
  markAll?: boolean,
): Promise<{ success: boolean; updated: number }> {
  return patch<{ success: boolean; updated: number }>(EP.NOTIFICATIONS, {
    notification_ids: notificationIds,
    mark_all: markAll,
  });
}

/**
 * Convert browser PushSubscription to our format
 */
export function serializePushSubscription(
  subscription: PushSubscription,
): PushSubscriptionData {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint || '',
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
    expirationTime: json.expirationTime,
  };
}

/**
 * Convert base64 VAPID key to Uint8Array for subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
