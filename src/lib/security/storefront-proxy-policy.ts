type Access = 'public' | 'session';
type Rule = { path: RegExp; methods: readonly string[]; access: Access };

/** Never pass URL syntax, path separators or encoded segments into new URL(). */
export function safeProxyPath(segments: string[]): string | null {
  if (
    !segments.length ||
    segments.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        /[\\/%?#\s\u0000-\u001f\u007f]/.test(part),
    )
  )
    return null;
  return segments.join('/');
}

// Explicit capabilities, not a prefix allowlist. New Suite endpoints remain
// inaccessible until their methods and ownership contract are reviewed here.
const rules: Rule[] = [
  { path: /^api\/search\/search$/, methods: ['GET', 'POST'], access: 'public' },
  { path: /^api\/search\/facet$/, methods: ['GET', 'POST'], access: 'public' },
  {
    path: /^api\/public\/(menu|categories|collections)$/,
    methods: ['GET'],
    access: 'public',
  },
  {
    path: /^api\/public\/collections\/[^/]+(\/products)?$/,
    methods: ['GET'],
    access: 'public',
  },
  {
    path: /^api\/b2b\/search\/available-specs$/,
    methods: ['GET'],
    access: 'public',
  },
  { path: /^api\/b2b\/correlations$/, methods: ['GET'], access: 'public' },
  {
    path: /^api\/b2b\/push\/vapid-public-key$/,
    methods: ['GET'],
    access: 'public',
  },
  {
    path: /^api\/b2b\/likes\/(popular|trending|trending\/page)$/,
    methods: ['GET'],
    access: 'public',
  },
  {
    path: /^api\/b2b\/cart\/(active|save|activate)$/,
    methods: ['POST'],
    access: 'session',
  },
  { path: /^api\/b2b\/cart\/saved$/, methods: ['GET'], access: 'session' },
  { path: /^api\/b2b\/orders$/, methods: ['GET', 'POST'], access: 'session' },
  {
    path: /^api\/b2b\/orders\/processing$/,
    methods: ['GET'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/orders\/[^/]+$/,
    methods: ['GET', 'PATCH', 'DELETE'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/orders\/[^/]+\/items$/,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/orders\/[^/]+\/(submit|revert-to-cart|resubmit)$/,
    methods: ['POST'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/orders\/[^/]+\/processing-status$/,
    methods: ['GET'],
    access: 'session',
  },
  { path: /^api\/b2b\/customers\/[^/]+$/, methods: ['GET'], access: 'session' },
  {
    path: /^api\/b2b\/(likes|reminders)$/,
    methods: ['POST', 'DELETE'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/(likes|reminders)\/(toggle|status\/bulk)$/,
    methods: ['POST'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/(likes|reminders)\/(user|status\/[^/]+)$/,
    methods: ['GET'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/push\/subscribe$/,
    methods: ['GET', 'POST', 'DELETE'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/push\/preferences$/,
    methods: ['GET', 'PATCH'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/push\/notifications$/,
    methods: ['GET', 'PATCH'],
    access: 'session',
  },
  {
    path: /^api\/b2b\/tenant\/enabled-apps$/,
    methods: ['GET'],
    access: 'session',
  },
  {
    path: /^api\/elia\/(intent|search|analyze)$/,
    methods: ['POST'],
    access: 'session',
  },
];

export function storefrontProxyAccess(
  path: string,
  method: string,
): Access | null {
  const rule = rules.find((candidate) => candidate.path.test(path));
  return rule?.methods.includes(method) ? rule.access : null;
}
