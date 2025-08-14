// app/[lang]/category/[[...slug]]/page.tsx  (Next.js App Router)

import CategoryPage from "@components/category/category-page";

export default function Page({
  params,
}: {
  params: { lang: string; slug?: string[] };
}) {
  return <CategoryPage lang={params.lang} slug={params.slug ?? []} />;
}
