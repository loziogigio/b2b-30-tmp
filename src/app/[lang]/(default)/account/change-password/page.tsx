// app/[lang]/account/change-password/page.tsx
import ChangePasswordClient from './change-password.client';
import { isTimeTheme } from '@/lib/theme/resolver';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (isTimeTheme()) {
    const { default: TimePassword } = await import(
      '@/components/themes/time/account/time-account-password'
    );
    return <TimePassword lang={lang} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 lg:px-8">
      <ChangePasswordClient lang={lang} />
    </div>
  );
}
