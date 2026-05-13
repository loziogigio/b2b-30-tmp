import type { FooterConfig, HomeSettings } from '@/lib/home-settings/types';

export interface CompanyProfile {
  name: string;
  brandName?: string;
  description?: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  websiteUrl?: string;
  legalLine?: string;
  vatNumber?: string;
}

interface PartialCompanyProfile {
  addressLines?: string[];
  phone?: string;
  email?: string;
  legalLine?: string;
  websiteUrl?: string;
}

function cleanText(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanInlineText(value?: string | null): string {
  return cleanText(value).replace(/\s*\|\s*/g, ' | ');
}

function pickFirst<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  }) as T | undefined;
}

function extractVatNumber(legalLine?: string): string | undefined {
  const text = cleanInlineText(legalLine);
  if (!text) return undefined;

  const patterns = [
    /\bP\.?\s*IVA[:\s-]*([A-Z0-9]{8,})\b/i,
    /\bPI[:\s-]*([A-Z0-9]{8,})\b/i,
    /\bVAT[:\s-]*([A-Z0-9]{8,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function extractFromFooterColumns(
  footer?: FooterConfig,
): PartialCompanyProfile | undefined {
  if (!footer?.columns?.length) return undefined;

  const texts = footer.columns.flatMap((column) => [
    column.title,
    ...(column.items ?? []).map((item) => item.textContent ?? item.label ?? ''),
    ...column.links.map((link) => link.label ?? ''),
  ]);

  const joined = texts.map(cleanInlineText).filter(Boolean).join(' | ');
  const phone = joined.match(/(\+?\d[\d\s().-]{6,}\d)/)?.[1];
  const email = joined.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
  const legalLine = texts
    .map(cleanInlineText)
    .find((text) =>
      /(?:\bCF\b|\bPI\b|P\.?\s*IVA|REA|Cap\.?\s*Sociale)/i.test(text),
    );

  return {
    phone,
    email,
    legalLine,
  };
}

function extractFromFooterHtml(
  html?: string,
): PartialCompanyProfile | undefined {
  if (!html) return undefined;

  const fallback: PartialCompanyProfile = {
    phone:
      html.match(/href=["']tel:([^"']+)["'][^>]*>(.*?)<\/a>/i)?.[2] ??
      html.match(/href=["']tel:([^"']+)["']/i)?.[1],
    email:
      html.match(/href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/i)?.[2] ??
      html.match(/href=["']mailto:([^"']+)["']/i)?.[1],
  };

  if (typeof DOMParser === 'undefined') {
    const legalLine = html
      .replace(/\n/g, ' ')
      .match(/>([^<>]*(?:CF|PI|P\.?\s*IVA|REA|Cap\.?\s*Sociale)[^<>]*)</i)?.[1];
    return {
      ...fallback,
      phone: cleanInlineText(fallback.phone),
      email: cleanInlineText(fallback.email),
      legalLine: cleanInlineText(legalLine),
    };
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const phoneLink = doc.querySelector('a[href^="tel:"]');
  const emailLink = doc.querySelector('a[href^="mailto:"]');

  const legalLine = Array.from(doc.querySelectorAll('div'))
    .map((node) => cleanInlineText(node.textContent))
    .filter(Boolean)
    .find((text) =>
      /(?:\bCF\b|\bPI\b|P\.?\s*IVA|REA|Cap\.?\s*Sociale)/i.test(text),
    );

  const addressCandidates = Array.from(doc.querySelectorAll('div'))
    .map((node) => {
      if (node.querySelector('img')) return null;
      if (
        node.querySelector('a[href^="tel:"]') ||
        node.querySelector('a[href^="mailto:"]')
      ) {
        return null;
      }

      const lines = Array.from(node.children)
        .filter((child) => child.tagName.toLowerCase() === 'div')
        .map((child) => cleanInlineText(child.textContent))
        .filter(Boolean);

      if (lines.length < 1 || lines.length > 3) return null;

      const text = lines.join(' ');
      if (
        /(?:seguici|follow|social|facebook|instagram|linkedin|youtube)/i.test(
          text,
        )
      ) {
        return null;
      }
      if (/(?:\bCF\b|\bPI\b|P\.?\s*IVA|REA|Cap\.?\s*Sociale)/i.test(text)) {
        return null;
      }
      if (text.length > 120) return null;

      return lines;
    })
    .filter((value): value is string[] => Boolean(value))
    .sort((a, b) => b.join(' ').length - a.join(' ').length);

  return {
    addressLines: addressCandidates[0],
    phone: cleanInlineText(phoneLink?.textContent ?? fallback.phone),
    email: cleanInlineText(emailLink?.textContent ?? fallback.email),
    legalLine: cleanInlineText(legalLine),
  };
}

export function getCompanyProfile(
  settings?: HomeSettings | null,
): CompanyProfile {
  const footerHtml = settings?.footer?.footerHtml ?? settings?.footerHtml;
  const fromColumns = extractFromFooterColumns(settings?.footer);
  const fromFooterHtml = extractFromFooterHtml(footerHtml);

  const brandName = cleanText(settings?.branding?.title);
  const companyName =
    cleanText(settings?.companyName) || brandName || 'B2B Store';
  const description =
    cleanText(settings?.meta_tags?.description) ||
    cleanText(settings?.meta_tags?.ogDescription);
  const addressLines = pickFirst(
    fromColumns?.addressLines,
    fromFooterHtml?.addressLines,
    [],
  ) as string[];
  const legalLine = pickFirst(
    fromColumns?.legalLine,
    fromFooterHtml?.legalLine,
  );
  const websiteUrl = cleanText(
    settings?.branding?.websiteUrl || settings?.branding?.shopUrl,
  );

  return {
    name: companyName,
    brandName:
      brandName && brandName.toLowerCase() !== companyName.toLowerCase()
        ? brandName
        : undefined,
    description,
    addressLines,
    phone: pickFirst(fromColumns?.phone, fromFooterHtml?.phone),
    email: pickFirst(fromColumns?.email, fromFooterHtml?.email),
    websiteUrl:
      websiteUrl || fromColumns?.websiteUrl || fromFooterHtml?.websiteUrl,
    legalLine,
    vatNumber: extractVatNumber(legalLine),
  };
}
