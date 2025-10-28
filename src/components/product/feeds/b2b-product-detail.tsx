'use client';

import Breadcrumb from '@components/ui/breadcrumb';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import ProductSingleDetailsHidros from '../product-hidros';
import ProductB2BDetails from '../product-b2b-details';
import type { PageBlock } from '@/lib/types/blocks';

interface Props {
  sku: string;
  lang: string;
  blocks?: PageBlock[];
  showZoneLabels?: boolean;
}

export default function B2BProductDetail({ sku, lang, blocks = [], showZoneLabels = false }: Props) {
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
          <ProductB2BDetails lang={lang} search={search} blocks={blocks} showZoneLabels={showZoneLabels} />
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
