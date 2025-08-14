import CollectionGrid from '@components/common/collection-grid';
import FeatureGrid from '@components/common/featured-grid';
import Container from '@components/ui/container';
import DownloadApps from '@components/common/download-apps';
import HidrosDemoProducts from '@components/product/feeds/hidros-demo-products';
import FreshVegetablesProductFeed from '@components/product/feeds/fresh-vegetables-product-feed';
import CookiesProductFeed from '@components/product/feeds/cookies-product-feed';
import PopcornJerkyProductFeed from '@components/product/feeds/popcorn-jerky-product-feed';
import ChipsProductFeed from '@components/product/feeds/chips-product-feed';
import BannerGridTwo from '@components/common/banner-grid-two';
import { hidrosBannerTwo as banners } from '@framework/static/banner';
import { Metadata } from 'next';
import {
  bannerDiscountHidros,
  homeTwoBanner as banner,
} from '@framework/static/banner';
import BannerAllCarousel from '@components/common/banner-all-carousel';
import B2BHomeProducts from '@components/product/feeds/b2b-home-products';
import { fetchCmsB2BHomeData } from '@framework/product/get-b2b-cms';


export const metadata: Metadata = {
  title: 'Classic',
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


export default async function Page({ params }: { params: any }) {
  const { lang } = await params;
  const sliderTopData = await fetchCmsB2BHomeData();

  return (
    <>
      <Container>
        <BannerAllCarousel
          data={sliderTopData.slider_top_transformed}
          className="mb-12 xl:mb-14 pt-1"
          lang={lang}
          breakpoints={sliderTopBreakpoints}
          key='slider_top_transformed'
          
        />
      </Container>

      <Container>
        <BannerAllCarousel
          data={sliderTopData.promo_banner_transformed}
          className="mb-12 xl:mb-14 pt-1"
          lang={lang}
          breakpoints={promoBannerBreakpoints}
          key='promo_banner_transformed'
          // buttonSize='small'
        />
      </Container>

      
      <B2BHomeProducts lang={lang} homeCategoryFiltered={sliderTopData.home_category_filtered}/>

      <Container>
        <BannerAllCarousel
          data={sliderTopData.home_brand_transformed}
          className="mb-12 xl:mb-14 pt-1"
          lang={lang}
          breakpoints={homeBrandBreakpoints}
          key='home_brand_transformed'
          // buttonSize='small'
        />
      </Container>

      <Container>
        <BannerAllCarousel
          data={sliderTopData.flyer_transformed}
          className="mb-12 xl:mb-14 pt-1"
          lang={lang}
          breakpoints={flyerBreakpoints}
          key='home_brand_transformed'
          // buttonSize='small'
        />
      </Container>


      {/* <Container>
        <BannerGridTwo
          data={banners}
          className="my-3 md:my-4 lg:mt-0 lg:mb-5 xl:mb-6"
          lang={lang}
        />
        <FeatureGrid lang={lang} />
      </Container> */}
      {/* <DownloadApps lang={lang} /> */}
    </>
  );
}
