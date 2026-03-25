import { getThemeId } from '@/lib/theme/resolver';
import DefaultLayout from '@layouts/b2b/layout';
import TimeLayout from '@/components/themes/time/layout/time-layout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { lang } = await params;
  const LayoutComponent = getThemeId() === 'time' ? TimeLayout : DefaultLayout;
  return <LayoutComponent lang={lang}>{children}</LayoutComponent>;
}
