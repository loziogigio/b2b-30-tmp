'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useUI } from '@contexts/ui.context';
import { Drawer } from '@components/common/drawer/drawer';
import { getDirection } from '@utils/get-direction';
import motionProps from '@components/common/drawer/motion';
import CartHydrator, { useCartQuery } from '@framework/cart/b2b-cart';

// Your components
const Cart = dynamic(() => import('@components/cart/cart'));
const OrderDetails = dynamic(() => import('@components/order/order-drawer'));

// Hydrator + query (default export + named)

export default function ManagedDrawer({ lang }: { lang: string }) {
  const { displayDrawer, closeDrawer, drawerView } = useUI();
  const dir = getDirection(lang);
  const contentWrapperCSS = dir === 'ltr' ? { right: 0 } : { left: 0 };

  // Ask server for a fresh snapshot whenever the cart drawer opens
  const { refetch, isFetching } = useCartQuery();
  useEffect(() => {
    if (displayDrawer && drawerView === 'CART_SIDEBAR') {
      refetch(); // triggers fetchCart; CartHydrator will hydrate local cart
    }
  }, [displayDrawer, drawerView, refetch]);

  return (
    <Drawer
      rootClassName={
        drawerView === 'ORDER_DETAILS' ? 'order-details-drawer' : ''
      }
      open={displayDrawer}
      placement={dir === 'rtl' ? 'left' : 'right'}
      onClose={closeDrawer}
      // @ts-ignore
      level={null}
      contentWrapperStyle={contentWrapperCSS}
      {...motionProps}
    >
      {drawerView === 'CART_SIDEBAR' && (
        <>
          {/* optional tiny syncing indicator */}
          {isFetching ? (
            <div className="px-4 py-2 text-xs text-gray-500">Syncing cart…</div>
          ) : null}
          <Cart lang={lang} />
        </>
      )}

      {drawerView === 'ORDER_DETAILS' && <OrderDetails lang={lang} />}
    </Drawer>
  );
}
