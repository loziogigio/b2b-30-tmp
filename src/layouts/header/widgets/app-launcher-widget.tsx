'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IoGrid } from 'react-icons/io5';
import { HiOutlineOfficeBuilding, HiOutlineShoppingBag } from 'react-icons/hi';
import cn from 'classnames';
import { useTenantOptional } from '@/contexts/tenant.context';
import type { WidgetConfig } from '@/lib/home-settings/types';

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || '';
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || '';

interface AppLauncherWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function AppLauncherWidget({ config, lang }: AppLauncherWidgetProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tenantContext = useTenantOptional();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleStorefrontClick = useCallback(() => {
    setOpen(false);

    // Build SSO login URL with storefront's client_id and redirect_uri
    const ssoBase = tenantContext?.tenant?.builderUrl || SSO_URL;
    const callbackUrl = `${STOREFRONT_URL}/api/auth/callback`;

    const params = new URLSearchParams({
      redirect_uri: callbackUrl,
      client_id: 'vinc-vetrina',
    });

    const tenantId = tenantContext?.tenant?.id;
    if (tenantId) {
      params.set('tenant_id', tenantId);
    }

    window.location.href = `${ssoBase}/auth/login?${params.toString()}`;
  }, [tenantContext?.tenant]);

  // Hide when storefront URL is not configured
  if (!STOREFRONT_URL) return null;

  const tileClass =
    'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors cursor-pointer';

  return (
    <div ref={containerRef} className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors shrink-0',
          open
            ? 'border-brand/30 bg-brand/5 text-brand'
            : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand',
        )}
        aria-label="Applicazioni"
      >
        <IoGrid className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3">
          <div className="grid grid-cols-2 gap-1">
            {/* B2B - current app (active) */}
            <a
              href="/"
              onClick={() => setOpen(false)}
              className={cn(tileClass, 'bg-blue-50/50 ring-1 ring-blue-200')}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50">
                <HiOutlineOfficeBuilding className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-gray-700 font-medium text-center">
                B2B
              </span>
            </a>

            {/* Vetrina - SSO redirect to storefront */}
            <button
              type="button"
              onClick={handleStorefrontClick}
              className={cn(tileClass, 'hover:bg-gray-100')}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-violet-50">
                <HiOutlineShoppingBag className="w-6 h-6 text-violet-500" />
              </div>
              <span className="text-xs text-gray-700 font-medium text-center">
                Vetrina
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
