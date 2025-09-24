'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import cn from 'classnames';
import { useUI } from '@contexts/ui.context';

type Tab = {
  id: string;           // stable id for DnD
  key: string;          // normalized search key for dedupe
  label: string;        // user-facing label
  query: string;        // serialized query string (without leading ?)
  renamed?: boolean;    // has custom label
};

const STORAGE_KEY = 'b2b-search-tabs';
const MAX_TABS = 10;

// Safe UUID generator with fallbacks for older environments
function randomId(): string {
  try {
    // Modern browsers / Node 16+
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
    // Browsers with getRandomValues but no randomUUID
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
      return (
        hex[0] + hex[1] + hex[2] + hex[3] +
        '-' + hex[4] + hex[5] +
        '-' + hex[6] + hex[7] +
        '-' + hex[8] + hex[9] +
        '-' + hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
      );
    }
  } catch {}
  // Last-resort Math.random-based v4-like id
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
    else if (i === 14) s += '4';
    else {
      const r = (Math.random() * 16) | 0;
      s += (i === 19 ? (r & 0x3) | 0x8 : r).toString(16);
    }
  }
  return s;
}

function parseQuery(qs: URLSearchParams): string {
  const entries = Array.from(qs.entries()).filter(([k]) => k !== 'view');
  entries.sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
  return new URLSearchParams(entries).toString();
}

function keyFromQuery(qs: string): string {
  return qs || 'empty';
}

function labelFromQuery(qs: URLSearchParams): string {
  // prefer text, sku, category; else query string or "Search"
  const text = qs.get('text');
  if (text) return text;
  const sku = qs.get('sku');
  if (sku) return `SKU:${sku.split(';')[0]}${sku.includes(';') ? '…' : ''}`;
  const cat = qs.get('category') || qs.get('filters-category');
  if (cat) return `Cat:${cat}`;
  return 'Search';
}

function loadTabs(): Tab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Tab[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTabs(tabs: Tab[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch { }
}

export default function SearchTabs({ lang }: { lang: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tabs, setTabs] = React.useState<Tab[]>([]);
  const [active, setActive] = React.useState<number>(0);
  const [editing, setEditing] = React.useState<string | null>(null);
  const { isAuthorized } = useUI();

  // bootstrap from LS and current URL
  React.useEffect(() => {
    const currentQS = parseQuery(searchParams);
    const currentKey = keyFromQuery(currentQS);
    const stored = loadTabs().filter(Boolean);
    // find a tab with current key
    let idx = stored.findIndex((t) => t.key === currentKey);
    let list = stored;
    if (idx === -1) {
      // Add current as first tab (limit by max), dedupe empty special-case
      const isEmpty = currentKey === 'empty';
      if (isEmpty && stored.some((t) => t.key === 'empty')) {
        idx = stored.findIndex((t) => t.key === 'empty');
        // replace its query with current
        list = stored.map((t, i) => (i === idx ? { ...t, query: currentQS } : t));
      } else {
        const next: Tab = {
          id: randomId(),
          key: currentKey,
          label: labelFromQuery(searchParams),
          query: currentQS,
        };
        // Append new searches at the end
        list = [...stored, next].slice(-MAX_TABS);
        idx = list.length - 1;
      }
    }
    setTabs(list);
    setActive(Math.max(0, idx));
    saveTabs(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When URL params change (search action), update the active tab in-place or dedupe to an existing tab
  React.useEffect(() => {
    if (!tabs.length) return;
    const qs = parseQuery(searchParams);
    const key = keyFromQuery(qs);
    const lbl = labelFromQuery(searchParams);
    const current = tabs[active];
    if (current && current.key === key && current.query === qs) return; // no-op

    const existingIdx = tabs.findIndex((t, i) => i !== active && t.key === key);
    let nextTabs = [...tabs];
    let nextActive = active;

    if (existingIdx !== -1) {
      // Deduplicate: switch to existing and drop current if it became a duplicate
      nextActive = existingIdx;
      // Optionally remove the now-duplicate current empty tab
      const keep = nextTabs.filter((_, i) => i !== active);
      setTabs(keep);
      setActive(existingIdx > active ? existingIdx - 1 : existingIdx);
      saveTabs(keep);
      return;
    }

    // Update active tab
    nextTabs[active] = {
      ...nextTabs[active],
      key,
      query: qs,
      label: nextTabs[active].renamed ? nextTabs[active].label : lbl,
    };
    setTabs(nextTabs);
    saveTabs(nextTabs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function goto(idx: number) {
    const t = tabs[idx];
    if (!t) return;
    setActive(idx);
    const url = `${pathname}?${t.query}`;
    router.replace(url, { scroll: false });
  }

  function newTab() {
    const hasEmpty = tabs.some((t) => t.key === 'empty');
    if (hasEmpty) return goto(tabs.findIndex((t) => t.key === 'empty'));
    if (tabs.length >= MAX_TABS) return;
    const t: Tab = { id: randomId(), key: 'empty', label: 'Search', query: '' };
    const next = [...tabs, t];
    setTabs(next);
    setActive(next.length - 1);
    saveTabs(next);
    const url = `${pathname}`;
    router.replace(url, { scroll: false });
  }

  function closeTab(idx: number) {
    if (!tabs[idx]) return;
    const nonEmpty = tabs[idx].key !== 'empty' && !!tabs[idx].query;
    if (nonEmpty && !confirm('Close this tab and discard its parameters?')) return;
    const next = tabs.filter((_, i) => i !== idx);
    const nextActive = idx === active ? Math.max(0, idx - 1) : active > idx ? active - 1 : active;
    setTabs(next);
    setActive(nextActive);
    saveTabs(next);
    if (next[nextActive]) {
      router.replace(`${pathname}?${next[nextActive].query}`, { scroll: false });
    } else {
      router.replace(`${pathname}`, { scroll: false });
    }
  }

  // DnD reorder
  const dragIdx = React.useRef<number | null>(null);
  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    const from = dragIdx.current; dragIdx.current = null;
    if (from == null || from === i) return;
    const next = [...tabs];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setTabs(next);
    saveTabs(next);
    setActive(i);
  }

  function startEdit(id: string) { setEditing(id); }
  function commitEdit(id: string, value: string) {
    const next = tabs.map((t) => (t.id === id ? { ...t, label: value || t.label, renamed: !!value } : t));
    setTabs(next); saveTabs(next); setEditing(null);
  }

  return (
    <div className="mb-2 border-b border-gray-200 overflow-x-auto">
      <div className="flex items-end gap-1 min-w-max">
        {/* Fixed tabs: Wishlist and Trending at the beginning */}
        {isAuthorized ? (
          <button
            className={cn(
              'mr-1 px-3 py-2 rounded-t-md text-sm border',
              (searchParams.get('source') || '') === 'likes'
                ? 'bg-white border border-b-white text-pink-700'
                : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
            )}
            onClick={() => {
              const qs = new URLSearchParams(searchParams as any);
              qs.set('source', 'likes');
              if (!qs.get('page_size')) qs.set('page_size', '24');
              router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
            }}
            title="Wishlist"
          >
            Wishlist
          </button>
        ) : null}

        <button
          className={cn(
            'mr-2 px-3 py-2 rounded-t-md text-sm border',
            (searchParams.get('source') || '') === 'trending'
              ? 'bg-white border border-b-white text-indigo-700'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          )}
          onClick={() => {
            const qs = new URLSearchParams();
            qs.set('source', 'trending');
            qs.set('period', '7d');
            qs.set('page_size', '24');
            router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
          }}
          title="Trending"
        >
          Trending
        </button>

        <button
          className={cn(
            'mr-2 px-3 py-2 rounded-t-md text-sm border',
            searchParams.get('filters-new') === 'true'
              ? 'bg-white border border-b-white text-indigo-700'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          )}
          onClick={() => {
            const qs = new URLSearchParams();
            qs.set('filters-new', 'true');
            router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
          }}
          title="New arrivals"
        >
          New arrivals
        </button>

        <button
          className={cn(
            'mr-2 px-3 py-2 rounded-t-md text-sm border',
            searchParams.get('filters-promo_type') === 'all'
              ? 'bg-white border border-b-white text-indigo-700'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
          )}
          onClick={() => {
            const qs = new URLSearchParams();
            qs.set('filters-promo_type', 'all');
            router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
          }}
          title="Promo"
        >
          Promo (all)
        </button>

        {tabs.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              'group relative flex items-center max-w-[220px] rounded-t-md px-3 py-2 cursor-pointer select-none',
              i === active ? 'bg-white border border-b-white text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
            )}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            onClick={() => goto(i)}
            onDoubleClick={() => startEdit(t.id)}
            title={decodeURIComponent(t.query || 'Search')}
          >
            {editing === t.id ? (
              <input
                autoFocus
                defaultValue={t.label}
                onBlur={(e) => commitEdit(t.id, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(t.id, (e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') setEditing(null);
                }}
                className="bg-transparent outline-none text-sm max-w-[160px]"
              />
            ) : (
              <span className="text-sm truncate max-w-[180px]">{t.label}</span>
            )}
            <button
              className="ml-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-black"
              onClick={(e) => { e.stopPropagation(); closeTab(i); }}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="ml-2 px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 border"
          onClick={newTab}
        >
          + New tab
        </button>
      </div>
    </div>
  );
}
