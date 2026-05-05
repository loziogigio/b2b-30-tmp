import FidoClient from './fido.client';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
    const { default: TimeFido } = await import(
      '@/components/themes/time/account/time-account-fido'
    );
    return <TimeFido lang={lang ?? 'it'} />;
  }

  return <FidoClient lang={lang ?? 'it'} />;
}
