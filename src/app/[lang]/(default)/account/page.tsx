// app/[lang]/account/page.tsx
import { redirect } from 'next/navigation';
import { isTimeTheme } from '@/lib/theme/resolver';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  if (!isTimeTheme()) {
    redirect('account/profile');
  }

  const { lang } = await params;

  // Time theme: render dashboard
  const { default: TimeAccountDashboard } = await import(
    '@/components/themes/time/account/time-account-dashboard'
  );
  return <TimeAccountDashboard lang={lang} />;
}
