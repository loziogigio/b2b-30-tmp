'use client';

import { atom, useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function createQueryString(queryObj: any) {
  let path = [];
  for (const [key, value] of Object.entries(queryObj)) {
    path.push(`${key}=${value}`);
  }
  return path.join('&').toString();
}

const queryAtom = atom('');

export default function useQueryParam(pathname: string = '/') {
  const [query, setQuery] = useAtom(queryAtom);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const l = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(l);
  }, [query]);

  const clearQueryParam = (key: string[]) => {
    let url = new URL(location.href);
    key.forEach((item) => url.searchParams.delete(item));
    setQuery(url.search);
    router.push(`${pathname}${url.search}`);
  };

  const setQueryparams = (data: any) => {
    let queryString = '';
    if (typeof data !== 'string') {
      queryString = createQueryString(data);
    }
    setQuery(queryString);
  };

  function getParams(url?: string | URL | Location) {
    const params: any = {};
    let target: URL | null = null;

    try {
      if (!url) {
        if (typeof window !== 'undefined') {
          target = new URL(window.location.href);
        }
      } else if (typeof url === 'string') {
        const s = url.trim();
        if (s.startsWith('http://') || s.startsWith('https://')) {
          target = new URL(s);
        } else {
          const qs = s.startsWith('?') ? s : s ? `?${s}` : '';
          // Use a dummy base for parsing relative query strings during SSR/prerender
          target = new URL(`http://dummy.local${qs}`);
        }
      } else if (typeof (url as Location).href === 'string') {
        target = new URL((url as Location).href);
      } else {
        target = new URL((url as URL).toString());
      }
    } catch {
      // Fallback to empty URL if parsing failed
      try {
        target = new URL('http://dummy.local');
      } catch {}
    }

    if (!target) return params;

    target.searchParams.forEach(function (val: string, key: string) {
      if (params[key] !== undefined) {
        if (!Array.isArray(params[key])) {
          params[key] = [params[key]];
        }
        params[key].push(val);
      } else {
        params[key] = val;
      }
    });
    return params;
  }

  const updateQueryparams = (key: string, value: string | number | boolean) => {
    if (!value) {
      clearQueryParam([key]);
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set(key, value.toString());
    setQuery(url.search);
    router.push(`${pathname}${url.search}`);
  };

  return {
    query,
    loading,
    getParams,
    setQueryparams,
    updateQueryparams,
    clearQueryParam,
  };
}
