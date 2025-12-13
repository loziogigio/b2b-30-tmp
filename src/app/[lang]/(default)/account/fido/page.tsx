import FidoClient from './fido.client';

type Props = { params: Promise<{ lang: string }> };

export default async function Page({ params }: Props) {
  const { lang } = await params;
  return <FidoClient lang={lang ?? 'it'} />;
}
