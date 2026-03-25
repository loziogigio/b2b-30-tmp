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
  return unwrap<ReminderStatusResponse>(res);
}

export async function getBulkReminderStatus(
  skus: string[],
): Promise<ReminderStatusResponse[]> {
  const res = await post<any>(`${BASE}/status/bulk`, { skus });
  const data = unwrap<BulkReminderStatusResponse | ReminderStatusResponse[]>(
    res,
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.reminder_statuses)) {
    return data.reminder_statuses.map((status) => ({
      sku: status.sku,
      has_active_reminder: status.has_active_reminder,
      product_available: status.product_available,
      reminder_created_at: status.reminder_created_at ?? null,
    }));
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
  return unwrap<UserRemindersResponse>(res);
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
