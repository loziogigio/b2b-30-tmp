import CheckoutFlow from '@components/cart/checkout-flow';
import Container from '@components/ui/container';
import Divider from '@components/ui/divider';
import CartHydrator from '@framework/cart/b2b-cart';

import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({ params }: { params: any }) {
  const { lang } = await params;

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
