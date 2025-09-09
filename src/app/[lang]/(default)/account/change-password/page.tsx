// app/[lang]/account/change-password/page.tsx
import ChangePasswordClient from './change-password.client';

export default function Page({ params: { lang } }: { params: { lang: string } }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 lg:px-8">
      <ChangePasswordClient lang={lang} />
    </div>
  );
}
