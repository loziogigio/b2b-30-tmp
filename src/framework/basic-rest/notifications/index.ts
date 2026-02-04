import { get, post, patch, del } from '@framework/utils/httpPIM';

// In-App Notifications API endpoints (vinc-commerce-suite)
// See: doc/02-api/notifications-api.md
const EP = {
  LIST: 'api/b2b/notifications',
  UNREAD_COUNT: 'api/b2b/notifications/unread-count',
  BULK: 'api/b2b/notifications/bulk',
  SINGLE: (id: string) => `api/b2b/notifications/${id}`,
  TRACK: 'api/b2b/notifications/track',
};

export type NotificationTrigger =
  | 'registration_request_admin'
  | 'registration_request_customer'
  | 'welcome'
  | 'forgot_password'
  | 'reset_password'
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'price_drop_alert'
  | 'back_in_stock'
  | 'abandoned_cart'
  | 'newsletter'
  | 'custom';

// Typed Payload System
// See: vinc-commerce-suite/doc/02-api/notifications-api.md

/** Media attachments for notifications */
export interface PayloadMedia {
  icon?: string;
  image?: string;
  images?: string[];
}

/** Item in order payload */
export interface OrderPayloadItem {
  sku: string;
  name: string;
  image?: string;
  quantity: number;
}

/** Product item with item_ref for frontend navigation */
export interface ProductItem {
  sku: string;
  name: string;
  image?: string;
  item_ref?: string; // Generic reference for frontend navigation
}

/** Product item with pricing info */
export interface PriceProductItem extends ProductItem {
  original_price?: string;
  sale_price?: string;
  discount?: string;
}

/** Base payload fields shared by all categories */
interface BasePayload {
  /** Notification log ID for tracking analytics */
  notification_log_id?: string;
}

/** Generic payload - for welcome, announcements, system messages */
export interface GenericPayload extends BasePayload {
  category: 'generic';
  media?: PayloadMedia;
  /** URL for documents, catalogs, external links */
  url?: string;
  /** Open URL in new tab/external browser (default: true) */
  open_in_new_tab?: boolean;
}

/** Search filters for the search API */
export interface NotificationFilters {
  /** Filter by SKU codes */
  sku?: string[];
  /** Filter by brand */
  brand?: string[];
  /** Filter by category */
  category?: string[];
  /** Any other dynamic filters */
  [key: string]: string[] | undefined;
}

/** Product payload - for new arrivals, back in stock, wishlist */
export interface ProductPayload extends BasePayload {
  category: 'product';
  products?: ProductItem[];
  media?: PayloadMedia;
  /** Search filters for navigation */
  filters?: NotificationFilters;
  /** URL for "See All" button (e.g., "search?text=condizionatore") */
  products_url?: string;
}

/** Order payload - for confirmation, shipped, delivered, cancelled */
export interface OrderPayload extends BasePayload {
  category: 'order';
  order?: {
    id?: string;
    number?: string;
    status?: string;
    total?: string;
    carrier?: string;
    tracking_code?: string; // Carrier's tracking number
    item_ref?: string; // Generic reference for frontend navigation
    items?: OrderPayloadItem[];
  };
}

/** Price payload - for discounts, flash sales, price drops */
export interface PricePayload extends BasePayload {
  category: 'price';
  expires_at?: string;
  discount_label?: string;
  products?: PriceProductItem[];
  media?: PayloadMedia;
  /** Search filters for navigation */
  filters?: NotificationFilters;
  /** URL for "See All" button (e.g., "search?text=offerta") */
  products_url?: string;
}

export type NotificationPayload =
  | GenericPayload
  | ProductPayload
  | OrderPayload
  | PricePayload;

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  user_type: 'b2b_user' | 'portal_user';
  trigger: NotificationTrigger;
  title: string;
  body: string;
  icon?: string;
  action_url?: string;
  payload?: NotificationPayload;
  /** Campaign ID reference */
  campaign_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: NotificationItem[];
  pagination: NotificationsPagination;
  unread_count: number;
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface BulkActionResponse {
  success: boolean;
  updated: number;
}

export interface SingleNotificationResponse {
  success: boolean;
  notification: NotificationItem;
}

/**
 * Get notification list for the current user
 */
export async function getNotifications(options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  trigger?: NotificationTrigger;
  /** AbortSignal for cancelling the request */
  signal?: AbortSignal;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.unreadOnly) params.set('unread_only', 'true');
  if (options?.trigger) params.set('trigger', options.trigger);

  const query = params.toString();
  return get<NotificationsResponse>(
    `${EP.LIST}${query ? `?${query}` : ''}`,
    undefined,
    options?.signal ? { signal: options.signal } : undefined,
  );
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return get<UnreadCountResponse>(EP.UNREAD_COUNT);
}

/**
 * Get a single notification by ID
 */
export async function getNotification(
  id: string,
): Promise<SingleNotificationResponse> {
  return get<SingleNotificationResponse>(EP.SINGLE(id));
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  id: string,
): Promise<SingleNotificationResponse> {
  return patch<SingleNotificationResponse>(EP.SINGLE(id), {});
}

/**
 * Delete a single notification
 */
export async function deleteNotification(
  id: string,
): Promise<{ success: boolean; deleted: boolean }> {
  return del<{ success: boolean; deleted: boolean }>(EP.SINGLE(id));
}

/**
 * Bulk actions on notifications
 */
export async function bulkAction(
  action: 'mark_read' | 'mark_all_read' | 'delete',
  notificationIds?: string[],
): Promise<BulkActionResponse> {
  const body: { action: string; notification_ids?: string[] } = { action };
  if (notificationIds && notificationIds.length > 0) {
    body.notification_ids = notificationIds;
  }
  return post<BulkActionResponse>(EP.BULK, body);
}

/**
 * Mark specific notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
): Promise<BulkActionResponse> {
  return bulkAction('mark_read', notificationIds);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<BulkActionResponse> {
  return bulkAction('mark_all_read');
}

/**
 * Delete multiple notifications
 */
export async function deleteNotifications(
  notificationIds: string[],
): Promise<BulkActionResponse> {
  return bulkAction('delete', notificationIds);
}

/** Metadata for tracking notification events */
export interface TrackMetadata {
  /** Product SKU (for product clicks) */
  sku?: string;
  /** Click type: product, link, order */
  type?: 'product' | 'link' | 'order';
  /** Screen navigated to */
  screen?: string;
  /** URL that was clicked */
  url?: string;
  /** Order number (for order clicks) */
  order_number?: string;
}

/**
 * Track notification event for analytics
 * Call this when user opens or clicks a notification
 *
 * @param logId - The log ID from notification.log_id
 * @param event - Event type: opened, clicked, read, dismissed
 * @param metadata - Additional event data
 */
export async function trackNotification(
  logId: string,
  event: 'delivered' | 'opened' | 'clicked' | 'read' | 'dismissed',
  metadata?: TrackMetadata,
): Promise<{ success: boolean }> {
  return post<{ success: boolean }>(EP.TRACK, {
    log_id: logId,
    event,
    platform: 'web',
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  });
}
