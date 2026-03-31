'use client';

import type {
  AnomalyResult,
  ErpAnomaly,
  ErpItem,
  SubmitOpts,
} from '@/hooks/use-order-submit';
import { formatAnomalyFlags } from '@/hooks/use-order-submit';

interface AnomalyModalProps {
  result: AnomalyResult;
  isSubmitting: boolean;
  onAutofix: () => void;
  onEdit: () => void;
  onClose: () => void;
}

function resolveCode(anomaly: ErpAnomaly, erpItems: ErpItem[]): string {
  const item = erpItems.find((i) => i.erp_line_number === anomaly.IdRiga);
  return item?.erp_data?.oarti || `Riga ${anomaly.IdRiga}`;
}

export default function AnomalyModal({
  result,
  isSubmitting,
  onAutofix,
  onEdit,
  onClose,
}: AnomalyModalProps) {
  const { anomalies, erpItems } = result;
  const count = anomalies.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl max-w-[560px] w-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Anomalie riscontrate
              </h3>
              <p className="text-sm text-gray-600">
                {count} anomali{count === 1 ? 'a' : 'e'} riscontrat
                {count === 1 ? 'a' : 'e'}
              </p>
            </div>
          </div>
        </div>

        {/* Anomalies table */}
        {count > 0 && (
          <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="pb-2 pr-3 font-medium">Articolo</th>
                  <th className="pb-2 font-medium">Problema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {anomalies.map((a, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                      {resolveCode(a, erpItems)}
                    </td>
                    <td className="py-2.5 text-gray-600">
                      {formatAnomalyFlags(a)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.errorMessage && (
          <div className="px-6 pb-3 text-sm text-red-600">
            {result.errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onEdit}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Modifica ordine
          </button>
          <button
            onClick={onAutofix}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Invio in corso...' : 'Risolvi e reinvia'}
          </button>
        </div>
      </div>
    </div>
  );
}
