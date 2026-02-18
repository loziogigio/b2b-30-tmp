// components/product/b2b-product-variants-quick-view.tsx
'use client';

import { IoClose } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import B2BVariantsGridContent from './b2b-variants-grid-content';

export default function B2BProductVariantsQuickView({
  lang,
}: {
  lang: string;
}) {
  const { data } = useModalState();
  const { closeModal } = useModalAction();

  const product = (data as any)?.product ?? data;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Close button — prominent, top-right */}
      <button
        onClick={closeModal}
        aria-label="Close"
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 shadow-sm transition-colors"
      >
        <IoClose className="text-2xl" />
      </button>

      <B2BVariantsGridContent
        lang={lang}
        product={product}
        useWindowScroll={false}
        onBrandClick={() => closeModal()}
      />
    </div>
  );
}
