'use client';

import Breadcrumb from '@components/ui/breadcrumb';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
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
  const search = {
    sku: sku,
  };
  return (
    <>
      <Divider />
      <div className="pt-6 lg:pt-7">
        <Container>
          <Breadcrumb lang={lang} />
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
