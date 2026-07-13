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
  categoryRoot?: string;
  siteUrl?: string;
  canonicalUrl?: string;
  categoryAncestors?: string[];
  categoryChannel?: string;
  suppressProductJsonLd?: boolean;
}

const ThemedProductDetail = getThemedComponent('ProductDetail');

export default function B2BProductDetail({
  sku,
  lang,
  blocks = [],
  showZoneLabels = false,
  categoryRoot,
  siteUrl,
  canonicalUrl,
  categoryAncestors,
  categoryChannel,
  suppressProductJsonLd,
}: Props) {
  const search = { sku };

  return (
    <>
      <Divider />
      <div className="pt-6 lg:pt-7">
        <Container>
          <ProductCategoryBreadcrumb
            lang={lang}
            sku={sku}
            categoryRoot={categoryRoot}
            categoryAncestors={categoryAncestors}
            channel={categoryChannel}
          />
          <ThemedProductDetail
            lang={lang}
            search={search}
            blocks={blocks}
            showZoneLabels={showZoneLabels}
            siteUrl={siteUrl}
            canonicalUrl={canonicalUrl}
            suppressProductJsonLd={suppressProductJsonLd}
          />
        </Container>
      </div>
    </>
  );
}
