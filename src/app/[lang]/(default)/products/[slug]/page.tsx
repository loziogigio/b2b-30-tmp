import Container from '@components/ui/container';
import ProductSingleDetails from '@components/product/product';
import DownloadApps from '@components/common/download-apps';
import PopcornJerkyProductFeed from '@components/product/feeds/popcorn-jerky-product-feed';
import RelatedProductFeed from '@components/product/feeds/related-product-feed';
import Breadcrumb from '@components/ui/breadcrumb';
import Divider from '@components/ui/divider';
import HidrosDemoProducts from '@components/product/feeds/hidros-demo-products';
import ProductSingleDetailsHidros from '@components/product/product-hidros';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import B2BProductDetail from '@components/product/feeds/b2b-product-detail';


const breakpoints = {
  '1536': {
    slidesPerView: 5,
  },
  '1280': {
    slidesPerView: 4,
  },
  '1024': {
    slidesPerView: 3,
  },
  '640': {
    slidesPerView: 3,
  },
  '360': {
    slidesPerView: 2,
  },
  '0': {
    slidesPerView: 1,
  },
};


export default async function Page({ params }: { params: any }) {
  const { lang, slug } =  params; // 



  
  return (
    <>
      <B2BProductDetail lang={lang} sku={slug} />
      {/* <Divider />
      <div className="pt-6 lg:pt-7">
        <Container>
          <Breadcrumb lang={lang} />
          <ProductSingleDetailsHidros lang={lang} />
        </Container>
      </div> */}

      {/* <HidrosDemoProducts
          lang={lang}
          carouselBreakpoint={breakpoints}
        />
      <HidrosDemoProducts
          lang={lang}
          carouselBreakpoint={breakpoints}
        />
      <DownloadApps lang={lang} /> */}
    </>
  );
}
