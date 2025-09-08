// app/[lang]/account/fido/page.tsx

import DeadlinesClient from "./deadlines.client";


type Props = { params: { lang: string } };

export default function Page({ params }: Props) {
  const lang = params.lang ?? 'it';
  return <DeadlinesClient lang={lang} />;
}
