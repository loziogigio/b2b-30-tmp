import CheckoutFlow from '@components/cart/checkout-flow';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import CartHydrator from '@framework/cart/b2b-cart';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({ params }: { params: any }) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
    const { default: TimeCheckoutPage } = await import(
      '@/components/themes/time/cart/time-checkout-page'
    );
    return (
      <>
        <CartHydrator />
        <TimeCheckoutPage lang={lang} />
      </>
    );
  }

  return (
    <>
      <Divider />
      <Container className="py-10 2xl:py-12">
        <CartHydrator />
        <CheckoutFlow lang={lang} />
      </Container>
      <Divider />
    </>
  );
}
