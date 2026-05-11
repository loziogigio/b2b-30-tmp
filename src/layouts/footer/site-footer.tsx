'use client';

/**
 * SiteFooter — the single, config-driven footer for every B2B theme.
 *
 * Renders the footer described by the admin (vinc-commerce-suite) portal model
 * (`HomeSettings.footer`): a raw-HTML override, or structured columns of mixed
 * text/link/image items, plus an optional newsletter block, social links and a
 * copyright bar. Theme differences ("default" vs "time") come purely from CSS
 * scoped on the `[data-theme]` attribute on <html> — see globals.css and
 * components/themes/time/css/time-variables.css.
 */

import { useMemo, useState } from 'react';
import Link from '@components/ui/link';
import { useTranslation } from 'src/app/i18n/client';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { sanitizeHtml, sanitizeHtmlStrict } from '@/lib/sanitize-html';
import { isValidEmail } from '@/lib/email';
import type {
  FooterColumn,
  FooterColumnItem,
  FooterSocialLink,
} from '@/lib/home-settings/types';

interface SiteFooterProps {
  lang: string;
}

// ---------------------------------------------------------------------------
// Social icons (monochrome, inherit currentColor — work on light & dark bars)
// ---------------------------------------------------------------------------

type IconProps = { className?: string };

const SOCIAL_ICON_PATHS: Record<string, string> = {
  facebook:
    'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z',
  instagram:
    'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.81 3.81 0 0 1-1.38-.9 3.81 3.81 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.64 3.64 0 0 0-.88-1.35 3.64 3.64 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07zm0 2.76a5.7 5.7 0 1 1 0 11.4 5.7 5.7 0 0 1 0-11.4zm0 1.62a4.08 4.08 0 1 0 0 8.16 4.08 4.08 0 0 0 0-8.16zm5.91-2.91a1.33 1.33 0 1 1-2.66 0 1.33 1.33 0 0 1 2.66 0z',
  twitter:
    'M22 5.92a8.2 8.2 0 0 1-2.36.65 4.12 4.12 0 0 0 1.8-2.27 8.22 8.22 0 0 1-2.6.99A4.1 4.1 0 0 0 11.85 9a11.65 11.65 0 0 1-8.45-4.29 4.1 4.1 0 0 0 1.27 5.47A4.07 4.07 0 0 1 3.8 9.7v.05a4.1 4.1 0 0 0 3.29 4.02 4.1 4.1 0 0 1-1.85.07 4.1 4.1 0 0 0 3.83 2.85A8.23 8.23 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.25 11.68-11.67l-.01-.53A8.34 8.34 0 0 0 22 5.92z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z',
  linkedin:
    'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .78 0 1.74v20.52C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z',
  youtube:
    'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.8zM9.6 15.6V8.4l6.27 3.6L9.6 15.6z',
  tiktok:
    'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.79a5.67 5.67 0 0 0-.77-.05A5.66 5.66 0 1 0 15.54 15.4V9.01a7.34 7.34 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z',
  whatsapp:
    'M.06 24l1.69-6.16a11.87 11.87 0 0 1-1.59-5.95C.16 5.34 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.82 11.82 0 0 1 3.48 8.41c0 6.56-5.34 11.9-11.9 11.9-1.99 0-3.95-.5-5.68-1.45L.06 24zm6.59-3.81c1.68.99 3.28 1.59 5.41 1.59 5.45 0 9.89-4.43 9.89-9.88 0-5.46-4.43-9.89-9.89-9.89-5.45 0-9.88 4.43-9.88 9.89 0 2.23.65 3.9 1.74 5.65l-1 3.66 3.73-1.02zm11.39-5.55c-.07-.12-.27-.2-.56-.34-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.71.23 1.36.19 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41z',
};

function SocialGlyph({
  platform,
  className,
}: IconProps & { platform: string }) {
  const path = SOCIAL_ICON_PATHS[platform.toLowerCase().replace(/[^a-z]/g, '')];
  if (!path) {
    // Generic external-link glyph for unknown platforms
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Newsletter signup (best-effort: posts to internal /api/newsletter/subscribe)
// ---------------------------------------------------------------------------

function NewsletterSignup({
  heading,
  placeholder,
  lang,
}: {
  heading?: string;
  placeholder?: string;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'footer');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setStatus('error');
      setMessage(t('newsletter-email-required'));
      return;
    }
    if (!isValidEmail(value)) {
      setStatus('error');
      setMessage(t('newsletter-email-invalid'));
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      if (res.ok) {
        setStatus('ok');
        setMessage(t('newsletter-success'));
        setEmail('');
      } else {
        setStatus('error');
        setMessage(t('newsletter-error'));
      }
    } catch {
      setStatus('error');
      setMessage(t('newsletter-error'));
    } finally {
      window.setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  }

  return (
    <div className="site-footer__newsletter">
      <h3 className="site-footer__col-title">
        {heading || t('newsletter-heading')}
      </h3>
      <form
        onSubmit={onSubmit}
        className="site-footer__newsletter-form"
        noValidate
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder || t('newsletter-placeholder')}
          className="site-footer__newsletter-input"
          aria-label={placeholder || t('newsletter-placeholder')}
        />
        <button
          type="submit"
          className="site-footer__newsletter-btn"
          disabled={status === 'sending'}
        >
          {t('newsletter-button')}
        </button>
      </form>
      {message && (
        <p
          className={`site-footer__newsletter-msg site-footer__newsletter-msg--${status}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Structured column rendering
// ---------------------------------------------------------------------------

/** A footer link that picks an <a> for external/new-tab targets and the
 *  locale-prefixed <Link> for in-app paths. Renders nothing without a target. */
function FooterAnchor({
  href,
  label,
  openInNewTab,
  lang,
  className,
}: {
  href?: string;
  label?: string;
  openInNewTab?: boolean;
  lang: string;
  className?: string;
}) {
  if (!href && !label) return null;
  const target = href || '#';
  const text = label || href || '';
  if (/^https?:\/\//i.test(target) || openInNewTab) {
    return (
      <a
        href={target}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className={className}
      >
        {text}
      </a>
    );
  }
  return (
    <Link
      href={target.startsWith('/') ? `/${lang}${target}` : target}
      className={className}
    >
      {text}
    </Link>
  );
}

function ColumnItem({ item, lang }: { item: FooterColumnItem; lang: string }) {
  if (item.type === 'text') {
    const content = item.textContent?.trim();
    if (!content) return null;
    return (
      <div
        className="site-footer__text"
        dangerouslySetInnerHTML={{ __html: sanitizeHtmlStrict(content) }}
      />
    );
  }
  if (item.type === 'image') {
    if (!item.imageUrl) return null;
    return (
      <img
        src={item.imageUrl}
        alt={item.imageAlt ?? ''}
        loading="lazy"
        className="site-footer__img"
        style={{ maxWidth: `${item.imageMaxWidth ?? 200}px` }}
      />
    );
  }
  return (
    <FooterAnchor
      href={item.href}
      label={item.label}
      openInNewTab={item.openInNewTab}
      lang={lang}
      className="site-footer__link"
    />
  );
}

function FooterColumnView({
  column,
  lang,
}: {
  column: FooterColumn;
  lang: string;
}) {
  const hasItems = !!column.items && column.items.length > 0;
  const links = !hasItems ? column.links.filter((l) => l.label || l.href) : [];
  if (!hasItems && links.length === 0 && !column.title) return null;
  return (
    <div className="site-footer__col">
      {column.title && (
        <h3 className="site-footer__col-title">{column.title}</h3>
      )}
      <div className="site-footer__col-body">
        {hasItems
          ? column.items!.map((item, i) => (
              <ColumnItem key={i} item={item} lang={lang} />
            ))
          : links.map((l, i) => (
              <FooterAnchor
                key={i}
                href={l.href}
                label={l.label}
                openInNewTab={l.openInNewTab}
                lang={lang}
                className="site-footer__link"
              />
            ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteFooter
// ---------------------------------------------------------------------------

export default function SiteFooter({ lang }: SiteFooterProps) {
  const { t } = useTranslation(lang, 'footer');
  const { settings } = useHomeSettings();
  const year = new Date().getFullYear();

  const branding = settings?.branding;
  const footer = settings?.footer;
  const companyTitle = branding?.title || 'B2B Store';

  const bgColor =
    footer?.bgColor ||
    branding?.footerBackgroundColor ||
    'var(--color-footer-bg, #f5f5f5)';
  const textColor =
    footer?.textColor ||
    branding?.footerTextColor ||
    'var(--color-footer-text, #666666)';

  // Public site renders the published HTML only — never the draft.
  const html = (footer?.footerHtml ?? settings?.footerHtml ?? '').trim();
  const sanitizedHtml = useMemo(() => (html ? sanitizeHtml(html) : ''), [html]);

  const columns = (footer?.columns ?? []).filter(
    (c) => c.title || (c.items && c.items.length > 0) || c.links.length > 0,
  );
  const socials: FooterSocialLink[] = (footer?.socialLinks ?? []).filter(
    (s) => s.platform && s.url,
  );
  const showNewsletter = !!footer?.showNewsletter;
  const copyrightText = footer?.copyrightText?.trim();

  // Raw-HTML mode wins — render it and nothing else (apart from the wrapper).
  if (sanitizedHtml) {
    return (
      <footer
        className="site-footer site-footer--html"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {/* NOTE: Tailwind arbitrary classes inside admin-authored HTML are not
            JIT-compiled — authors should use inline styles / plain CSS. */}
        <div
          className="site-footer__html"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </footer>
    );
  }

  return (
    <footer
      className="site-footer"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="site-footer__inner mx-auto max-w-[1600px] px-5">
        {(columns.length > 0 || showNewsletter) && (
          <div
            className="site-footer__grid"
            data-cols={Math.min(5, columns.length + (showNewsletter ? 1 : 0))}
          >
            {columns.map((column, i) => (
              <FooterColumnView key={i} column={column} lang={lang} />
            ))}
            {showNewsletter && (
              <NewsletterSignup
                heading={footer?.newsletterHeading}
                placeholder={footer?.newsletterPlaceholder}
                lang={lang}
              />
            )}
          </div>
        )}

        {socials.length > 0 && (
          <div className="site-footer__social">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.platform}
                className="site-footer__social-link"
              >
                <SocialGlyph
                  platform={s.platform}
                  className="site-footer__social-icon"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="site-footer__copyright">
        {copyrightText ||
          t('text-footer-copyright-line', { year, company: companyTitle })}
      </div>
    </footer>
  );
}
