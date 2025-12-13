// app/[lang]/category/[[...slug]]/page.tsx  (Next.js App Router)

import CategoryPage from '@components/category/category-page';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await params;
  return <CategoryPage lang={lang} slug={slug ?? []} />;
}
