// app/[lang]/account/profile/page.tsx

import ProfileClient from './profile.client';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
    const { default: TimeProfile } = await import(
      '@/components/themes/time/account/time-account-profile'
    );
    return <TimeProfile lang={lang} />;
  }

  return (
    <div className="mx-auto w-full px-3  sm:px-6 lg:px-8">
      <ProfileClient lang={lang} />
    </div>
  );
}
