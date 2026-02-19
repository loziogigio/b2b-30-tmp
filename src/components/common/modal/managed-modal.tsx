'use client';

import Modal from '@components/common/modal/modal';
import dynamic from 'next/dynamic';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
const LoginForm = dynamic(() => import('@components/auth/login-form'));
const SignUpForm = dynamic(() => import('@components/auth/sign-up-form'));
const ForgetPasswordForm = dynamic(
  () => import('@components/auth/forget-password-form'),
);
const ProductPopup = dynamic(() => import('@components/product/product-popup'));
const AddressPopup = dynamic(
  () => import('@components/common/form/add-address'),
);
const PaymentPopup = dynamic(
  () => import('@components/common/form/add-payment'),
);
const PhoneNumberPopup = dynamic(
  () => import('@components/common/form/add-contact'),
);
const DeliveryAddresses = dynamic(
  () => import('@components/address/delivery-addresses'),
);
const CategoryPopup = dynamic(
  () => import('@components/category/category-popup'),
);
const B2BProductVariantsQuickView = dynamic(
  () => import('@components/product/b2b-product-variants-quick-view'),
);
const RadioPlayerModal = dynamic(
  () => import('@components/radio/radio-player-modal'),
);

export default function ManagedModal({ lang }: { lang: string }) {
  const { isOpen, view } = useModalState();
  const { closeModal } = useModalAction();

  // Radio player renders as floating window WITHOUT modal overlay
  if (view === 'RADIO_PLAYER') {
    return isOpen ? <RadioPlayerModal lang={lang} /> : null;
  }

  if (view === 'CATEGORY_VIEW') {
    return (
      <Modal open={isOpen} onClose={closeModal} variant="bottom">
        {view === 'CATEGORY_VIEW' && <CategoryPopup lang={lang} />}
      </Modal>
    );
  }

  if (view === 'B2B_PRODUCT_VARIANTS_QUICK_VIEW' || view === 'PRODUCT_VIEW') {
    return (
      <Modal open={isOpen} onClose={closeModal} variant="fullscreen">
        {view === 'B2B_PRODUCT_VARIANTS_QUICK_VIEW' && (
          <B2BProductVariantsQuickView lang={lang} />
        )}
        {view === 'PRODUCT_VIEW' && <ProductPopup lang={lang} />}
      </Modal>
    );
  }

  return (
    <Modal open={isOpen} onClose={closeModal}>
      {view === 'LOGIN_VIEW' && <LoginForm lang={lang} />}
      {view === 'SIGN_UP_VIEW' && <SignUpForm lang={lang} />}
      {view === 'FORGET_PASSWORD' && <ForgetPasswordForm lang={lang} />}
      {view === 'ADDRESS_VIEW_AND_EDIT' && <AddressPopup lang={lang} />}
      {view === 'PAYMENT' && <PaymentPopup lang={lang} />}
      {view === 'PHONE_NUMBER' && <PhoneNumberPopup lang={lang} />}
      {view === 'DELIVERY_VIEW' && <DeliveryAddresses lang={lang} />}
    </Modal>
  );
}
