import DocumentsClient from './documents-client';

export default function Page({ params: { lang } }: { params: { lang: string } }) {
  return <DocumentsClient lang={(lang ?? 'en').toLowerCase()} />;
}
