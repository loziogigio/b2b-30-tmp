import { get, post, del } from '@framework/utils/httpPIM';

// ============================================
// TYPES
// ============================================

export type ToggleAction = 'liked' | 'unliked';

export interface LikeToggleResponse {
  sku: string;
  user_id: string;
  action: ToggleAction;
  is_liked: boolean;
  total_likes: number;
}

export interface LikeStatusResponse {
  sku: string;
  user_id: string;
  is_liked: boolean;
  total_likes: number;
}

export interface BulkLikeStatusResponse {
  user_id: string;
  like_statuses: { sku: string; is_liked: boolean; total_likes: number }[];
}

export interface UserLikesItem {
  sku: string;
  liked_at?: string | null;
  is_active?: boolean;
}

export interface UserLikesResponse {
  likes: UserLikesItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface PopularProductsResponse {
  sku: string;
  total_likes: number;
  latest_like?: string | null;
  product_info?: any;
}

export interface TrendingProductsResponse {
  sku: string;
  recent_likes: number;
  velocity_score: number;
  product_info?: any;
}

export interface TrendingProductsPageResponse {
  items: TrendingProductsResponse[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface LikeAnalyticsResponse {
  time_period: '1d' | '7d' | '30d' | '90d' | string;
  total_likes: number;
  unique_users: number;
  unique_products: number;
  top_products: PopularProductsResponse[];
  generated_at: string;
}

// ============================================
// ENDPOINTS (commerce suite via PIM proxy)
// ============================================

const BASE = 'api/b2b/likes';

// Helper to unwrap commerce suite `{ success, data }` envelope
function unwrap<T>(res: any): T {
  return res?.data ?? res;
}

// ============================================
// CORE OPERATIONS
// ============================================

export async function addLike(
  sku: string,
): Promise<{ success?: boolean } | void> {
  const res = await post(`${BASE}`, { sku });
  return unwrap(res);
}

export async function removeLike(
  sku: string,
): Promise<{ success?: boolean; message?: string } | void> {
  return del(`${BASE}`, { data: { sku } });
}

export async function toggleLike(sku: string): Promise<LikeToggleResponse> {
  const res = await post<any>(`${BASE}/toggle`, { sku });
  return unwrap<LikeToggleResponse>(res);
}

// ============================================
// STATUS
// ============================================

export async function getLikeStatus(sku: string): Promise<LikeStatusResponse> {
  const res = await get<any>(`${BASE}/status/${encodeURIComponent(sku)}`);
  return unwrap<LikeStatusResponse>(res);
}

export async function getBulkLikeStatus(
  skus: string[],
): Promise<BulkLikeStatusResponse> {
  const res = await post<any>(`${BASE}/status/bulk`, { skus });
  return unwrap<BulkLikeStatusResponse>(res);
}

// ============================================
// USER LIKES
// ============================================

export async function getUserLikes(
  page = 1,
  pageSize = 20,
): Promise<UserLikesResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  }).toString();
  const res = await get<any>(`${BASE}/user?${qs}`);
  return unwrap<UserLikesResponse>(res);
}

// ============================================
// POPULAR & TRENDING
// ============================================

export async function getPopularProducts(
  limit = 10,
  days = 30,
): Promise<PopularProductsResponse[]> {
  const qs = new URLSearchParams({
    limit: String(limit),
    days: String(days),
  }).toString();
  const res = await get<any>(`${BASE}/popular?${qs}`);
  return unwrap<PopularProductsResponse[]>(res);
}

export async function getTrendingProducts(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '7d',
  limit = 20,
): Promise<TrendingProductsResponse[]> {
  const qs = new URLSearchParams({
    period: String(timePeriod),
    limit: String(limit),
  }).toString();
  const res = await get<any>(`${BASE}/trending?${qs}`);
  return unwrap<TrendingProductsResponse[]>(res);
}

export async function getTrendingProductsPage(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '7d',
  page = 1,
  pageSize = 24,
): Promise<TrendingProductsPageResponse> {
  const qs = new URLSearchParams({
    period: String(timePeriod),
    page: String(page),
    limit: String(pageSize),
  }).toString();
  const res = await get<any>(`${BASE}/trending?${qs}`);
  return unwrap<TrendingProductsPageResponse>(res);
}

// ============================================
// ANALYTICS
// ============================================

export async function getLikesAnalytics(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '30d',
): Promise<LikeAnalyticsResponse> {
  const qs = new URLSearchParams({
    period: String(timePeriod),
  }).toString();
  const res = await get<any>(`${BASE}/analytics?${qs}`);
  return unwrap<LikeAnalyticsResponse>(res);
}

export async function getProductLikeStats(
  sku: string,
): Promise<{ sku: string; total_likes: number; message?: string }> {
  const res = await get<any>(`${BASE}/stats/${encodeURIComponent(sku)}`);
  return unwrap(res);
}

// ============================================
// UTILITIES
// ============================================

export async function clearAllUserLikes(): Promise<{
  success?: boolean;
  message?: string;
  likes_cleared?: number;
} | void> {
  const res = await del(`${BASE}/user/all`);
  return unwrap(res);
}
