'use client';

import Link from '@components/ui/link';
import TimeScrollArrows from '@components/themes/time/shared/time-scroll-arrows';
import { useHorizontalScroll } from '@components/themes/time/shared/use-horizontal-scroll';

export interface QuickAction {
  label: string;
  emoji: string;
  count?: number;
  color: string;
  description: string;
  link?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    label: 'Nuovi Arrivi',
    emoji: '✨',
    color: '#e63946',
    description: 'Ultimi prodotti inseriti',
  },
  {
    label: 'Discount',
    emoji: '🏷️',
    color: '#1a1d23',
    description: 'Fino al 50% di sconto',
  },
  {
    label: 'Presto a Catalogo',
    emoji: '📦',
    color: '#2563eb',
    description: 'In arrivo prossimamente',
  },
  {
    label: 'Di Nuovo Disponibili',
    emoji: '🔄',
    color: '#059669',
    description: 'Tornati in stock',
  },
  {
    label: 'Offerte LED',
    emoji: '💡',
    color: '#d97706',
    description: 'Iniziativa Digital LED',
  },
];

interface TimeQuickActionsProps {
  actions?: QuickAction[];
  lang: string;
}

function QuickActionCard({
  action,
  index,
}: {
  action: QuickAction & { link?: string };
  index: number;
}) {
  return (
    <div
      className="rounded-[var(--radius-card)] overflow-hidden cursor-pointer bg-white border border-[var(--time-gray-100)] p-[18px] pb-4 relative transition-all duration-[250ms] min-w-[200px] shrink-0 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
      style={{
        scrollSnapAlign: 'start',
        animation: `time-fadeUp 0.4s ease ${0.1 + index * 0.06}s both`,
        borderColor: undefined,
        // Dynamic hover border color via CSS custom property
        ['--action-color' as string]: action.color,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = action.color)}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--time-gray-100)')
      }
    >
      {/* Top color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius-card)]"
        style={{ background: action.color }}
      />

      {/* Emoji + count */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[28px]">{action.emoji}</span>
        {action.count != null && (
          <span className="text-[10px] text-[var(--time-gray-400)] font-mono font-semibold">
            ({action.count.toLocaleString()})
          </span>
        )}
      </div>

      {/* Label */}
      <div className="text-[13px] font-extrabold text-[var(--time-dark)] font-[family-name:var(--font-body)] mb-[3px]">
        {action.label}
      </div>

      {/* Description */}
      <div className="text-[11px] text-[var(--time-gray-500)] font-[family-name:var(--font-body)]">
        {action.description}
      </div>
    </div>
  );
}

export default function TimeQuickActions({
  actions,
  lang,
}: TimeQuickActionsProps) {
  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    scrollLeft,
    scrollRight,
  } = useHorizontalScroll({ scrollAmount: 240 });

  const items = actions?.length ? actions : DEFAULT_ACTIONS;

  const itemsWithLinks = items.map((item) => ({
    ...item,
    link:
      item.link ||
      `/${lang}/search?q=${encodeURIComponent(item.label.toLowerCase())}`,
  }));

  return (
    <div>
      {/* Header with arrows */}
      <div className="flex items-center justify-end mb-4">
        <TimeScrollArrows
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollLeft={scrollLeft}
          onScrollRight={scrollRight}
        />
      </div>

      {/* Scrollable cards */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        >
          {itemsWithLinks.map((action, i) => {
            const card = (
              <QuickActionCard key={action.label} action={action} index={i} />
            );

            if (action.link) {
              return (
                <Link key={action.label} href={action.link}>
                  {card}
                </Link>
              );
            }
            return card;
          })}
        </div>
        {/* Right fade */}
        <div className="absolute top-0 right-0 bottom-1 w-12 pointer-events-none bg-gradient-to-l from-white to-transparent" />
      </div>
    </div>
  );
}
