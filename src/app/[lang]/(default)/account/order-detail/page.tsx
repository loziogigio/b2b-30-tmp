// app/[lang]/account/order-detail/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import OrderDetailClient from './order-detail.client';

export const metadata: Metadata = {
  title: 'Order Details',
};

type PageProps = {
  params: { lang?: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

const asString = (v?: string | string[]) => (Array.isArray(v) ? v[0] ?? '' : v ?? '');

export default function OrderDetailsPage({ params, searchParams = {} }: PageProps) {
  const lang = (params.lang ?? 'en').toLowerCase();

  const cause = asString(searchParams.cause);
  const doc_year = asString(searchParams.doc_year);
  const doc_number = asString(searchParams.doc_number);

  const missing = !cause || !doc_year || !doc_number;

  return (
    <main className="min-h-screen bg-gray-100 py-8" lang={lang} data-lang={lang}>
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="mb-4">
          <Link
            href={`/${lang}/account/orders`}
            className="text-sm text-teal-600 hover:underline"
            aria-label="Back to orders"
          >
            ← Back to orders
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          {missing ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">Missing required parameters.</p>
              <p className="text-gray-600">
                Please open this page with <code>cause</code>, <code>doc_year</code>, and <code>doc_number</code> in the URL query,
                e.g. <code>?cause=OBUI&amp;doc_year=2025&amp;doc_number=162876</code>.
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
