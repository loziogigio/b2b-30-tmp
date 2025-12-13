// app/[lang]/account/profile/page.tsx

import ProfileClient from './profile.client';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="mx-auto w-full px-3  sm:px-6 lg:px-8">
      <ProfileClient lang={lang} />
    </div>
  );
}
