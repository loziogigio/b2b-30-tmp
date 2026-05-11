'use client';

import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import ProductCategoryBreadcrumb from '@components/ui/product-category-breadcrumb';
import { getThemedComponent } from '@/lib/theme/registry';
import type { PageBlock } from '@/lib/types/blocks';

interface Props {
  sku: string;
  lang: string;
  blocks?: PageBlock[];
  showZoneLabels?: boolean;
}

const ThemedProductDetail = getThemedComponent('ProductDetail');

export default function B2BProductDetail({
  sku,
  lang,
  blocks = [],
  showZoneLabels = false,
}: Props) {
  const search = { sku };

  return (
    <>
      <Divider />
      <div className="pt-6 lg:pt-7">
        <Container>
          <ProductCategoryBreadcrumb lang={lang} sku={sku} />
          <ThemedProductDetail
            lang={lang}
            search={search}
            blocks={blocks}
            showZoneLabels={showZoneLabels}
          />
        </Container>
      </div>
    </>
  );
}
