import { BannerCardItem } from '@framework/types-b2b';

type SliderRawItem = {
  order: string;
  status: string;
  b2b: number;
  url: string;
  slide_image: { url: string }[];
  slide_image_mobile: { url: string }[];
};

type RawHomeBrandItem = {
  order: number;
  label: string;
  url: string;
  image: string;
  b2b: number;
  status: string;
};

type RawPromoBannerItem = {
  order: number;
  label: string;
  url: string;
  slide_image: string;
  b2b: number;
  status: string;
};
export type RawFlyer = {
  order: number;
  label: string;
  url: string;
  flyer_image: string;
  b2b: number;
  b2c?: number;
  status: string;
};

export type HomeCategory = {
  order: number;
  label: string;
  url: string;
  image: string;
  b2b: number;
  b2c?: number;
  status: string;
};

export function filterHomeCategory(categories: HomeCategory[]): HomeCategory[] {
  return categories
    .filter((item) => item.b2b === 1 && item.status === 'Published')
    .sort((a, b) => a.order - b.order);
}

export function transformFlyer(flyers: RawFlyer[]): BannerCardItem[] {
  return flyers
    .filter((item) => item.b2b === 1 && item.status === 'Published')
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      id: index + 1,
      title: item.label ?? `Flyer ${index + 1}`,
      slug: item.url,
      image: {
        mobile: {
          url: item.flyer_image,
          width: 475,
          height: 250,
        },
        desktop: {
          url: item.flyer_image,
          width: 1200,
          height: 600,
        },
      },
    }));
}

export function transformPromoBanner(
  raw: RawPromoBannerItem[],
): BannerCardItem[] {
  return raw
    .filter((item) => item.b2b === 1 && item.status === 'Published')
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      id: index + 1,
      title: item.label,
      slug: item.url.startsWith('/') ? item.url : `/${item.url}`,
      image: {
        mobile: {
          url: item.slide_image,
          width: 475,
          height: 250,
        },
        desktop: {
          url: item.slide_image,
          width: 1200,
          height: 600,
        },
      },
    }));
}
export function transformHomeBrand(
  rawBrands: RawHomeBrandItem[],
): BannerCardItem[] {
  return rawBrands
    .filter((item) => item.b2b === 1 && item.status === 'Published')
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      id: index + 1,
      title: item.label,
      slug: item.url.startsWith('/') ? item.url : `/${item.url}`,
      image: {
        mobile: {
          url: item.image,
          width: 300,
          height: 150,
        },
        desktop: {
          url: item.image,
          width: 500,
          height: 250,
        },
      },
    }));
}

export function transformSliderTop(
  rawSlider: SliderRawItem[],
): BannerCardItem[] {
  return rawSlider
    .filter((item) => item.b2b === 1 && item.status === 'Published')
    .sort((a, b) => a.order.localeCompare(b.order))
    .map((item, index) => ({
      id: index + 1,
      title: `Banner ${index + 1}`, // Or use item.title_1 if available
      slug: item.url,
      image: {
        mobile: {
          url: item.slide_image_mobile?.[0]?.url ?? '',
          width: 475,
          height: 250,
        },
        desktop: {
          url: item.slide_image?.[0]?.url ?? '',
          width: 1200,
          height: 600,
        },
      },
    }));
}
