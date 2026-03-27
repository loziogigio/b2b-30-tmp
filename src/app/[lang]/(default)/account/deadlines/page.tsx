import DeadlinesClient from './deadlines.client';
import { isTimeTheme } from '@/lib/theme/resolver';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;

  if (isTimeTheme()) {
    const { default: TimeDeadlines } = await import(
      '@/components/themes/time/account/time-account-deadlines'
    );
    return <TimeDeadlines lang={lang ?? 'it'} />;
  }

  return <DeadlinesClient lang={lang ?? 'it'} />;
}
