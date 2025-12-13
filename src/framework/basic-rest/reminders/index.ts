import { get, post, del } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

// Types aligned with the FastAPI spec
export type ReminderToggleAction = 'created' | 'cancelled';

export interface ReminderToggleResponse {
  sku: string;
  user_id: string;
  action: ReminderToggleAction;
  has_active_reminder: boolean;
}

export interface ReminderStatusResponse {
  sku: string;
  has_active_reminder: boolean;
  product_available: boolean;
  reminder_created_at?: string | null;
}

export interface BulkReminderStatusResponse {
  user_id: string;
  reminder_statuses: Array<{
    sku: string;
    has_active_reminder: boolean;
    product_available: boolean;
    reminder_created_at?: string | null;
  }>;
}

export interface UserRemindersItem {
  id: string;
  user_id: string;
  sku: string;
  status: 'active' | 'notified' | 'expired' | 'cancelled';
  email?: string | null;
  push_token?: string | null;
  created_at: string;
  notified_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export interface UserRemindersResponse {
  reminders: UserRemindersItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface UserRemindersSummary {
  user_id: string;
  total_reminders: number;
  active: number;
  notified: number;
  expired: number;
  cancelled: number;
}

export interface ReminderStatsResponse {
  sku: string;
  active_reminders: number;
  notified_reminders: number;
  total_reminders: number;
}

// Convenience alias
const EP = API_ENDPOINTS_B2B.REMINDERS;

// Global user identifier required by Reminders API
// Include project code from env (prefers NEXT_PUBLIC_, falls back to NEXT_PROJECT_CODE)
const PROJECT_CODE = (process.env.NEXT_PUBLIC_PROJECT_CODE ||
  process.env.NEXT_PROJECT_CODE ||
  'APP') as string;
const getUserId = () =>
  `${PROJECT_CODE}-${ERP_STATIC.customer_code}-${ERP_STATIC.address_code}`;

// Core reminder operations
export async function addReminder(
  sku: string,
  email?: string,
): Promise<{ success?: boolean } | void> {
  return post(EP.ROOT, {
    user_id: getUserId(),
    sku,
    email,
    expires_in_days: 30,
  });
}

export async function removeReminder(
  sku: string,
): Promise<{ success?: boolean; message?: string } | void> {
  // Send body with DELETE via axios config
  return del(EP.ROOT, undefined, { data: { user_id: getUserId(), sku } });
}

export async function toggleReminder(
  sku: string,
  email?: string,
): Promise<ReminderToggleResponse> {
  return post<ReminderToggleResponse>(EP.TOGGLE, {
    user_id: getUserId(),
    sku,
    email,
    expires_in_days: 30,
  });
}

// Status endpoints
export async function getReminderStatus(
  sku: string,
  userId: string = getUserId(),
): Promise<ReminderStatusResponse> {
  return get<ReminderStatusResponse>(EP.STATUS(userId, sku));
}

export async function getBulkReminderStatus(
  skus: string[],
  userId: string = getUserId(),
): Promise<ReminderStatusResponse[]> {
  const response = await post<
    BulkReminderStatusResponse | ReminderStatusResponse[]
  >(EP.BULK_STATUS, { user_id: userId, skus });

  if (Array.isArray(response)) {
    return response;
  }

  if (response && Array.isArray(response.reminder_statuses)) {
    return response.reminder_statuses.map((status) => ({
      sku: status.sku,
      has_active_reminder: status.has_active_reminder,
      product_available: status.product_available,
      reminder_created_at: status.reminder_created_at ?? null,
    }));
  }

  return [];
}

// User reminders
export async function getUserReminders(
  page = 1,
  pageSize = 20,
  userId: string = getUserId(),
  statusFilter?: 'active' | 'notified' | 'expired' | 'cancelled',
): Promise<UserRemindersResponse> {
  const params: any = { page: String(page), page_size: String(pageSize) };
  if (statusFilter) {
    params.status_filter = statusFilter;
  }
  const qs = new URLSearchParams(params).toString();
  return get<UserRemindersResponse>(`${EP.USER(userId)}?${qs}`);
}

export async function getUserRemindersSummary(
  userId: string = getUserId(),
): Promise<UserRemindersSummary> {
  return get<UserRemindersSummary>(EP.USER_SUMMARY(userId));
}

// Stats
export async function getProductReminderStats(
  sku: string,
): Promise<ReminderStatsResponse> {
  return get<ReminderStatsResponse>(EP.STATS(sku));
}

// Utilities
export async function clearAllUserReminders(
  userId: string = getUserId(),
): Promise<{
  success?: boolean;
  message?: string;
  deleted_count?: number;
} | void> {
  return del(EP.CLEAR_ALL(userId));
}

export async function remindersHealthCheck(): Promise<{
  status: string;
  service: string;
}> {
  return get(EP.HEALTH);
}
