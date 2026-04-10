'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IoGrid } from 'react-icons/io5';
import cn from 'classnames';
import type { WidgetConfig } from '@/lib/home-settings/types';
import { useTenantOptional } from '@/contexts/tenant.context';

interface PlatformApp {
  app_id: string;
  name: string;
  description?: string;
  url: string;
  icon?: string;
  color?: string;
  redirect_uris?: string[];
}

/** The B2B app is always the current app — injected client-side, not from DB */
const B2B_APP: PlatformApp = {
  app_id: 'b2b',
  name: 'B2B',
  description: 'B2B Commerce Portal',
  url: '',
  color: '#009688',
};

interface AppLauncherWidgetProps {
  config: WidgetConfig;
  lang: string;
}

interface TenantBranding {
  company_name: string;
  logo: string;
  favicon: string;
}

export function AppLauncherWidget({ config, lang }: AppLauncherWidgetProps) {
  const [open, setOpen] = useState(false);
  const [externalApps, setExternalApps] = useState<PlatformApp[]>([]);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tenantContext = useTenantOptional();

  useEffect(() => {
    fetch('/api/proxy/pim/api/b2b/tenant/enabled-apps')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enabled_apps && Array.isArray(data.enabled_apps)) {
          setExternalApps(
            data.enabled_apps.filter(
              (a: PlatformApp) => a.app_id && a.name && a.app_id !== 'b2b',
            ),
          );
        }
        if (data?.tenant_branding) {
          setBranding(data.tenant_branding);
        }
      })
      .catch(() => {});
  }, []);

  // B2B always first, then external platform apps from DB
  const apps = [B2B_APP, ...externalApps];
  const b2bImage = branding?.favicon || branding?.logo;

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

  const handleAppClick = useCallback(
    (app: PlatformApp) => {
      setOpen(false);
      const ssoUrl =
        tenantContext?.tenant?.builderUrl ||
        process.env.NEXT_PUBLIC_SSO_URL ||
        '';
      const callbackUrl = `${app.url}/api/auth/callback`;
      const params = new URLSearchParams({
        redirect_uri: callbackUrl,
        client_id: app.app_id,
      });
      const tenantId = tenantContext?.tenant?.id;
      if (tenantId) {
        params.set('tenant_id', tenantId);
      }
      window.location.href = `${ssoUrl}/auth/login?${params.toString()}`;
    },
    [tenantContext?.tenant],
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center group relative"
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors shrink-0',
          open
            ? 'border-brand/30 bg-brand/5 text-brand'
            : 'border-slate-200 hover:border-brand hover:text-brand',
        )}
        aria-label="App"
      >
        <IoGrid className="h-5 w-5" />
      </button>
      <span className="mt-1 text-[10px] text-slate-500">App</span>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Applicazioni
            </p>
          </div>
          <div className="p-2 space-y-1.5">
            {apps.map((app) => {
              const isB2B = app.app_id === 'b2b';
              const bgColor = app.color || '#6366f1';

              return (
                <a
                  key={app.app_id}
                  href={isB2B ? '/' : '#'}
                  onClick={(e) => {
                    if (!isB2B) {
                      e.preventDefault();
                      handleAppClick(app);
                    } else {
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    isB2B
                      ? 'bg-brand/5 ring-1 ring-brand/20'
                      : 'hover:bg-gray-50',
                  )}
                >
                  {app.icon ? (
                    <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden">
                      <img
                        src={app.icon}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : isB2B && b2bImage ? (
                    <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden">
                      <img
                        src={b2bImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: bgColor }}
                    >
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">
                      {app.name}
                    </span>
                    {isB2B && branding?.company_name ? (
                      <span className="block text-[11px] text-gray-400 truncate">
                        {branding.company_name}
                      </span>
                    ) : app.description ? (
                      <span className="block text-[11px] text-gray-400 truncate">
                        {app.description}
                      </span>
                    ) : null}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
