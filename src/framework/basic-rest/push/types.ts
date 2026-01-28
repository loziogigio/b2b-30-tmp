// Web Push notification types

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface PushPreferences {
  enabled: boolean;
  reminders: boolean;
  orders: boolean;
  promotions: boolean;
  updates: boolean;
}

export interface PushSubscriptionResponse {
  success: boolean;
  subscription_id?: string;
  message?: string;
}

export interface VapidPublicKeyResponse {
  success: boolean;
  publicKey: string;
}

export interface PushPreferencesResponse extends PushPreferences {
  user_id: string;
  updated_at?: string;
}

export interface PushState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscriptionEndpoint: string | null;
  preferences: PushPreferences;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  enabled: true,
  reminders: true,
  orders: true,
  promotions: false,
  updates: true,
};

export const DEFAULT_PUSH_STATE: PushState = {
  isSupported: false,
  permission: 'default',
  isSubscribed: false,
  subscriptionEndpoint: null,
  preferences: DEFAULT_PUSH_PREFERENCES,
};
