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
  const themeId = await getThemeIdFromRequest();
  const LayoutComponent = themeId === 'time' ? TimeLayout : DefaultLayout;
  return <LayoutComponent lang={lang}>{children}</LayoutComponent>;
}
