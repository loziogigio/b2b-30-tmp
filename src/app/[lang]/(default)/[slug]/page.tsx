import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCachedCmsPage } from '@/lib/db/cms-pages';
import { CmsPageRenderer } from '@/components/blocks/CmsPageRenderer';

interface RouteParams {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCachedCmsPage(slug);
  if (!page) return {};
  const seo = (page.seo ?? {}) as {
    title?: string;
    description?: string;
    og_image?: string;
  };
  return {
    title: seo.title || page.name,
    description: seo.description,
    openGraph: seo.og_image ? { images: [seo.og_image] } : undefined,
  };
}

export default async function CmsPage({ params }: RouteParams) {
  const { lang, slug } = await params;
  const page = await getCachedCmsPage(slug);
  if (!page) notFound();

  return (
    <CmsPageRenderer blocks={page.blocks ?? []} pageSlug={slug} lang={lang} />
  );
}
