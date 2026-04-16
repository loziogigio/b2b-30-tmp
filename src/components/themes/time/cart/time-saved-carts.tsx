'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@contexts/cart/cart.context';
import {
  activateCart as activateSavedCart,
  deactivateCart as deactivateSavedCart,
  listSavedCarts,
  saveCart as saveCurrentCart,
} from '@framework/cart/saved-carts';
import { ERP_STATIC } from '@framework/utils/static';
import { TimeCard } from '@/components/themes/time/account/time-account-primitives';

const money = (n: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(n ?? 0);

const fmtDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

// ── icons ───────────────────────────────────────────────────────────────────

const CartIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={cn(spinning && 'animate-spin')}
  >
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
  >
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const PencilIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const XIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── collapse icon ───────────────────────────────────────────────────────────

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    {collapsed ? (
      <polyline points="9,18 15,12 9,6" />
    ) : (
      <polyline points="15,18 9,12 15,6" />
    )}
  </svg>
);

// ── component ───────────────────────────────────────────────────────────────

interface TimeSavedCartsProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function TimeSavedCarts({
  collapsed,
  onToggle,
}: TimeSavedCartsProps) {
  const { meta, getCart, items: activeItems } = useCart();
  const activeCartId = meta?.orderId || ERP_STATIC.vinc_order_id;

  const [mounted, setMounted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [saveNewName, setSaveNewName] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  useEffect(() => setMounted(true), []);

  const hasContext =
    mounted && Boolean(ERP_STATIC.customer_code && ERP_STATIC.address_code);

  const savedCartsQuery = useQuery({
    queryKey: ['saved-carts'],
    queryFn: async () => (await listSavedCarts()).carts,
    enabled: hasContext,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const carts = savedCartsQuery.data ?? [];

  const handleActivate = useCallback(
    async (cartId: string) => {
      setActionError(null);
      setActivatingId(cartId);
      try {
        await activateSavedCart({ cartId });
        await getCart('replace');
        await savedCartsQuery.refetch();
      } catch (e: any) {
        setActionError(e.message || String(e));
      } finally {
        setActivatingId(null);
      }
    },
    [getCart, savedCartsQuery],
  );

  const handleDeactivate = useCallback(
    async (cartId: string, label?: string) => {
      setActionError(null);
      setDeactivatingId(cartId);
      try {
        await deactivateSavedCart({ cartId, label });
        await savedCartsQuery.refetch();
        if (activeCartId === cartId) await getCart('replace');
      } catch (e: any) {
        setActionError(e.message || String(e));
      } finally {
        setDeactivatingId(null);
      }
    },
    [activeCartId, getCart, savedCartsQuery],
  );

  const handleSaveLabel = useCallback(
    async (cartId: string) => {
      const trimmed = editingLabel.trim();
      if (!trimmed) {
        setActionError('Nome carrello obbligatorio');
        return;
      }
      setSavingLabel(true);
      try {
        await saveCurrentCart({ cartId, label: trimmed });
        setEditingCartId(null);
        setEditingLabel('');
        await savedCartsQuery.refetch();
      } catch (e: any) {
        setActionError(e.message || String(e));
      } finally {
        setSavingLabel(false);
      }
    },
    [editingLabel, savedCartsQuery],
  );

  const activeItemCount = (activeItems ?? []).length;

  const handleSaveCurrentCart = useCallback(async () => {
    const trimmed = saveNewName.trim();
    if (!trimmed) {
      setActionError('Inserisci un nome per il carrello');
      return;
    }
    if (!activeCartId) {
      setActionError('Nessun carrello attivo');
      return;
    }
    setIsSavingNew(true);
    setActionError(null);
    try {
      await deactivateSavedCart({ cartId: activeCartId, label: trimmed });
      setSaveNewName('');
      await getCart('replace');
      await savedCartsQuery.refetch();
    } catch (e: any) {
      setActionError(e.message || String(e));
    } finally {
      setIsSavingNew(false);
    }
  }, [saveNewName, activeCartId, getCart, savedCartsQuery]);

  if (!mounted || !hasContext) return null;

  // Collapsed state: show only a vertical icon bar
  if (collapsed) {
    return (
      <TimeCard className="overflow-hidden h-fit">
        <button
          onClick={onToggle}
          className="w-full px-2 py-3 flex flex-col items-center gap-2 text-[var(--time-gray-400)] hover:text-[var(--time-dark)] transition-colors"
          title="Mostra carrelli"
        >
          <CartIcon />
          <CollapseIcon collapsed={true} />
        </button>
      </TimeCard>
    );
  }

  return (
    <TimeCard className="overflow-hidden h-fit">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[var(--time-gray-100)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--time-dark)]">
          <CartIcon />
          <h3 className="text-[13px] font-extrabold font-[var(--font-display)]">
            I miei carrelli
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => savedCartsQuery.refetch()}
            disabled={savedCartsQuery.isRefetching}
            className="p-1.5 rounded-[var(--radius-btn)] text-[var(--time-gray-400)] hover:text-[var(--time-dark)] hover:bg-[var(--time-gray-50)] transition-colors"
          >
            <RefreshIcon spinning={savedCartsQuery.isRefetching} />
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-[var(--radius-btn)] text-[var(--time-gray-400)] hover:text-[var(--time-dark)] hover:bg-[var(--time-gray-50)] transition-colors"
              title="Nascondi carrelli"
            >
              <CollapseIcon collapsed={false} />
            </button>
          )}
        </div>
      </div>

      {/* Save current cart form */}
      {activeItemCount > 0 && (
        <div className="px-4 py-3 border-b border-[var(--time-gray-100)] bg-[var(--time-gray-50)]/50">
          <div className="text-[10px] font-bold text-[var(--time-gray-500)] uppercase tracking-[0.06em] mb-1.5 font-[var(--font-body)]">
            Salva carrello corrente ({activeItemCount} art.)
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={saveNewName}
              onChange={(e) => setSaveNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCurrentCart();
              }}
              placeholder="Nome carrello..."
              className="h-7 flex-1 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-2.5 text-[11px] font-[var(--font-body)] text-[var(--time-dark)] bg-white outline-none focus:border-[var(--time-red)] transition-colors"
              disabled={isSavingNew}
            />
            <button
              onClick={handleSaveCurrentCart}
              disabled={isSavingNew || !saveNewName.trim()}
              className="h-7 px-3 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-[10px] font-bold text-white font-[var(--font-body)] hover:bg-[var(--time-red)] transition-colors disabled:opacity-50 shrink-0"
            >
              {isSavingNew ? '...' : 'Salva'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="px-4 pt-3">
          <div className="text-[11px] text-[var(--time-red)] bg-[var(--time-red)]/5 rounded-lg px-3 py-2">
            {actionError}
          </div>
        </div>
      )}

      {/* Cart list */}
      <div className="overflow-y-auto max-h-[400px]">
        {savedCartsQuery.isLoading ? (
          <div className="py-8 text-center text-[12px] text-[var(--time-gray-500)]">
            Caricamento...
          </div>
        ) : carts.length === 0 ? (
          <div className="py-6 px-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--time-gray-50)] flex items-center justify-center text-[var(--time-gray-300)]">
              <CartIcon />
            </div>
            <p className="text-[12px] font-semibold text-[var(--time-gray-500)]">
              Nessun carrello salvato
            </p>
            <p className="text-[10px] text-[var(--time-gray-400)] mt-1">
              Usa il form sopra per salvare il carrello corrente
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--time-gray-50)]">
            {carts.map((cart) => {
              const isActive = cart.cartId === activeCartId;
              const isActivating = activatingId === cart.cartId;
              const isDeactivating = deactivatingId === cart.cartId;

              return (
                <div
                  key={cart.cartId}
                  className={cn(
                    'px-4 py-3 transition-colors',
                    isActive
                      ? 'bg-[var(--time-red)]/3 border-l-3 border-l-[var(--time-red)]'
                      : 'hover:bg-[var(--time-gray-50)] border-l-3 border-l-transparent',
                  )}
                >
                  {/* Label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {editingCartId === cart.cartId ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLabel(cart.cartId);
                            if (e.key === 'Escape') setEditingCartId(null);
                          }}
                          className="h-6 flex-1 rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] px-2 text-[11px] font-[var(--font-body)] focus:border-[var(--time-red)] outline-none"
                          autoFocus
                          disabled={savingLabel}
                        />
                        <button
                          onClick={() => handleSaveLabel(cart.cartId)}
                          disabled={savingLabel}
                          className="h-6 w-6 flex items-center justify-center rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white"
                        >
                          <CheckIcon />
                        </button>
                        <button
                          onClick={() => setEditingCartId(null)}
                          className="h-6 w-6 flex items-center justify-center rounded-[var(--radius-btn)] border border-[var(--time-gray-200)] text-[var(--time-gray-500)]"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[12px] font-bold text-[var(--time-dark)] font-[var(--font-body)] truncate">
                          {cart.hasCustomLabel
                            ? cart.label
                            : `Carrello #${cart.cartId.slice(-6)}`}
                        </span>
                        {isActive && (
                          <>
                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-[var(--time-red)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--time-red)] uppercase tracking-wide">
                              <CheckIcon /> Attivo
                            </span>
                            <button
                              onClick={() => {
                                setEditingCartId(cart.cartId);
                                setEditingLabel(
                                  cart.hasCustomLabel ? cart.label : '',
                                );
                              }}
                              className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-[var(--time-gray-400)] hover:text-[var(--time-dark)]"
                            >
                              <PencilIcon />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--time-gray-500)] font-[var(--font-body)] mb-2">
                    <span>{fmtDate(cart.updatedAt)}</span>
                    <span>
                      <span className="font-bold">{cart.itemsCount ?? 0}</span>{' '}
                      articoli
                    </span>
                    <span className="font-bold text-[var(--time-dark)]">
                      {money(cart.documentTotal)}
                    </span>
                  </div>

                  {/* Action button */}
                  {isActive ? (
                    <button
                      onClick={() =>
                        handleDeactivate(
                          cart.cartId,
                          cart.hasCustomLabel ? cart.label : undefined,
                        )
                      }
                      disabled={isDeactivating}
                      className="w-full h-7 rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] text-[11px] font-bold text-[var(--time-gray-600)] hover:border-[var(--time-dark)] transition-colors font-[var(--font-body)] disabled:opacity-50"
                    >
                      {isDeactivating ? 'Salvataggio...' : 'Salva per dopo'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(cart.cartId)}
                      disabled={isActivating}
                      className="w-full h-7 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-[11px] font-bold text-white hover:bg-[var(--time-red)] transition-colors font-[var(--font-body)] disabled:opacity-50"
                    >
                      {isActivating ? 'Attivazione...' : 'Attiva'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TimeCard>
  );
}
