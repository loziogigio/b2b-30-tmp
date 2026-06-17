import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import React from 'react';
import {
  demoCompletedAtom,
  type DemoStepId,
} from '@/lib/demo/demo-checklist-atom';

let mockTenantValue: any;
vi.mock('@contexts/tenant.context', () => ({
  useTenantOptional: () => mockTenantValue,
}));

import DemoChecklist from '@components/demo/demo-checklist';
import { DemoUiEnvProvider } from '@/lib/demo/use-demo-ui';

function renderWithStore(envEnabled = true, completed: DemoStepId[] = []) {
  const store = createStore();
  store.set(demoCompletedAtom, completed);
  return render(
    <DemoUiEnvProvider value={envEnabled}>
      <JotaiProvider store={store}>
        <DemoChecklist />
      </JotaiProvider>
    </DemoUiEnvProvider>,
  );
}

describe('DemoChecklist gating (no leak)', () => {
  beforeEach(() => {
    mockTenantValue = { tenant: { features: { isDemo: true } } };
    window.localStorage.clear();
  });

  it('renders the 4 steps when gated true', () => {
    renderWithStore(true);
    expect(screen.getByText('Sfoglia il catalogo')).toBeInTheDocument();
    expect(screen.getByText('Aggiungi al carrello')).toBeInTheDocument();
    expect(screen.getByText('Invia un ordine')).toBeInTheDocument();
    expect(screen.getByText('Apri le tue fatture')).toBeInTheDocument();
  });

  it('renders NOTHING for a real tenant (features undefined)', () => {
    mockTenantValue = { tenant: { features: undefined } };
    const { container } = renderWithStore(true);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders NOTHING when env context is false (kill-switch off)', () => {
    const { container } = renderWithStore(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows completed-count from the atom', () => {
    renderWithStore(true, ['browse', 'add-to-cart']);
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });
});
