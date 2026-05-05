import DeadlinesClient from './deadlines.client';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
    const { default: TimeDeadlines } = await import(
      '@/components/themes/time/account/time-account-deadlines'
    );
    return <TimeDeadlines lang={lang ?? 'it'} />;
  }

  return <DeadlinesClient lang={lang ?? 'it'} />;
}
