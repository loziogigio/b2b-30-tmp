import type { Metadata } from 'next';
import ProductCompareClient from '@/components/product/ProductCompareClient';

export const metadata: Metadata = {
  title: 'Product comparison',
};

type ProductComparePageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export default async function ProductComparisonPage({
  params,
}: ProductComparePageProps) {
  const resolvedParams = await params;
  return <ProductCompareClient lang={resolvedParams.lang ?? 'it'} />;
}
