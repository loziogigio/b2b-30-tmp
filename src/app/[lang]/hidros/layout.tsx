// import HidrosLayout from '@layouts/hidros/layout';

// export default async function Layout({
//   children,
//   params,
// }: {
//   children: React.ReactNode;
//   params: any;
// }) {
//   const { lang } = await params;
//   return <HidrosLayout lang={lang}>{children}</HidrosLayout>;
// }
import DefaultLayout from '@layouts/b2b/layout';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any;
}) {
  const { lang } = await params;
  return <DefaultLayout lang={lang}>{children}</DefaultLayout>;
}
