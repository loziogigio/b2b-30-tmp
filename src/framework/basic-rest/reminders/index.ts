import { get, post, del } from '@framework/utils/httpPIM';

// ============================================
// TYPES
// ============================================

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
  product_available?: boolean;
  reminder_created_at?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  status?: 'active' | 'notified' | 'expired' | 'cancelled';
}

export interface BulkReminderStatusResponse {
  user_id: string;
  reminder_statuses: Array<{
    sku: string;
    has_active_reminder: boolean;
    product_available?: boolean;
    reminder_created_at?: string | null;
    created_at?: string | null;
    expires_at?: string | null;
    status?: 'active' | 'notified' | 'expired' | 'cancelled';
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

export interface ReminderStatsResponse {
  sku: string;
  active_reminders: number;
  notified_reminders: number;
  total_reminders: number;
}

// ============================================
// ENDPOINTS (commerce suite via PIM proxy)
// ============================================

const BASE = 'api/b2b/reminders';

// Helper to unwrap commerce suite `{ success, data }` envelope
function unwrap<T>(res: any): T {
  return res?.data ?? res;
}

function normalizeReminderStatus(status: any): ReminderStatusResponse {
  return {
    ...status,
    has_active_reminder: !!status?.has_active_reminder,
    product_available: status?.product_available,
    reminder_created_at:
      status?.reminder_created_at ?? status?.created_at ?? null,
    created_at: status?.created_at ?? status?.reminder_created_at ?? null,
    expires_at: status?.expires_at ?? null,
  };
}

function normalizeUserReminders(
  data: any,
  page: number,
  pageSize: number,
): UserRemindersResponse {
  const reminders = Array.isArray(data?.reminders)
    ? data.reminders.map((reminder: UserRemindersItem) => ({
        ...reminder,
        is_active: reminder.is_active ?? reminder.status === 'active',
      }))
    : [];

  return {
    reminders,
    total_count: data?.total_count ?? reminders.length,
    page: data?.page ?? page,
    page_size: data?.page_size ?? pageSize,
    has_next: data?.has_next ?? false,
  };
}

// ============================================
// CORE OPERATIONS
// ============================================

export async function addReminder(
  sku: string,
  email?: string,
): Promise<{ success?: boolean } | void> {
  const res = await post(`${BASE}`, {
    sku,
    email,
    expires_in_days: 30,
  });
  return unwrap(res);
}

export async function removeReminder(
  sku: string,
): Promise<{ success?: boolean; message?: string } | void> {
  return del(`${BASE}`, { data: { sku } });
}

export async function toggleReminder(
  sku: string,
  email?: string,
): Promise<ReminderToggleResponse> {
  const res = await post<any>(`${BASE}/toggle`, {
    sku,
    email,
    expires_in_days: 30,
  });
  return unwrap<ReminderToggleResponse>(res);
}

// ============================================
// STATUS
// ============================================

export async function getReminderStatus(
  sku: string,
): Promise<ReminderStatusResponse> {
  const res = await get<any>(`${BASE}/status/${encodeURIComponent(sku)}`);
  return normalizeReminderStatus(unwrap(res));
}

export async function getBulkReminderStatus(
  skus: string[],
): Promise<ReminderStatusResponse[]> {
  const res = await post<any>(`${BASE}/status/bulk`, { skus });
  const data = unwrap<BulkReminderStatusResponse | ReminderStatusResponse[]>(
    res,
  );

  if (Array.isArray(data)) {
    return data.map(normalizeReminderStatus);
  }

  if (data && Array.isArray(data.reminder_statuses)) {
    return data.reminder_statuses.map(normalizeReminderStatus);
  }

  return [];
}

// ============================================
// USER REMINDERS
// ============================================

export async function getUserReminders(
  page = 1,
  pageSize = 20,
  userId?: string,
  statusFilter?: 'active' | 'notified' | 'expired' | 'cancelled',
): Promise<UserRemindersResponse> {
  const params: Record<string, string> = {
    page: String(page),
    limit: String(pageSize),
  };
  if (statusFilter) {
    params.status = statusFilter;
  }
  const qs = new URLSearchParams(params).toString();
  const res = await get<any>(`${BASE}/user?${qs}`);
  return normalizeUserReminders(unwrap(res), page, pageSize);
}

// ============================================
// STATS
// ============================================

export async function getProductReminderStats(
  sku: string,
): Promise<ReminderStatsResponse> {
  const res = await get<any>(`${BASE}/stats/${encodeURIComponent(sku)}`);
  return unwrap<ReminderStatsResponse>(res);
}

// ============================================
// UTILITIES
// ============================================

export async function clearAllUserReminders(): Promise<{
  success?: boolean;
  message?: string;
  deleted_count?: number;
} | void> {
  const res = await del(`${BASE}/user/all`);
  return unwrap(res);
}
