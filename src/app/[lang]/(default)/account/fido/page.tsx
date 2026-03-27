import FidoClient from './fido.client';
import { isTimeTheme } from '@/lib/theme/resolver';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  if (isTimeTheme()) {
    const { default: TimeFido } = await import(
      '@/components/themes/time/account/time-account-fido'
    );
    return <TimeFido lang={lang ?? 'it'} />;
  }

  return <FidoClient lang={lang ?? 'it'} />;
}
