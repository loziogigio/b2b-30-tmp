'use client';

import Breadcrumb from '@components/ui/breadcrumb';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import ProductSingleDetailsHidros from '../product-hidros';
import ProductB2BDetails from '../product-b2b-details';

interface Props {
  sku: string;
  lang: string;
}

export default function B2BProductDetail({ sku, lang }: Props) {
    const search = {
        sku:sku
    }
;

  return (
    <>
      <Divider />
      <div className="pt-6 lg:pt-7">
        <Container>
          <Breadcrumb lang={lang} />
          <ProductB2BDetails lang={lang} search={search} />
        </Container>
      </div>

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
