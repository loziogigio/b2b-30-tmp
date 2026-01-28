import { get, post, del } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

// Types aligned with the FastAPI spec provided
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

export interface UserLikesSummary {
  user_id: string;
  total_likes: number;
  likes_this_week: number;
  likes_this_month: number;
  last_liked_at?: string | null;
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

// Convenience alias
const EP = API_ENDPOINTS_B2B.LIKES;

// Global user identifier required by Likes API
// Use project_code from ERP_STATIC (set during login) or fall back to env
const getProjectCode = () =>
  ERP_STATIC.project_code ||
  process.env.NEXT_PUBLIC_PROJECT_CODE ||
  process.env.NEXT_PROJECT_CODE ||
  'APP';
const getUserId = () => {
  const projectCode = getProjectCode();
  const userId = `${projectCode}-${ERP_STATIC.customer_code}-${ERP_STATIC.address_code}`;
  console.log('[Likes] getUserId:', userId, 'ERP_STATIC:', ERP_STATIC);
  return userId;
};

// Core like operations
export async function addLike(
  sku: string,
): Promise<{ success?: boolean } | void> {
  return post(EP.ROOT, { user_id: getUserId(), sku });
}

export async function removeLike(
  sku: string,
): Promise<{ success?: boolean; message?: string } | void> {
  // Send body with DELETE via axios config
  return del(EP.ROOT, undefined, { data: { user_id: getUserId(), sku } });
}
export async function toggleLike(sku: string): Promise<LikeToggleResponse> {
  return post<LikeToggleResponse>(EP.TOGGLE, { user_id: getUserId(), sku });
}

// Status endpoints
export async function getLikeStatus(
  sku: string,
  userId: string = getUserId(),
): Promise<LikeStatusResponse> {
  return get<LikeStatusResponse>(EP.STATUS(userId, sku));
}

export async function getBulkLikeStatus(
  skus: string[],
  userId: string = getUserId(),
): Promise<BulkLikeStatusResponse> {
  return post<BulkLikeStatusResponse>(EP.BULK_STATUS, {
    user_id: userId,
    skus,
  });
}

// User likes
export async function getUserLikes(
  page = 1,
  pageSize = 20,
  userId: string = getUserId(),
): Promise<UserLikesResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  }).toString();
  return get<UserLikesResponse>(`${EP.USER(userId)}?${qs}`);
}

export async function getUserLikesSummary(
  userId: string = getUserId(),
): Promise<UserLikesSummary> {
  return get<UserLikesSummary>(EP.USER_SUMMARY(userId));
}

// Popular and trending
export async function getPopularProducts(
  limit = 10,
  days = 30,
  includeProductInfo = false,
): Promise<PopularProductsResponse[]> {
  const qs = new URLSearchParams({
    limit: String(limit),
    days: String(days),
    include_product_info: String(includeProductInfo),
  }).toString();
  return get<PopularProductsResponse[]>(`${EP.POPULAR}?${qs}`);
}

export async function getTrendingProducts(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '7d',
  limit = 20,
  includeProductInfo = false,
): Promise<TrendingProductsResponse[]> {
  const qs = new URLSearchParams({
    time_period: String(timePeriod),
    limit: String(limit),
    include_product_info: String(includeProductInfo),
  }).toString();
  return get<TrendingProductsResponse[]>(`${EP.TRENDING}?${qs}`);
}

export async function getTrendingProductsPage(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '7d',
  page = 1,
  pageSize = 24,
  includeProductInfo = false,
): Promise<TrendingProductsPageResponse> {
  const qs = new URLSearchParams({
    time_period: String(timePeriod),
    page: String(page),
    page_size: String(pageSize),
    include_product_info: String(includeProductInfo),
  }).toString();
  return get<TrendingProductsPageResponse>(`${EP.TRENDING}?${qs}`);
}

// Analytics and stats
export async function getLikesAnalytics(
  timePeriod: '1d' | '7d' | '30d' | '90d' | string = '30d',
): Promise<LikeAnalyticsResponse> {
  const qs = new URLSearchParams({
    time_period: String(timePeriod),
  }).toString();
  return get<LikeAnalyticsResponse>(`${EP.ANALYTICS}?${qs}`);
}

export async function getProductLikeStats(
  sku: string,
): Promise<{ sku: string; total_likes: number; message?: string }> {
  return get<{ sku: string; total_likes: number; message?: string }>(
    EP.STATS(sku),
  );
}

// Utilities
export async function clearAllUserLikes(userId: string = getUserId()): Promise<{
  success?: boolean;
  message?: string;
  likes_cleared?: number;
} | void> {
  return del(EP.CLEAR_ALL(userId));
}

export async function likesHealthCheck(): Promise<{
  status: string;
  service: string;
  mongodb: string;
  redis: string;
  timestamp: string;
}> {
  return get(EP.HEALTH);
}
