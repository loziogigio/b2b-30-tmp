import { notFound } from 'next/navigation';
import { languages } from '@/app/i18n/settings';
import { getThemeIdFromRequest } from '@/lib/theme/server';
import DefaultLayout from '@/components/themes/default/layout/default-layout';
import TimeLayout from '@/components/themes/time/layout/time-layout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { lang } = await params;
  // Requests that skip the locale middleware (`/favicon.ico`, missing root
  // assets, dotted scanner paths) arrive here with that raw first segment as
  // the language. The root layout may not call notFound() in Next 16, so this
  // is where an unsupported language becomes a real 404 instead of a rendered
  // home page.
  if (!languages.includes(lang)) notFound();
  const themeId = await getThemeIdFromRequest();
  const LayoutComponent = themeId === 'time' ? TimeLayout : DefaultLayout;
  return <LayoutComponent lang={lang}>{children}</LayoutComponent>;
}
