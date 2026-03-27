'use client';

import React from 'react';
import { IoClose } from 'react-icons/io5';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import TimeVariantsGrid from './time-variants-grid';

export default function TimeVariantsQuickView({ lang }: { lang: string }) {
  const { data } = useModalState();
  const { closeModal } = useModalAction();

  const product = (data as any)?.product ?? data;

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      <button
        onClick={closeModal}
        aria-label="Close"
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-[var(--radius-btn)] bg-[var(--time-gray-50)] border border-[var(--time-gray-200)] flex items-center justify-center text-[var(--time-gray-500)] hover:bg-[var(--time-gray-100)] hover:text-[var(--time-dark)] transition-colors cursor-pointer"
      >
        <IoClose size={20} />
      </button>

      <div className="max-w-[1200px] mx-auto p-5 md:p-8 lg:p-10">
        <TimeVariantsGrid
          lang={lang}
          product={product}
          onBrandClick={() => closeModal()}
        />
      </div>
    </div>
  );
}
