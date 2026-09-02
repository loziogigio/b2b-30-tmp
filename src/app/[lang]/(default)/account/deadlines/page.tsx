import DeadlinesClient from './deadlines.client';
import { notFound } from 'next/navigation';
import { isTimeThemeFromRequest } from '@/lib/theme/server';
import { resolveAccountConfigFromHeaders } from '@/lib/erp/account-config';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  // Hiding the sidebar entry is not enough: without this the payment deadlines would
  // still be reachable by typing the URL. `account_settings.show_deadlines`
  // off ⇒ the route behaves as if it does not exist.
  const { showDeadlines } = await resolveAccountConfigFromHeaders();
  if (!showDeadlines) notFound();

  if (await isTimeThemeFromRequest()) {
    const { default: TimeDeadlines } = await import(
      '@/components/themes/time/account/time-account-deadlines'
    );
    return <TimeDeadlines lang={lang ?? 'it'} />;
  }

  return <DeadlinesClient lang={lang ?? 'it'} />;
}
