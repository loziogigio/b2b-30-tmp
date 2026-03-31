'use client';

import Link from 'next/link';
import { useTranslation } from 'src/app/i18n/client';
import {
  useCustomerQuery,
  useExpositionQuery,
  usePaymentDeadlineQuery,
} from '@framework/acccount/fetch-account';
import { useOrdersListQuery } from '@framework/order/fetch-orders-list';
import { useDocumentsListQuery } from '@framework/documents/fetch-documents-list';
import { ERP_STATIC } from '@framework/utils/static';
import { lastMonthRange, toErpNumericDate } from '@utils/date-to-erp';
import {
  TimeCard,
  TimeSectionHeader,
  TimeIconBox,
  TimeStatusBadge,
} from './time-account-primitives';
import {
  IconPackage,
  IconFile,
  IconCalendar,
  IconCheck,
  IconTruck,
  IconChevronRight,
} from './time-account-icons';

const money = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(n)
    : '—';

interface TimeAccountDashboardProps {
  lang: string;
}

export default function TimeAccountDashboard({
  lang,
}: TimeAccountDashboardProps) {
  const { t } = useTranslation(lang, 'common');
  const { data: customer } = useCustomerQuery(true);
  const { data: exposition } = useExpositionQuery(true);
  const { data: deadlines } = usePaymentDeadlineQuery(true);

  const { from, to } = lastMonthRange();
  const { data: orders = [] } = useOrdersListQuery(
    {
      date_from: toErpNumericDate(from),
      date_to: toErpNumericDate(to),
      type: 'T',
      ...ERP_STATIC,
    },
    true,
  );
  const { data: documents = [] } = useDocumentsListQuery(
    {
      date_from: toErpNumericDate(from),
      date_to: toErpNumericDate(to),
      type: 'F',
      ...ERP_STATIC,
    },
    true,
  );

  const displayName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.businessName ||
      customer.code
    : '';
  const company = customer?.businessName || '';
  const discountCode = customer?.discountCode || '';

  const creditLimit = exposition?.creditLimitTotal || 0;
  const creditUsed = creditLimit - (exposition?.differenceTotal || 0);
  const creditPct = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
  const creditAvailable = exposition?.differenceTotal || 0;

  // Deadline items for display
  const deadlineItems = (deadlines?.items || [])
    .filter((d) => d.document)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--time-dark)] to-gray-700 p-7 relative overflow-hidden">
        <div className="absolute -top-10 -right-5 w-[200px] h-[200px] rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-16 right-24 w-40 h-40 rounded-full bg-white/[0.03]" />
        <div className="relative z-[1]">
          <div className="flex items-center gap-3 mb-1.5">
            {discountCode && (
              <span className="bg-[var(--time-red)] text-white text-[10px] font-bold px-2.5 py-1 rounded-md font-[var(--font-body)]">
                {discountCode}
              </span>
            )}
          </div>
          <h2 className="text-[26px] font-black text-white font-[var(--font-display)] tracking-[-0.02em] mb-1">
            {t('text-welcome', { defaultValue: 'Benvenuto' })},{' '}
            {displayName ? displayName.split(' ')[0] : ''}
          </h2>
          <p className="text-sm text-white/55 font-[var(--font-body)]">
            {company}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <TimeCard hover className="p-5 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[28px]">📦</span>
          </div>
          <div className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mb-0.5">
            {orders.length}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--time-gray-400)] font-[var(--font-body)]">
              {t('text-orders', { defaultValue: 'Ordini' })}
            </span>
            <span className="text-[10px] text-[var(--time-gray-400)] font-[var(--font-mono)]">
              {t('text-last-month', { defaultValue: 'ultimo mese' })}
            </span>
          </div>
        </TimeCard>

        <TimeCard hover className="p-5 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[28px]">📄</span>
          </div>
          <div className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mb-0.5">
            {(documents as any[]).length}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--time-gray-400)] font-[var(--font-body)]">
              {t('text-documents', { defaultValue: 'Documenti' })}
            </span>
            <span className="text-[10px] text-[var(--time-gray-400)] font-[var(--font-mono)]">
              {t('text-last-month', { defaultValue: 'ultimo mese' })}
            </span>
          </div>
        </TimeCard>

        <TimeCard hover className="p-5 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[28px]">📊</span>
          </div>
          <div className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mb-0.5">
            {money(exposition?.total2Total)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--time-gray-400)] font-[var(--font-body)]">
              {t('text-exposition', { defaultValue: 'Esposizione' })}
            </span>
          </div>
        </TimeCard>

        <TimeCard hover className="p-5 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[28px]">💳</span>
          </div>
          <div className="text-[26px] font-black text-[var(--time-dark)] font-[var(--font-display)] tabular-nums mb-0.5">
            {money(creditAvailable)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--time-gray-400)] font-[var(--font-body)]">
              {t('text-credit-available', { defaultValue: 'Fido Disponibile' })}
            </span>
          </div>
        </TimeCard>
      </div>

      {/* Credit Bar */}
      {creditLimit > 0 && (
        <TimeCard className="px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-bold text-[var(--time-dark)] font-[var(--font-body)]">
                {t('text-credit-line', {
                  defaultValue: 'Fido / Linea di Credito',
                })}
              </div>
              <div className="text-[11px] text-[var(--time-gray-400)] font-[var(--font-body)] mt-0.5">
                {money(creditUsed)}{' '}
                {t('text-used-of', { defaultValue: 'utilizzati di' })}{' '}
                {money(creditLimit)}
              </div>
            </div>
            <span
              className="text-[22px] font-black font-[var(--font-display)] tabular-nums"
              style={{ color: creditPct > 80 ? '#dc2626' : 'var(--time-dark)' }}
            >
              {money(creditAvailable)}
            </span>
          </div>
          <div className="h-2.5 rounded-[5px] bg-[var(--time-gray-50)] overflow-hidden">
            <div
              className="h-full rounded-[5px] transition-[width] duration-1000 ease-out"
              style={{
                width: `${Math.min(creditPct, 100)}%`,
                background:
                  creditPct > 80
                    ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                    : creditPct > 60
                      ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                      : 'linear-gradient(90deg, #059669, #34d399)',
              }}
            />
          </div>
        </TimeCard>
      )}

      {/* Orders + Documents side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Recent Orders */}
        <TimeCard>
          <TimeSectionHeader
            title={t('text-recent-orders', { defaultValue: 'Ordini Recenti' })}
            action={undefined}
            actionLabel={t('text-view-all', { defaultValue: 'Vedi tutti' })}
          />
          <div>
            {orders.slice(0, 4).map((o: any, i: number) => (
              <Link
                key={o.id || i}
                href={`/${lang}/account/orders`}
                className="flex items-center justify-between px-[22px] py-3.5 border-b border-[var(--time-gray-50)] last:border-b-0 hover:bg-[var(--time-gray-50)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TimeIconBox
                    icon={
                      o.status === 'consegnato' ? <IconCheck /> : <IconTruck />
                    }
                    color={o.status === 'consegnato' ? '#059669' : '#2563eb'}
                    bg={
                      o.status === 'consegnato'
                        ? 'rgba(5,150,105,0.08)'
                        : 'rgba(37,99,235,0.08)'
                    }
                  />
                  <div>
                    <div className="text-[13px] font-bold text-[var(--time-dark)] font-[var(--font-mono)] tracking-[-0.01em]">
                      {o.id}
                    </div>
                    <div className="text-[11px] text-[var(--time-gray-400)] font-[var(--font-body)] mt-px">
                      {o.date} · {o.itemCount ?? ''}{' '}
                      {t('text-items', { defaultValue: 'articoli' })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[var(--time-dark)] font-[var(--font-body)] tabular-nums">
                    {money(o.total)}
                  </div>
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <div className="px-[22px] py-6 text-center text-sm text-[var(--time-gray-400)]">
                {t('text-no-orders', { defaultValue: 'Nessun ordine recente' })}
              </div>
            )}
          </div>
        </TimeCard>

        {/* Recent Documents */}
        <TimeCard>
          <TimeSectionHeader
            title={t('text-recent-documents', {
              defaultValue: 'Documenti Recenti',
            })}
          />
          <div>
            {(documents as any[]).slice(0, 4).map((d: any, i: number) => (
              <div
                key={d.document || i}
                className="flex items-center justify-between px-[22px] py-3.5 border-b border-[var(--time-gray-50)] last:border-b-0 hover:bg-[var(--time-gray-50)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TimeIconBox
                    icon={<IconFile />}
                    color="#2563eb"
                    bg="rgba(37,99,235,0.08)"
                  />
                  <div>
                    <div className="text-[13px] font-bold text-[var(--time-dark)] font-[var(--font-body)]">
                      {d.document || d.number}
                    </div>
                    <div className="text-[11px] text-[var(--time-gray-400)] font-[var(--font-body)] mt-px">
                      {d.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TimeStatusBadge
                    label={d.type === 'DDT' ? 'DDT' : 'Fattura'}
                    color={d.type === 'DDT' ? '#059669' : '#2563eb'}
                    bg={
                      d.type === 'DDT'
                        ? 'rgba(5,150,105,0.08)'
                        : 'rgba(37,99,235,0.08)'
                    }
                  />
                </div>
              </div>
            ))}
            {(documents as any[]).length === 0 && (
              <div className="px-[22px] py-6 text-center text-sm text-[var(--time-gray-400)]">
                {t('text-no-documents', {
                  defaultValue: 'Nessun documento recente',
                })}
              </div>
            )}
          </div>
        </TimeCard>
      </div>

      {/* Deadlines + Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3.5">
        {/* Deadlines */}
        <TimeCard>
          <TimeSectionHeader
            title={t('text-upcoming-deadlines', {
              defaultValue: 'Prossime Scadenze',
            })}
          />
          <div>
            {deadlineItems.map((d, i) => (
              <div
                key={`${d.document}-${i}`}
                className="flex items-center justify-between px-[22px] py-3.5 border-b border-[var(--time-gray-50)] last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <TimeIconBox
                    icon={d.amount <= 0 ? <IconCheck /> : <IconCalendar />}
                    color={d.amount <= 0 ? '#059669' : '#2563eb'}
                    bg={
                      d.amount <= 0
                        ? 'rgba(5,150,105,0.08)'
                        : 'rgba(37,99,235,0.08)'
                    }
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--time-dark)] font-[var(--font-body)]">
                      {d.description}
                    </div>
                    <div className="text-[11px] text-[var(--time-gray-400)] font-[var(--font-body)] mt-px">
                      {d.document} ·{' '}
                      {d.dueDate
                        ? new Date(d.dueDate).toLocaleDateString('it-IT')
                        : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[var(--time-dark)] tabular-nums">
                    {money(d.amount)}
                  </div>
                </div>
              </div>
            ))}
            {deadlineItems.length === 0 && (
              <div className="px-[22px] py-6 text-center text-sm text-[var(--time-gray-400)]">
                {t('text-no-deadlines', { defaultValue: 'Nessuna scadenza' })}
              </div>
            )}
          </div>
        </TimeCard>

        {/* Agent Card */}
        {customer && (
          <TimeCard className="p-6">
            <div className="text-[10px] font-bold text-[var(--time-gray-400)] uppercase tracking-[0.08em] font-[var(--font-body)] mb-4">
              {t('text-your-agent', { defaultValue: 'Il Tuo Agente' })}
            </div>
            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-[var(--time-red)] to-rose-700 flex items-center justify-center text-white text-[22px] font-black font-[var(--font-display)] mb-3.5">
              {(() => {
                const agentName = customer.firstName || customer.code;
                return agentName
                  .split(' ')
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase();
              })()}
            </div>
            <div className="text-base font-extrabold text-[var(--time-dark)] font-[var(--font-display)] mb-1">
              {customer.businessName || customer.code}
            </div>
            <div className="text-xs text-[var(--time-gray-500)] font-[var(--font-body)] mb-5">
              {t('text-zone-agent', { defaultValue: 'Agente di zona' })}
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/${lang}/account/profile`}
                className="w-full h-10 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--time-red)] transition-colors font-[var(--font-body)]"
              >
                {t('text-view-profile', { defaultValue: 'Vedi Profilo' })}
              </Link>
            </div>
          </TimeCard>
        )}
      </div>
    </div>
  );
}
