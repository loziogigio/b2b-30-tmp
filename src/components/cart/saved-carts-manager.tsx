'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import { useQuery } from '@tanstack/react-query';
import Button from '@components/ui/button';
import Input from '@components/ui/form/input';
import Text from '@components/ui/text';
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
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

interface SavedCartsManagerProps {
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
};

const ensureCartId = (id: unknown) => {
  const num = Number(id);
  return Number.isFinite(num) ? num : NaN;
};

const SavedCartsManager: React.FC<SavedCartsManagerProps> = ({ lang }) => {
  const { t } = useTranslation(lang, 'common');
  const { meta, getCart, items: activeItems } = useCart();
  const activeCartId = useMemo(() => ensureCartId(meta?.idCart), [meta?.idCart]);

  const [label, setLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<CartDetailsState>({});
  const detailsRef = useRef<CartDetailsState>({});
  const [isListOpen, setListOpen] = useState(false);

  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  const hasCustomerContext = Boolean(
    ERP_STATIC.customer_code &&
    ERP_STATIC.address_code &&
    ERP_STATIC.customer_code !== '0'
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

  const carts = useMemo(() => savedCartsQuery.data ?? [], [savedCartsQuery.data]);

  const activeCartRecord = useMemo(() => {
    if (!Number.isFinite(activeCartId)) return null;
    return carts.find((cart) => cart.cartId === Number(activeCartId));
  }, [carts, activeCartId]);

  const canSaveCurrentCart = useMemo(() => {
    if (!Number.isFinite(activeCartId)) return false;
    if (!savedCartsQuery.isSuccess) return true;
    const label = activeCartRecord?.label?.trim();
    return !label;
  }, [activeCartId, activeCartRecord?.label, savedCartsQuery.isSuccess]);

  const activeCartItemsCount = useMemo(() => {
    if (Array.isArray(activeItems)) return activeItems.length;
    if (!Number.isFinite(activeCartId)) return 0;
    return details[Number(activeCartId)]?.items?.length ?? 0;
  }, [activeItems, activeCartId, details]);

  const prefetchCartDetails = useCallback(async (cartId: number, force = false) => {
    const snapshot = detailsRef.current[cartId];
    if (!force && snapshot?.items && !snapshot.error) {
      return snapshot.items;
    }

    setDetails((prev) => {
      const current = prev[cartId];
      return {
        ...prev,
        [cartId]: {
          items: current?.items,
          loading: true,
          error: undefined,
        },
      };
    });

    try {
      const { items } = await fetchCartData({ cartId });
      setDetails((prev) => ({
        ...prev,
        [cartId]: {
          items,
          loading: false,
        },
      }));
      return items;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDetails((prev) => {
        const current = prev[cartId];
        return {
          ...prev,
          [cartId]: {
            items: current?.items,
            loading: false,
            error: message,
          },
        };
      });
      throw error;
    }
  }, []);

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

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setActionError(null);

      const trimmed = label.trim();
      if (!trimmed) {
        setFormError(t('text-saved-cart-name-required'));
        return;
      }

      const cartId = ensureCartId(meta?.idCart);
      if (!Number.isFinite(cartId)) {
        setFormError(t('text-saved-cart-no-active'));
        return;
      }

      setSaving(true);
      try {
        await saveCurrentCart({ cartId, label: trimmed });
        setLabel('');
        await savedCartsQuery.refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setActionError(message);
      } finally {
        setSaving(false);
      }
    },
    [label, meta?.idCart, savedCartsQuery, t]
  );

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
    [getCart, savedCartsQuery]
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
    [activeCartId, getCart, savedCartsQuery]
  );

  const togglePreview = useCallback(
    async (cartId: number) => {
      if (expandedId === cartId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(cartId);
      setListOpen(true);
      const entry = details[cartId];
      if (!entry?.items && !entry?.loading) {
        try {
          await prefetchCartDetails(cartId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setActionError(message);
        }
      }
    },
    [details, expandedId, prefetchCartDetails]
  );

  if (!hasCustomerContext) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Text className="text-base font-semibold text-gray-900">
            {t('text-saved-carts')}
          </Text>
          <p className="text-13px text-gray-500">
            {t('text-saved-carts-description')}
          </p>
        </div>
        {canSaveCurrentCart ? (
          <form onSubmit={handleSave} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              lang={lang}
              name="savedCartName"
              value={label}
              placeholder="text-saved-cart-name-placeholder"
              onChange={(event) => setLabel(event.target.value)}
              className="sm:w-64"
              variant="solid"
              inputClassName="h-11 md:h-12"
            />
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || activeCartItemsCount === 0}
            >
              {saving ? t('text-saving') : t('text-save-current-cart')}
            </Button>
          </form>
        ) : (
          <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-13px text-gray-600 sm:w-auto">
            {activeCartRecord?.label?.trim()
              ? t('text-cart-already-saved', { name: activeCartRecord.label.trim() })
              : t('text-cart-already-saved-generic')}
          </div>
        )}
        {canSaveCurrentCart && activeCartItemsCount === 0 && (
          <p className="mt-2 text-xs text-brand-danger/80">
            {t('text-saved-cart-missing-items')}
          </p>
        )}
      </div>

      {(formError || actionError) && (
        <div className="px-5 pt-4">
          <Alert message={formError ?? actionError ?? ''} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setListOpen((open) => !open)}
        className="flex w-full items-center justify-between border-t border-gray-200 px-5 py-3 text-left"
        aria-expanded={isListOpen}
      >
        <div className="flex flex-col">
          <span className="text-base font-semibold text-gray-900">{t('text-saved-carts')}</span>
          <span className="text-11px text-gray-500">{t('text-saved-carts-refresh-hint')}</span>
        </div>
        <span className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
          {isListOpen ? t('text-hide-saved-carts') : t('text-show-saved-carts')}
          {isListOpen ? <IoChevronUp className="h-5 w-5" /> : <IoChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {isListOpen && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-13px">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    {t('text-cart-name')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    {t('text-created')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">
                    {t('text-items-count')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">
                    {t('text-total-value')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">
                    {t('text-actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {savedCartsQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6">
                      <Alert
                        message={
                          savedCartsQuery.error instanceof Error
                            ? savedCartsQuery.error.message
                            : String(savedCartsQuery.error ?? '')
                        }
                      />
                    </td>
                  </tr>
                ) : savedCartsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {t('text-loading-saved-carts')}
                    </td>
                  </tr>
                ) : !carts.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {t('text-no-saved-carts')}
                    </td>
                  </tr>
                ) : (
                  carts.map((cart) => {
                    const cartDetails = details[cart.cartId];
                    const isActive = Number.isFinite(activeCartId) && cart.cartId === activeCartId;
                    const isExpanded = expandedId === cart.cartId;
                    const itemsCount = cartDetails?.items?.length;

                    return (
                      <Fragment key={cart.cartId}>
                        <tr
                          className={cn('transition-colors', {
                            'bg-indigo-50': isActive,
                          })}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">
                                {cart.label}
                              </span>
                              <span className="text-11px uppercase tracking-wide text-gray-400">
                                {cart.status === 'A'
                                  ? t('text-saved-cart-active')
                                  : t('text-saved-cart-inactive')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(cart.updatedAt)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {cartDetails?.loading && !itemsCount ? '…' : itemsCount ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(cart.documentTotal)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="border"
                                className="!h-8 !py-0 px-3 text-12px"
                                onClick={() => togglePreview(cart.cartId)}
                              >
                                {isExpanded ? t('text-hide-preview') : t('text-preview-cart')}
                              </Button>
                              {isActive ? (
                                <Button
                                  type="button"
                                  className={cn('!h-8 !py-0 px-3 text-12px', {
                                    '!bg-gray-300 !text-gray-600 cursor-not-allowed': deactivatingId === cart.cartId,
                                  })}
                                  disabled={deactivatingId === cart.cartId}
                                  onClick={() => handleDeactivate(cart.cartId, cart.label)}
                                >
                                  {deactivatingId === cart.cartId
                                    ? t('text-deactivating-cart')
                                    : t('text-deactivate-cart')}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  className={cn('!h-8 !py-0 px-3 text-12px', {
                                    '!bg-gray-300 !text-gray-600 cursor-not-allowed': activatingId === cart.cartId,
                                  })}
                                  disabled={activatingId === cart.cartId}
                                  onClick={() => handleActivate(cart.cartId)}
                                >
                                  {activatingId === cart.cartId
                                    ? t('text-activating-cart')
                                    : t('text-activate-cart')}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-4 py-4">
                              {cartDetails?.loading && !cartDetails?.items ? (
                                <div className="text-13px text-gray-500">
                                  {t('text-loading-saved-cart-items')}
                                </div>
                              ) : cartDetails?.error ? (
                                <Alert message={cartDetails.error} />
                              ) : !cartDetails?.items?.length ? (
                                <div className="text-13px text-gray-500">
                                  {t('text-saved-cart-empty')}
                                </div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {cartDetails.items.map((item) => (
                                    <div
                                      key={`${cart.cartId}-${item.id}-${item.rowId}`}
                                      className="rounded border border-gray-200 bg-white px-3 py-2 text-12px shadow-sm"
                                    >
                                      <div className="font-semibold text-gray-900">
                                        {item.name ?? item.sku ?? item.id}
                                      </div>
                                      <div className="mt-1 flex justify-between text-gray-600">
                                        <span>{t('text-quantity')}</span>
                                        <span>{item.quantity}</span>
                                      </div>
                                      <div className="mt-1 flex justify-between text-gray-600">
                                        <span>{t('text-line-total')}</span>
                                        <span>
                                          {formatCurrency(
                                            Number(item.quantity ?? 0) * Number(item.price_discount ?? item.price ?? 0)
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between px-5 py-3 text-11px text-gray-400">
            <span>{t('text-saved-carts-refresh-hint')}</span>
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:underline"
              onClick={() => savedCartsQuery.refetch()}
              disabled={savedCartsQuery.isRefetching}
            >
              {savedCartsQuery.isRefetching
                ? t('text-refreshing')
                : t('text-refresh')}
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default SavedCartsManager;
