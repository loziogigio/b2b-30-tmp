'use client';

import React from 'react';
import { useDemoUi } from '@/lib/demo/use-demo-ui';
import { useLocalStorage } from '@utils/use-local-storage';

/**
 * Slim, dismissible demo strip. Renders ONLY when useDemoUi() is true
 * (features.isDemo && DEMO_UI_ENABLED runtime env via DemoUiEnvProvider). Theme-agnostic:
 * reads no theme and uses self-contained inline-ish utility classes so it looks the same
 * under the `default` and `time` themes. Dismissal persists in localStorage.
 */
export default function DemoBanner() {
  const demoUi = useDemoUi();
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    'vinc-demo-banner-dismissed',
    false,
  );

  if (!demoUi || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Demo VINC"
      className="w-full bg-slate-900 text-white px-4 py-2 text-[13px] flex items-center justify-center gap-3"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"
        />
        Demo VINC — Velia Ferramenta
      </span>
      <span className="opacity-70 hidden sm:inline">
        Ambiente dimostrativo · i dati si azzerano periodicamente
      </span>
      <button
        type="button"
        aria-label="Chiudi"
        onClick={() => setDismissed(true)}
        className="ml-1 leading-none opacity-70 hover:opacity-100 transition-opacity text-base"
      >
        ×
      </button>
    </div>
  );
}
