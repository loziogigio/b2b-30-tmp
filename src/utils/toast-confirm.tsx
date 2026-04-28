'use client';

import React from 'react';
import { toast } from 'react-toastify';

export type ConfirmOptions = {
  /** Main question shown to the user. */
  message: string;
  /** Optional small subtitle below the message. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual style for the confirm button. Defaults to 'danger'. */
  tone?: 'danger' | 'primary';
};

const TrashIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Show a toast with Confirm / Cancel actions and resolve a boolean.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const {
    message,
    description,
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla',
    tone = 'danger',
  } = options;

  return new Promise<boolean>((resolve) => {
    let toastId: string | number | undefined;
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      if (toastId !== undefined) toast.dismiss(toastId);
      resolve(value);
    };

    const isDanger = tone === 'danger';

    const Body = () => (
      <div className="flex w-full items-start gap-3 p-1">
        <div
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
            (isDanger ? 'bg-red-50 text-red-600' : 'bg-brand/10 text-brand')
          }
        >
          {isDanger ? <TrashIcon /> : <InfoIcon />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-snug text-gray-900">
            {message}
          </div>
          {description ? (
            <div className="mt-1 text-[12px] leading-snug text-gray-500">
              {description}
            </div>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => settle(false)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => settle(true)}
              autoFocus
              className={
                'rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition focus:outline-none focus:ring-2 ' +
                (isDanger
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                  : 'bg-brand hover:bg-opacity-90 focus:ring-brand/40')
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );

    toastId = toast(<Body />, {
      position: 'top-center',
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      hideProgressBar: true,
      icon: false,
      className:
        '!bg-white !text-gray-900 !rounded-xl !shadow-2xl !border !border-gray-100 !p-4 !min-h-0 !w-[min(92vw,420px)]',
      bodyClassName: '!p-0 !m-0 !items-start',
      style: { padding: 0 },
      onClose: () => settle(false),
    });
  });
}
