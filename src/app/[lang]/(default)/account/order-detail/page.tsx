// app/[lang]/account/order-detail/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import OrderDetailClient from './order-detail.client';
import { useTranslation } from 'src/app/i18n';

export const metadata: Metadata = {
  title: 'Order Details',
};

type PageProps = {
  params: Promise<{ lang?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const asString = (v?: string | string[]) =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

export default async function OrderDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { lang: langParam } = await params;
  const sp = (await searchParams) ?? {};
  const lang = (langParam ?? 'en').toLowerCase();
  const { t } = await useTranslation(lang, 'common');

  const cause = asString(sp.cause);
  const doc_year = asString(sp.doc_year);
  const doc_number = asString(sp.doc_number);

  const missing = !cause || !doc_year || !doc_number;

  return (
    <main
      className="min-h-screen bg-gray-100 py-8"
      lang={lang}
      data-lang={lang}
    >
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="mb-4">
          <Link
            href={`/${lang}/account/orders`}
            className="text-sm text-teal-600 hover:underline"
            aria-label={t('order-detail-back')}
          >
            ← {t('order-detail-back')}
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          {missing ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {t('order-detail-missing-params')}
              </p>
              <p className="text-gray-600">
                {t('order-detail-missing-params-hint')}
              </p>
            </div>
          ) : (
            <OrderDetailClient
              lang={lang}
              initialParams={{ cause, doc_year, doc_number }}
            />
          )}
        </section>
      </div>
    </main>
  );
}
