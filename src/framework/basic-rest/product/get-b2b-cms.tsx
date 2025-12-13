// @framework/product/get-b2b-cms

import { get } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  transformSliderTop,
  transformHomeBrand,
  transformPromoBanner,
  transformFlyer,
  HomeCategory,
  filterHomeCategory,
} from '@utils/transform/b2b-cms-home';
import { BannerCardItem } from '@framework/types-b2b';
import {
  CategoryPill,
  CmsB2BMenuItem,
  CmsB2BMenuResponseRaw, // NOTE: make sure this type supports BOTH shapes (array OR {message: []})
  mapMenuToPills, // we'll use this to avoid duplicating mapping logic
} from '@utils/transform/b2b-cms-menu';

/* =========================
   HOME DATA (CMS_B2B_HOME_DATA)
========================= */

export type CmsB2BHomeData = {
  slider_top_transformed: BannerCardItem[];
  home_brand_transformed: BannerCardItem[];
  promo_banner_transformed: BannerCardItem[];
  flyer_transformed: BannerCardItem[];
  home_category_filtered: HomeCategory[];
};

export const fetchCmsB2BHomeData = async (): Promise<CmsB2BHomeData> => {
  const data = await get<any>(API_ENDPOINTS_B2B.CMS_B2B_HOME_DATA);

  const slider_top_transformed = transformSliderTop(data.slider_top || []);
  const home_brand_transformed = transformHomeBrand(data.home_brand || []);
  const promo_banner_transformed = transformPromoBanner(
    data.promo_banner || [],
  );
  const flyer_transformed = transformFlyer(data.flyer || []);
  const home_category_filtered = filterHomeCategory(data.home_category || []);

  return {
    slider_top_transformed,
    home_brand_transformed,
    promo_banner_transformed,
    flyer_transformed,
    home_category_filtered,
  };
};

export type CmsB2BHomeQueryOptions = Omit<
  UseQueryOptions<CmsB2BHomeData, Error>,
  'queryKey' | 'queryFn'
>;

export const useCmsB2BHomeDataQuery = (options?: CmsB2BHomeQueryOptions) =>
  useQuery<CmsB2BHomeData, Error>({
    queryKey: [API_ENDPOINTS_B2B.CMS_B2B_HOME_DATA],
    queryFn: fetchCmsB2BHomeData,
    // sensible default; caller can override
    staleTime: 5 * 60 * 1000,
    ...options,
  });

/* =========================
   MENU → PILLS (CMS_B2B_CATEGORY)
========================= */

type CmsB2BMenuQueryData = { data: CategoryPill[] };

export const fetchCmsB2BMenu = async (): Promise<CmsB2BMenuQueryData> => {
  const raw = await get<CmsB2BMenuResponseRaw>(
    API_ENDPOINTS_B2B.CMS_B2B_CATEGORY,
  );

  // Accept both API shapes: array OR { message: [] }
  const items: CmsB2BMenuItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.message)
      ? raw.message!
      : [];

  // filter disabled + map to pills (centralized mapper)
  const pills = mapMenuToPills(items.filter((i) => i.disable === 0));

  return { data: pills };
};

export type CmsB2BMenuQueryOptions = Omit<
  UseQueryOptions<CmsB2BMenuQueryData, Error>,
  'queryKey' | 'queryFn'
>;

export const useCmsB2BMenuQuery = (options?: CmsB2BMenuQueryOptions) =>
  useQuery<CmsB2BMenuQueryData, Error>({
    queryKey: [API_ENDPOINTS_B2B.CMS_B2B_CATEGORY, 'pills'],
    queryFn: fetchCmsB2BMenu,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

/* =========================
   MENU → RAW (for building trees)
========================= */

export const fetchCmsB2BMenuRaw = async (): Promise<CmsB2BMenuItem[]> => {
  const raw = await get<CmsB2BMenuResponseRaw>(
    API_ENDPOINTS_B2B.CMS_B2B_CATEGORY,
  );

  const items: CmsB2BMenuItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.message)
      ? raw.message!
      : [];

  // keep only enabled here too; tree builder can assume clean data
  return items.filter((i) => i.disable === 0);
};

export type CmsB2BMenuRawQueryOptions = Omit<
  UseQueryOptions<CmsB2BMenuItem[], Error>,
  'queryKey' | 'queryFn'
>;

export const useCmsB2BMenuRawQuery = (options?: CmsB2BMenuRawQueryOptions) =>
  useQuery<CmsB2BMenuItem[], Error>({
    queryKey: [API_ENDPOINTS_B2B.CMS_B2B_CATEGORY, 'raw'],
    queryFn: fetchCmsB2BMenuRaw,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
