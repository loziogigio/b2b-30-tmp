import FidoClient from './fido.client';
import { notFound } from 'next/navigation';
import { isTimeThemeFromRequest } from '@/lib/theme/server';
import { resolveAccountConfigFromHeaders } from '@/lib/erp/account-config';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  // Hiding the sidebar entry is not enough: without this the Fido / credit line would
  // still be reachable by typing the URL. `account_settings.show_fido`
  // off ⇒ the route behaves as if it does not exist.
  const { showFido } = await resolveAccountConfigFromHeaders();
  if (!showFido) notFound();

  if (await isTimeThemeFromRequest()) {
    const { default: TimeFido } = await import(
      '@/components/themes/time/account/time-account-fido'
    );
    return <TimeFido lang={lang ?? 'it'} />;
  }

  return <FidoClient lang={lang ?? 'it'} />;
}
