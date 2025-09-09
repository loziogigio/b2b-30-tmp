// app/[lang]/account/profile/page.tsx

import ProfileClient from "./profile.client";

export default function ProfilePage({ params: { lang } }: { params: { lang: string } }) {
  return (
    <div className="mx-auto w-full px-3  sm:px-6 lg:px-8">
      <ProfileClient lang={lang} />
    </div>
  );
}
