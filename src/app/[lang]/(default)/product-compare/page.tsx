import type { Metadata } from 'next';
import ProductCompareClient from '@/components/product/ProductCompareClient';
import { useTranslation as getServerTranslation } from 'src/app/i18n';

type ProductComparePageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductComparePageProps): Promise<Metadata> {
  const { lang } = await params;
  const { t } = await getServerTranslation(lang, 'common');
  return {
    title: t('text-product-comparison', { defaultValue: 'Product comparison' }),
  };
}

export default async function ProductComparisonPage({
  params,
}: ProductComparePageProps) {
  const resolvedParams = await params;
  return <ProductCompareClient lang={resolvedParams.lang ?? 'it'} />;
}
