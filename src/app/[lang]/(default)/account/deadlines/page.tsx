import DeadlinesClient from './deadlines.client';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;
  return <DeadlinesClient lang={lang ?? 'it'} />;
}
