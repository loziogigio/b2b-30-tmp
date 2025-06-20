import AntiqueRefinedLayout from '@layouts/antique-refined/layout';

export default async function DefaultLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { lang } = await params;
  return <AntiqueRefinedLayout lang={lang}>{children}</AntiqueRefinedLayout>;
}
