import FidoClient from './fido.client';

type Props = { params: { lang: string } };

export default function Page({ params }: Props) {
  const lang = params.lang ?? 'it';
  return <FidoClient lang={lang} />;
}
