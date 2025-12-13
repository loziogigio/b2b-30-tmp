import Container from '@components/ui/container';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import BannerAllCarousel from '@components/common/banner-all-carousel';
import B2BHomeProducts from '@components/product/feeds/b2b-home-products';
import { fetchCmsB2BHomeData } from '@framework/product/get-b2b-cms';
import {
  getLatestHomeTemplateVersion,
  getPublishedHomeTemplate,
} from '@/lib/db/home-templates';
import { HomePageWithPreview } from '@components/home/HomePageWithPreview';
import {
  PAGE_CONTEXT_COOKIE,
  ADDRESS_STATE_COOKIE,
  buildContextFromParams,
  contextToTags,
  ensureLanguageAttribute,
  mergeContexts,
  parseContextCookie,
  type PageContext,
} from '@/lib/page-context';

// This page depends on external APIs. Force dynamic rendering so Docker/CI builds
// don't attempt to prerender it at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Home',
};
const sliderTopBreakpoints = {
  '1536': {
    slidesPerView: 2,
    spaceBetween: 20,
  },
  '1280': {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  '1024': {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  '768': {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  '520': {
    slidesPerView: 2,
    spaceBetween: 12,
  },
  '0': {
    slidesPerView: 1,
    spaceBetween: 5,
  },
};

const promoBannerBreakpoints = {
  '1536': {
    slidesPerView: 5.5,
    spaceBetween: 20,
  },
  '768': {
    slidesPerView: 4.5,
    spaceBetween: 16,
  },
  '520': {
    slidesPerView: 3.5,
    spaceBetween: 12,
  },
  '0': {
    slidesPerView: 2.5,
    spaceBetween: 5,
  },
};
const homeBrandBreakpoints = {
  '1536': {
    slidesPerView: 10.5,
    spaceBetween: 20,
  },
  '1280': {
    slidesPerView: 8.5,
    spaceBetween: 16,
  },
  '1024': {
    slidesPerView: 6.5,
    spaceBetween: 16,
  },
  '768': {
    slidesPerView: 4.5,
    spaceBetween: 16,
  },
  '520': {
    slidesPerView: 4.5,
    spaceBetween: 12,
  },
  '0': {
    slidesPerView: 3.5,
  },
};
const flyerBreakpoints = {
  '1536': {
    slidesPerView: 5,
    spaceBetween: 20,
  },
  '1280': {
    slidesPerView: 5,
    spaceBetween: 16,
  },
  '1024': {
    slidesPerView: 5,
    spaceBetween: 16,
  },
  '768': {
    slidesPerView: 4,
    spaceBetween: 16,
  },
  '520': {
    slidesPerView: 4,
    spaceBetween: 12,
  },
  '0': {
    slidesPerView: 2,
  },
};

type HomePageSearchParams = {
  preview?: string | string[];
  tag?: string | string[];
  homeTag?: string | string[];
  templateTag?: string | string[];
  campaign?: string | string[];
  segment?: string | string[];
  region?: string | string[];
  language?: string | string[];
  device?: string | string[];
  [key: string]: string | string[] | undefined;
};

const coerceParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: any;
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const { lang } = await params;
  const search = searchParams ? await searchParams : undefined;
  const previewParam = coerceParam(search?.preview);
  const isPreview = previewParam === 'true';
  const cookieStore = await cookies();
  const storedContext = parseContextCookie(
    cookieStore.get(PAGE_CONTEXT_COOKIE)?.value,
  );

  // Read addressState from cookie (set by AddressProvider when user selects delivery address)
  const addressStateCookie = cookieStore.get(ADDRESS_STATE_COOKIE)?.value;
  const addressState = addressStateCookie
    ? decodeURIComponent(addressStateCookie)
    : undefined;

  console.log('[Home Page] Address cookie debug:', {
    cookieName: ADDRESS_STATE_COOKIE,
    rawCookieValue: addressStateCookie,
    decodedAddressState: addressState,
    allCookies: cookieStore.getAll().map((c) => c.name),
  });

  const queryContext = buildContextFromParams({
    campaign: coerceParam(search?.campaign),
    tag: coerceParam(search?.tag),
    homeTag: coerceParam(search?.homeTag),
    templateTag: coerceParam(search?.templateTag),
    segment: coerceParam(search?.segment),
    region: coerceParam(search?.region),
    language: coerceParam(search?.language),
    device: coerceParam(search?.device),
  });

  // Build address context if user has selected a delivery address
  const addressContext: PageContext | null = addressState
    ? { addressState, source: 'address' }
    : null;

  const baseContext = mergeContexts(
    storedContext,
    queryContext,
    addressContext,
  );
  const combinedContext = ensureLanguageAttribute(baseContext, lang);
  const versionTags = contextToTags(combinedContext);

  let homeTemplate = null;
  try {
    if (isPreview) {
      homeTemplate = await getLatestHomeTemplateVersion({ tags: versionTags });
      if (!homeTemplate) {
        console.warn(
          '[Home Page] No draft version available, falling back to published template',
        );
        homeTemplate = await getPublishedHomeTemplate({ tags: versionTags });
      }
    } else {
      homeTemplate = await getPublishedHomeTemplate({ tags: versionTags });
    }
  } catch (err) {
    console.error('[Home Page] Error loading home template:', err);
    homeTemplate = null;
  }

  console.log(
    '[Home Page] Template loaded:',
    homeTemplate ? `${homeTemplate.blocks?.length || 0} blocks` : 'null',
    'preview:',
    isPreview,
    'context:',
    versionTags || 'default',
    'matchedBy:',
    homeTemplate?.matchedBy ?? 'n/a',
  );

  if (!homeTemplate && versionTags) {
    console.warn(
      `[Home Page] No template found for context "${JSON.stringify(versionTags)}", rendering default layout`,
    );
  }

  // Load CMS data as fallback or for carousel data
  const sliderTopData = await fetchCmsB2BHomeData().catch(() => ({
    slider_top_transformed: [],
    home_brand_transformed: [],
    promo_banner_transformed: [],
    flyer_transformed: [],
    home_category_filtered: [],
  }));

  // If we have a published home template OR if in preview mode, use the preview wrapper
  if ((homeTemplate?.blocks && homeTemplate.blocks.length > 0) || isPreview) {
    return (
      <HomePageWithPreview
        lang={lang}
        serverBlocks={homeTemplate?.blocks || []}
        cmsData={sliderTopData}
        isPreview={isPreview}
        templateTags={homeTemplate?.tags ?? versionTags}
        matchInfo={homeTemplate?.matchedBy}
      />
    );
  }

  // Otherwise, render the default hardcoded layout
  return (
    <>
      <Container>
        <BannerAllCarousel
          data={sliderTopData.slider_top_transformed}
          className="mb-12 xl:mb-8 pt-1"
          lang={lang}
          breakpoints={sliderTopBreakpoints}
          key="slider_top_transformed"
          itemKeyPrefix="slider_top_transformed"
        />
      </Container>

      <Container>
        <BannerAllCarousel
          data={sliderTopData.promo_banner_transformed}
          className="mb-12 xl:mb-8 pt-1"
          lang={lang}
          breakpoints={promoBannerBreakpoints}
          key="promo_banner_transformed"
          itemKeyPrefix="promo_banner_transformed"
        />
      </Container>

      <B2BHomeProducts
        lang={lang}
        homeCategoryFiltered={sliderTopData.home_category_filtered}
      />

      <Container>
        <BannerAllCarousel
          data={sliderTopData.home_brand_transformed}
          className="mb-12 xl:mb-8 pt-1"
          lang={lang}
          breakpoints={homeBrandBreakpoints}
          key="home_brand_transformed"
          itemKeyPrefix="home_brand_transformed"
        />
      </Container>

      <Container>
        <BannerAllCarousel
          data={sliderTopData.flyer_transformed}
          className="mb-12 xl:mb-8 pt-1"
          lang={lang}
          breakpoints={flyerBreakpoints}
          key="flyer_transformed"
          itemKeyPrefix="flyer_transformed"
        />
      </Container>
    </>
  );
}
