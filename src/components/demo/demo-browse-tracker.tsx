'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useDemoUi } from '@/lib/demo/use-demo-ui';
import {
  useDemoChecklist,
  type DemoStepId,
} from '@/lib/demo/demo-checklist-atom';

/**
 * Headless tracker mounted in the root layout (every page). Maps the current
 * route to a checklist step and marks it:
 *   - catalog / search / category routes      → `browse`
 *   - the post-checkout `/complete-order`     → `submit-order`
 *   - account documents page `/account/documents` → `open-documents`
 * Renders nothing. Gated by useDemoUi so it is a no-op for real tenants and
 * non-demo builds. markStep is idempotent, so re-visits are harmless.
 * Route segments confirmed from src/app/[lang]/(default)/account/documents/page.tsx.
 */
const ROUTE_STEPS: ReadonlyArray<{ re: RegExp; step: DemoStepId }> = [
  { re: /\/(products?|search|categorie)(\/|$|\?)/i, step: 'browse' },
  { re: /\/complete-order(\/|$|\?)/i, step: 'submit-order' },
  { re: /\/account\/documents(\/|$|\?)/i, step: 'open-documents' },
];

export default function DemoBrowseTracker() {
  const demoUi = useDemoUi();
  const pathname = usePathname();
  const { markStep } = useDemoChecklist();

  useEffect(() => {
    if (!demoUi || !pathname) return;
    for (const { re, step } of ROUTE_STEPS) {
      if (re.test(pathname)) markStep(step);
    }
    // markStep is idempotent; depend on pathname so route changes re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoUi, pathname]);

  return null;
}
