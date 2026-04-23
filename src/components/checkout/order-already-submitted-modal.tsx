'use client';

interface OrderAlreadySubmittedModalProps {
  message?: string;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export default function OrderAlreadySubmittedModal({
  message,
  isSubmitting,
  onConfirm,
}: OrderAlreadySubmittedModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onConfirm}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-[520px] w-full shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-sky-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Ordine già inviato
              </h3>
              <p className="text-sm text-gray-600">
                Questo ordine è già stato inviato. La pagina verrà aggiornata.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="px-6 pt-4 text-sm text-gray-600">{message}</div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-[48px] px-6 py-3 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 uppercase leading-snug"
          >
            Ok, aggiorna la pagina
          </button>
        </div>
      </div>
    </div>
  );
}
