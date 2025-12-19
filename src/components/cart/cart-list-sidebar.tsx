'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import { useQuery } from '@tanstack/react-query';
import Button from '@components/ui/button';
import Alert from '@components/ui/alert';
import { useTranslation } from 'src/app/i18n/client';
import { useCart } from '@contexts/cart/cart.context';
import type { Item } from '@contexts/cart/cart.utils';
import {
  activateCart as activateSavedCart,
  deactivateCart as deactivateSavedCart,
  listSavedCarts,
  saveCart as saveCurrentCart,
} from '@framework/cart/saved-carts';
import { fetchCartData } from '@framework/cart/b2b-cart';
import { ERP_STATIC } from '@framework/utils/static';
import {
  HiOutlineShoppingCart,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlinePencil,
  HiOutlineX,
} from 'react-icons/hi';

interface CartListSidebarProps {
  lang: string;
}

type CartDetailsState = Record<
  number,
  {
    items?: Item[];
    loading: boolean;
    error?: string;
  }
>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

const ensureCartId = (id: unknown) => {
  const num = Number(id);
  return Number.isFinite(num) ? num : NaN;
};

// Skeleton component for loading state
const CartListSkeleton = () => (
  <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white animate-pulse">
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="h-6 w-6 rounded bg-gray-200" />
    </div>
    <div className="flex-1 p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-100 p-3">
          <div className="h-4 w-32 rounded bg-gray-200 mb-2" />
          <div className="h-3 w-20 rounded bg-gray-200 mb-3" />
          <div className="h-8 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  </div>
);

const CartListSidebar: React.FC<CartListSidebarProps> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const { meta, getCart, items: activeItems } = useCart();
  const activeCartId = useMemo(
    () => ensureCartId(meta?.idCart),
    [meta?.idCart],
  );

  const [mounted, setMounted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [details, setDetails] = useState<CartDetailsState>({});
  const detailsRef = useRef<CartDetailsState>({});
  const [editingCartId, setEditingCartId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  // Check customer context only after mounting to avoid hydration mismatch
  const hasCustomerContext =
    mounted &&
    Boolean(
      ERP_STATIC.customer_code &&
        ERP_STATIC.address_code &&
        ERP_STATIC.customer_code !== '0',
    );

  const savedCartsQuery = useQuery({
    queryKey: ['saved-carts'],
    queryFn: async () => {
      const response = await listSavedCarts();
      return response.carts;
    },
    enabled: hasCustomerContext,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const carts = useMemo(
    () => savedCartsQuery.data ?? [],
    [savedCartsQuery.data],
  );

  useEffect(() => {
    if (!Number.isFinite(activeCartId)) return;
    setDetails((prev) => ({
      ...prev,
      [Number(activeCartId)]: {
        items: Array.isArray(activeItems) ? activeItems : [],
        loading: false,
        error: undefined,
      },
    }));
  }, [activeCartId, activeItems]);

  const handleActivate = useCallback(
    async (cartId: number) => {
      setActionError(null);
      setActivatingId(cartId);
      try {
        await activateSavedCart({ cartId });
        await getCart('replace');
        await savedCartsQuery.refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setActionError(message);
      } finally {
        setActivatingId(null);
      }
    },
    [getCart, savedCartsQuery],
  );

  const handleDeactivate = useCallback(
    async (cartId: number, label?: string | null) => {
      setActionError(null);
      setDeactivatingId(cartId);
      try {
        await deactivateSavedCart({ cartId, label: label ?? undefined });
        await savedCartsQuery.refetch();
        if (Number.isFinite(activeCartId) && Number(activeCartId) === cartId) {
          await getCart('replace');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setActionError(message);
      } finally {
        setDeactivatingId(null);
      }
    },
    [activeCartId, getCart, savedCartsQuery],
  );

  const handleStartEditing = useCallback(
    (cartId: number, currentLabel: string) => {
      setEditingCartId(cartId);
      setEditingLabel(currentLabel);
      setActionError(null);
    },
    [],
  );

  const handleCancelEditing = useCallback(() => {
    setEditingCartId(null);
    setEditingLabel('');
  }, []);

  const handleSaveLabel = useCallback(
    async (cartId: number) => {
      const trimmed = editingLabel.trim();
      if (!trimmed) {
        setActionError(t('text-saved-cart-name-required'));
        return;
      }

      setSavingLabel(true);
      setActionError(null);
      try {
        await saveCurrentCart({ cartId, label: trimmed });
        setEditingCartId(null);
        setEditingLabel('');
        await savedCartsQuery.refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setActionError(message);
      } finally {
        setSavingLabel(false);
      }
    },
    [editingLabel, savedCartsQuery, t],
  );

  // Show skeleton until mounted to avoid hydration mismatch
  if (!mounted) {
    return <CartListSkeleton />;
  }

  // After mounted, check if we have customer context
  if (!hasCustomerContext) {
    return null;
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <HiOutlineShoppingCart className="h-5 w-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            {t('text-my-carts', { defaultValue: 'I miei carrelli' })}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => savedCartsQuery.refetch()}
          disabled={savedCartsQuery.isRefetching}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title={t('text-refresh')}
        >
          <HiOutlineRefresh
            className={cn(
              'h-4 w-4',
              savedCartsQuery.isRefetching && 'animate-spin',
            )}
          />
        </button>
      </div>

      {/* Error display */}
      {actionError && (
        <div className="px-4 pt-3">
          <Alert message={actionError} />
        </div>
      )}

      {/* Cart list */}
      <div className="flex-1 overflow-y-auto">
        {savedCartsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            {t('text-loading-saved-carts')}
          </div>
        ) : savedCartsQuery.isError ? (
          <div className="px-4 py-4">
            <Alert
              message={
                savedCartsQuery.error instanceof Error
                  ? savedCartsQuery.error.message
                  : String(savedCartsQuery.error ?? '')
              }
            />
          </div>
        ) : !carts.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HiOutlineShoppingCart className="mb-2 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">{t('text-no-saved-carts')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {carts.map((cart) => {
              const isActive =
                Number.isFinite(activeCartId) && cart.cartId === activeCartId;
              const isActivating = activatingId === cart.cartId;
              const isDeactivating = deactivatingId === cart.cartId;

              return (
                <div
                  key={cart.cartId}
                  className={cn(
                    'relative px-4 py-3 transition-colors',
                    isActive
                      ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent',
                  )}
                >
                  {/* Active indicator - hide when editing to avoid overlap */}
                  {isActive && editingCartId !== cart.cartId && (
                    <div className="absolute right-3 top-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                        <HiOutlineCheck className="h-3 w-3" />
                        {t('text-active', { defaultValue: 'Attivo' })}
                      </span>
                    </div>
                  )}

                  {/* Cart info */}
                  <div
                    className={cn(
                      'mb-2',
                      editingCartId !== cart.cartId && 'pr-16',
                    )}
                  >
                    {editingCartId === cart.cartId ? (
                      /* Inline edit mode */
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveLabel(cart.cartId);
                            } else if (e.key === 'Escape') {
                              handleCancelEditing();
                            }
                          }}
                          className="h-7 flex-1 rounded border border-gray-300 px-2 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                          disabled={savingLabel}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLabel(cart.cartId)}
                          disabled={savingLabel}
                          className="flex h-7 w-7 items-center justify-center rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          title={t('text-save', { defaultValue: 'Salva' })}
                        >
                          <HiOutlineCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditing}
                          disabled={savingLabel}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          title={t('text-cancel', { defaultValue: 'Annulla' })}
                        >
                          <HiOutlineX className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {cart.hasCustomLabel
                            ? cart.label
                            : t('text-cart-id', {
                                id: cart.cartId,
                                defaultValue: `Carrello #${cart.cartId}`,
                              })}
                        </h3>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStartEditing(
                                cart.cartId,
                                cart.hasCustomLabel ? cart.label : '',
                              )
                            }
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            title={t('text-edit-name', {
                              defaultValue: 'Modifica nome',
                            })}
                          >
                            <HiOutlinePencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {formatDate(cart.updatedAt)}
                      </span>
                      {!cart.hasCustomLabel && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          {t('text-not-saved', { defaultValue: 'Non salvato' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cart stats */}
                  <div className="mb-3 flex items-center gap-4 text-xs text-gray-600">
                    <span>
                      <span className="font-medium">
                        {cart.itemsCount ?? '—'}
                      </span>{' '}
                      {t('text-items', { defaultValue: 'articoli' })}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(cart.documentTotal)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isActive ? (
                      <Button
                        type="button"
                        variant="border"
                        className="!h-8 flex-1 !py-0 text-xs"
                        disabled={isDeactivating}
                        onClick={() =>
                          handleDeactivate(
                            cart.cartId,
                            cart.hasCustomLabel ? cart.label : undefined,
                          )
                        }
                      >
                        {isDeactivating
                          ? t('text-saving-cart')
                          : t('text-save-for-later', {
                              defaultValue: 'Salva per dopo',
                            })}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="!h-8 flex-1 !py-0 text-xs"
                        disabled={isActivating}
                        onClick={() => handleActivate(cart.cartId)}
                      >
                        {isActivating
                          ? t('text-activating-cart')
                          : t('text-activate-cart', { defaultValue: 'Attiva' })}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartListSidebar;
