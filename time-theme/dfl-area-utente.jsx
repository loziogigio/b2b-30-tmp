import { useState, useEffect } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const USER = {
  name: 'Mario Rossi',
  company: 'Ferramenta Rossi S.r.l.',
  email: 'mario.rossi@ferramentarossi.it',
  phone: '+39 0975 45624',
  piva: 'IT04521890652',
  codiceSDI: 'USAL8PV',
  pec: 'ferramentarossi@pec.it',
  agent: 'Giuseppe Verdi',
  agentPhone: '+39 333 1234567',
  memberSince: '2018',
  tier: 'Gold',
  discount: 'VEND 1 – 50%',
  creditLimit: 25000,
  creditUsed: 8340,
  address: 'Via Roma 42, 84036 Sala Consilina (SA)',
  shippingAddress: 'Via Roma 42, 84036 Sala Consilina (SA)',
};

const STATS = [
  {
    label: 'Ordini Totali',
    value: '342',
    sub: 'ultimo anno',
    icon: '📦',
    color: '#2563eb',
    trend: '+12%',
  },
  {
    label: 'Volume Acquisti',
    value: '€148.5K',
    sub: 'ultimo anno',
    icon: '📊',
    color: '#059669',
    trend: '+8%',
  },
  {
    label: 'Prodotti Ordinati',
    value: '2,847',
    sub: 'articoli unici',
    icon: '🏷️',
    color: '#d97706',
    trend: '+15%',
  },
  {
    label: 'Fido Disponibile',
    value: '€16.6K',
    sub: `di €${(USER.creditLimit / 1000).toFixed(0)}K totali`,
    icon: '💳',
    color: '#7c3aed',
    trend: null,
  },
];

const RECENT_ORDERS = [
  {
    id: 'ORD-2026-1847',
    date: '22 Mar 2026',
    items: 12,
    total: 847.3,
    status: 'in_consegna',
    eta: '25 Mar',
  },
  {
    id: 'ORD-2026-1832',
    date: '18 Mar 2026',
    items: 5,
    total: 234.5,
    status: 'consegnato',
    eta: null,
  },
  {
    id: 'ORD-2026-1819',
    date: '14 Mar 2026',
    items: 28,
    total: 1890.0,
    status: 'consegnato',
    eta: null,
  },
  {
    id: 'ORD-2026-1801',
    date: '10 Mar 2026',
    items: 3,
    total: 156.8,
    status: 'consegnato',
    eta: null,
  },
  {
    id: 'ORD-2026-1788',
    date: '06 Mar 2026',
    items: 15,
    total: 612.4,
    status: 'consegnato',
    eta: null,
  },
];

const DOCUMENTS = [
  {
    name: 'Fattura FT-2026/0342',
    date: '22 Mar 2026',
    type: 'fattura',
    size: '245 KB',
  },
  { name: 'DDT 2026/1847', date: '22 Mar 2026', type: 'ddt', size: '180 KB' },
  {
    name: 'Fattura FT-2026/0338',
    date: '18 Mar 2026',
    type: 'fattura',
    size: '198 KB',
  },
  {
    name: 'Nota Credito NC-2026/012',
    date: '15 Mar 2026',
    type: 'nota_credito',
    size: '125 KB',
  },
  {
    name: 'Fattura FT-2026/0325',
    date: '14 Mar 2026',
    type: 'fattura',
    size: '312 KB',
  },
];

const DEADLINES = [
  {
    desc: 'Scadenza fattura FT-2026/0302',
    date: '28 Mar 2026',
    amount: 1245.6,
    status: 'upcoming',
  },
  {
    desc: 'Scadenza fattura FT-2026/0288',
    date: '05 Apr 2026',
    amount: 890.0,
    status: 'upcoming',
  },
  {
    desc: 'Scadenza fattura FT-2026/0275',
    date: '15 Apr 2026',
    amount: 2340.0,
    status: 'upcoming',
  },
  {
    desc: 'Scadenza fattura FT-2026/0260',
    date: '12 Mar 2026',
    amount: 567.3,
    status: 'paid',
  },
  {
    desc: 'Scadenza fattura FT-2026/0248',
    date: '01 Mar 2026',
    amount: 1120.0,
    status: 'paid',
  },
];

const EXPOSITIONS = [
  {
    doc: 'FT-2026/0342',
    date: '22 Mar 2026',
    due: '22 Apr 2026',
    amount: 847.3,
    balance: 847.3,
    status: 'aperto',
  },
  {
    doc: 'FT-2026/0338',
    date: '18 Mar 2026',
    due: '18 Apr 2026',
    amount: 234.5,
    balance: 234.5,
    status: 'aperto',
  },
  {
    doc: 'FT-2026/0325',
    date: '14 Mar 2026',
    due: '14 Apr 2026',
    amount: 1890.0,
    balance: 1890.0,
    status: 'aperto',
  },
  {
    doc: 'FT-2026/0302',
    date: '28 Feb 2026',
    due: '28 Mar 2026',
    amount: 1245.6,
    balance: 1245.6,
    status: 'scadenza',
  },
];

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Pannello di Controllo', icon: 'grid' },
  { id: 'account', label: 'Dettagli Account', icon: 'user' },
  { id: 'orders', label: 'I Miei Ordini', icon: 'package' },
  { id: 'documents', label: 'Documenti', icon: 'file' },
  { id: 'exposition', label: 'Esposizione', icon: 'coins' },
  { id: 'deadlines', label: 'Scadenziario', icon: 'calendar' },
  { id: 'downloads', label: 'Scarica', icon: 'download' },
  { id: 'requests', label: 'Richieste', icon: 'message' },
  { id: 'lamura_day', label: 'La Mura Day', icon: 'star' },
  { id: 'password', label: 'Cambiare Password', icon: 'lock' },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────

const icons = {
  grid: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <rect x="1" y="1" width="7" height="7" rx="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" />
    </svg>
  ),
  user: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  package: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  file: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  coins: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M15 9.5c-.3-1-1.3-1.5-3-1.5s-3 .7-3 2 1.3 2 3 2 3 .7 3 2-1.3 2-3 2" />
    </svg>
  ),
  calendar: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  download: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  message: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  star: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  ),
  lock: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  logout: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  search: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  cart: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  arrowRight: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  ),
  chevronRight: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="9,6 15,12 9,18" />
    </svg>
  ),
  eye: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  copy: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  mapPin: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  userCircle: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  truck: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16,8 20,8 23,11 23,16 16,16" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  check: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  ),
};

// ─── STATUS HELPERS ──────────────────────────────────────────────────────────

const orderStatus = {
  in_consegna: {
    label: 'In Consegna',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    icon: icons.truck,
  },
  consegnato: {
    label: 'Consegnato',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    icon: icons.check,
  },
  in_preparazione: {
    label: 'In Preparazione',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    icon: icons.package,
  },
};

const docTypeColors = {
  fattura: { label: 'Fattura', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  ddt: { label: 'DDT', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  nota_credito: {
    label: 'Nota Credito',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
  },
};

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function Card({ children, style = {}, hover = false, ...props }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid var(--gray-100)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
        ...style,
      }}
      onMouseEnter={
        hover
          ? (e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              e.currentTarget.style.boxShadow = 'none';
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, action, actionLabel = 'Vedi tutti' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 22px 14px',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--dark)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      {action && (
        <button
          onClick={action}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--red)',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {actionLabel} {icons.chevronRight}
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value, copyable = false, mono = false }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--gray-50)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--gray-500)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--dark)',
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
          }}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: copied ? 'var(--green)' : 'var(--gray-400)',
              transition: 'color 0.15s',
            }}
          >
            {copied ? icons.check : icons.copy}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ──────────────────────────────────────────────────────────

function DashboardView({ setPage }) {
  const creditPct = (USER.creditUsed / USER.creditLimit) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #374151 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: 100,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-body)',
              }}
            >
              Cliente {USER.tier}
            </span>
            <span
              style={{
                background: 'var(--red)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                fontFamily: 'var(--font-body)',
              }}
            >
              {USER.discount}
            </span>
          </div>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 26,
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            Benvenuto, {USER.name.split(' ')[0]}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {USER.company} · Cliente dal {USER.memberSince}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        {STATS.map((s, i) => (
          <Card
            key={s.label}
            hover
            style={{
              padding: '20px 20px 18px',
              cursor: 'pointer',
              animation: `fadeUp 0.35s ease ${i * 0.06}s both`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              {s.trend && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#059669',
                    background: 'rgba(5,150,105,0.08)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.trend}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 2,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--gray-400)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--gray-400)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.sub}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Credit bar */}
      <Card style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--dark)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Fido / Linea di Credito
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--gray-400)',
                fontFamily: 'var(--font-body)',
                marginTop: 2,
              }}
            >
              €{USER.creditUsed.toLocaleString()} utilizzati di €
              {USER.creditLimit.toLocaleString()}
            </div>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: creditPct > 80 ? '#dc2626' : 'var(--dark)',
              fontFamily: 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            €{(USER.creditLimit - USER.creditUsed).toLocaleString()}
          </span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 5,
            background: 'var(--gray-50)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 5,
              width: `${creditPct}%`,
              background:
                creditPct > 80
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : creditPct > 60
                    ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                    : 'linear-gradient(90deg, #059669, #34d399)',
              transition: 'width 1s ease',
            }}
          />
        </div>
      </Card>

      {/* Orders + Documents side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Recent Orders */}
        <Card>
          <SectionHeader
            title="Ordini Recenti"
            action={() => setPage('orders')}
          />
          <div style={{ padding: '0' }}>
            {RECENT_ORDERS.slice(0, 4).map((o, i) => {
              const s = orderStatus[o.status];
              return (
                <div
                  key={o.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                    borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--gray-50)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: s.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: s.color,
                        flexShrink: 0,
                      }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--dark)',
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {o.id}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--gray-400)',
                          fontFamily: 'var(--font-body)',
                          marginTop: 1,
                        }}
                      >
                        {o.date} · {o.items} articoli
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: 'var(--dark)',
                        fontFamily: 'var(--font-body)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      €{o.total.toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: s.color,
                        fontFamily: 'var(--font-body)',
                        marginTop: 1,
                      }}
                    >
                      {s.label}
                      {o.eta ? ` · ETA ${o.eta}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Documents */}
        <Card>
          <SectionHeader
            title="Documenti Recenti"
            action={() => setPage('documents')}
          />
          <div>
            {DOCUMENTS.slice(0, 4).map((d, i) => {
              const dt = docTypeColors[d.type];
              return (
                <div
                  key={d.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 22px',
                    borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--gray-50)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: dt.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: dt.color,
                        flexShrink: 0,
                      }}
                    >
                      {icons.file}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--dark)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--gray-400)',
                          fontFamily: 'var(--font-body)',
                          marginTop: 1,
                        }}
                      >
                        {d.date} · {d.size}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: dt.color,
                        background: dt.bg,
                        padding: '3px 8px',
                        borderRadius: 5,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {dt.label}
                    </span>
                    <button
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: '1px solid var(--gray-200)',
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--gray-500)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--red)';
                        e.currentTarget.style.color = 'var(--red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gray-200)';
                        e.currentTarget.style.color = 'var(--gray-500)';
                      }}
                    >
                      {icons.download}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Deadlines + Agent */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}
      >
        {/* Deadlines */}
        <Card>
          <SectionHeader
            title="Prossime Scadenze"
            action={() => setPage('deadlines')}
          />
          <div>
            {DEADLINES.slice(0, 4).map((d, i) => (
              <div
                key={d.desc + d.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 22px',
                  borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background:
                        d.status === 'paid'
                          ? 'rgba(5,150,105,0.08)'
                          : 'rgba(37,99,235,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: d.status === 'paid' ? '#059669' : '#2563eb',
                      flexShrink: 0,
                    }}
                  >
                    {d.status === 'paid' ? icons.check : icons.calendar}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--dark)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {d.desc}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--gray-400)',
                        fontFamily: 'var(--font-body)',
                        marginTop: 1,
                      }}
                    >
                      {d.date}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--dark)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    €{d.amount.toFixed(2)}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: d.status === 'paid' ? '#059669' : '#2563eb',
                    }}
                  >
                    {d.status === 'paid' ? 'Pagata' : 'In scadenza'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent Card */}
        <Card style={{ padding: '24px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-body)',
              marginBottom: 16,
            }}
          >
            Il Tuo Agente
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--red), #be123c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              marginBottom: 14,
            }}
          >
            {USER.agent
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--dark)',
              fontFamily: 'var(--font-display)',
              marginBottom: 4,
            }}
          >
            {USER.agent}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--gray-500)',
              fontFamily: 'var(--font-body)',
              marginBottom: 20,
            }}
          >
            Agente di zona
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: 'var(--dark)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--red)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'var(--dark)')
              }
            >
              📞 {USER.agentPhone}
            </button>
            <button
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1.5px solid var(--gray-200)',
                background: '#fff',
                color: 'var(--gray-600)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--dark)';
                e.currentTarget.style.color = 'var(--dark)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)';
                e.currentTarget.style.color = 'var(--gray-600)';
              }}
            >
              ✉️ Invia messaggio
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ACCOUNT VIEW ────────────────────────────────────────────────────────────

function AccountView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card style={{ padding: '24px 26px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-body)',
              marginBottom: 16,
            }}
          >
            Dati Azienda
          </div>
          <InfoRow label="Ragione Sociale" value={USER.company} />
          <InfoRow label="Partita IVA" value={USER.piva} mono copyable />
          <InfoRow label="Codice SDI" value={USER.codiceSDI} mono copyable />
          <InfoRow label="PEC" value={USER.pec} copyable />
          <InfoRow label="Email" value={USER.email} copyable />
          <InfoRow label="Telefono" value={USER.phone} />
        </Card>
        <Card style={{ padding: '24px 26px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-body)',
              marginBottom: 16,
            }}
          >
            Indirizzi
          </div>
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--dark)',
                fontFamily: 'var(--font-body)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {icons.mapPin} Indirizzo di Fatturazione
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--gray-500)',
                fontFamily: 'var(--font-body)',
                background: 'var(--gray-50)',
                padding: '12px 14px',
                borderRadius: 10,
              }}
            >
              {USER.address}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--dark)',
                fontFamily: 'var(--font-body)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {icons.truck} Indirizzo di Spedizione
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--gray-500)',
                fontFamily: 'var(--font-body)',
                background: 'var(--gray-50)',
                padding: '12px 14px',
                borderRadius: 10,
              }}
            >
              {USER.shippingAddress}
            </div>
          </div>
          <button
            style={{
              marginTop: 16,
              width: '100%',
              height: 40,
              borderRadius: 10,
              border: '1.5px solid var(--gray-200)',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gray-600)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--dark)';
              e.currentTarget.style.color = 'var(--dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)';
              e.currentTarget.style.color = 'var(--gray-600)';
            }}
          >
            Modifica Indirizzi
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─── ORDERS VIEW ─────────────────────────────────────────────────────────────

function OrdersView() {
  return (
    <Card>
      <SectionHeader title="Tutti gli Ordini" />
      <div>
        {RECENT_ORDERS.map((o, i) => {
          const s = orderStatus[o.status];
          return (
            <div
              key={o.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 22px',
                borderBottom:
                  i < RECENT_ORDERS.length - 1
                    ? '1px solid var(--gray-50)'
                    : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--gray-50)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: s.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color,
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--dark)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {o.id}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--gray-400)',
                      fontFamily: 'var(--font-body)',
                      marginTop: 2,
                    }}
                  >
                    {o.date} · {o.items} articoli
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: s.color,
                    background: s.bg,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {s.label}
                  {o.eta ? ` · ETA ${o.eta}` : ''}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--dark)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 90,
                    textAlign: 'right',
                  }}
                >
                  €{o.total.toFixed(2)}
                </span>
                <div style={{ color: 'var(--gray-400)' }}>
                  {icons.chevronRight}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── DOCUMENTS VIEW ──────────────────────────────────────────────────────────

function DocumentsView() {
  return (
    <Card>
      <SectionHeader title="Tutti i Documenti" />
      <div>
        {DOCUMENTS.map((d, i) => {
          const dt = docTypeColors[d.type];
          return (
            <div
              key={d.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                borderBottom:
                  i < DOCUMENTS.length - 1
                    ? '1px solid var(--gray-50)'
                    : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--gray-50)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: dt.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: dt.color,
                  }}
                >
                  {icons.file}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--dark)',
                    }}
                  >
                    {d.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--gray-400)',
                      marginTop: 1,
                    }}
                  >
                    {d.date} · {d.size}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: dt.color,
                    background: dt.bg,
                    padding: '3px 8px',
                    borderRadius: 5,
                  }}
                >
                  {dt.label}
                </span>
                <button
                  style={{
                    height: 32,
                    padding: '0 14px',
                    borderRadius: 7,
                    border: '1.5px solid var(--gray-200)',
                    background: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--gray-600)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--red)';
                    e.currentTarget.style.color = 'var(--red)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                    e.currentTarget.style.color = 'var(--gray-600)';
                  }}
                >
                  {icons.download} Scarica
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── EXPOSITION VIEW ─────────────────────────────────────────────────────────

function ExpositionView() {
  const total = EXPOSITIONS.reduce((a, e) => a + e.balance, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--gray-400)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Esposizione Totale
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
                fontVariantNumeric: 'tabular-nums',
                marginTop: 2,
              }}
            >
              €{total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#d97706',
              background: 'rgba(217,119,6,0.08)',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            {EXPOSITIONS.filter((e) => e.status === 'scadenza').length} in
            scadenza
          </span>
        </div>
      </Card>
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr',
            padding: '12px 22px',
            borderBottom: '1px solid var(--gray-100)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span>Documento</span>
          <span>Data</span>
          <span>Scadenza</span>
          <span style={{ textAlign: 'right' }}>Importo</span>
          <span style={{ textAlign: 'right' }}>Saldo</span>
          <span style={{ textAlign: 'center' }}>Stato</span>
        </div>
        {EXPOSITIONS.map((e, i) => (
          <div
            key={e.doc}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr',
              padding: '14px 22px',
              borderBottom:
                i < EXPOSITIONS.length - 1
                  ? '1px solid var(--gray-50)'
                  : 'none',
              alignItems: 'center',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(ev) =>
              (ev.currentTarget.style.background = 'var(--gray-50)')
            }
            onMouseLeave={(ev) =>
              (ev.currentTarget.style.background = 'transparent')
            }
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--dark)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            >
              {e.doc}
            </span>
            <span style={{ color: 'var(--gray-500)', fontSize: 12 }}>
              {e.date}
            </span>
            <span
              style={{
                color: e.status === 'scadenza' ? '#dc2626' : 'var(--gray-500)',
                fontSize: 12,
                fontWeight: e.status === 'scadenza' ? 600 : 400,
              }}
            >
              {e.due}
            </span>
            <span
              style={{
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              €{e.amount.toFixed(2)}
            </span>
            <span
              style={{
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              €{e.balance.toFixed(2)}
            </span>
            <span style={{ textAlign: 'center' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 5,
                  color: e.status === 'scadenza' ? '#dc2626' : '#2563eb',
                  background:
                    e.status === 'scadenza'
                      ? 'rgba(220,38,38,0.08)'
                      : 'rgba(37,99,235,0.08)',
                }}
              >
                {e.status === 'scadenza' ? 'Scadenza' : 'Aperto'}
              </span>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── DEADLINES VIEW ──────────────────────────────────────────────────────────

function DeadlinesView() {
  return (
    <Card>
      <SectionHeader title="Scadenziario" />
      <div>
        {DEADLINES.map((d, i) => (
          <div
            key={d.desc + d.date}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom:
                i < DEADLINES.length - 1 ? '1px solid var(--gray-50)' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'var(--gray-50)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background:
                    d.status === 'paid'
                      ? 'rgba(5,150,105,0.08)'
                      : 'rgba(37,99,235,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: d.status === 'paid' ? '#059669' : '#2563eb',
                }}
              >
                {d.status === 'paid' ? icons.check : icons.calendar}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--dark)',
                  }}
                >
                  {d.desc}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gray-400)',
                    marginTop: 2,
                  }}
                >
                  {d.date}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  color: d.status === 'paid' ? '#059669' : '#2563eb',
                  background:
                    d.status === 'paid'
                      ? 'rgba(5,150,105,0.08)'
                      : 'rgba(37,99,235,0.08)',
                }}
              >
                {d.status === 'paid' ? 'Pagata' : 'In scadenza'}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--dark)',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 90,
                  textAlign: 'right',
                }}
              >
                €{d.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── PASSWORD VIEW ───────────────────────────────────────────────────────────

function PasswordView() {
  return (
    <Card style={{ padding: '32px', maxWidth: 500 }}>
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--dark)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Cambia Password
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--gray-400)' }}>
        Aggiorna la tua password per mantenere il tuo account sicuro.
      </p>
      {['Password Attuale', 'Nuova Password', 'Conferma Nuova Password'].map(
        (label) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--gray-600)',
                marginBottom: 6,
                fontFamily: 'var(--font-body)',
              }}
            >
              {label}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: '1.5px solid var(--gray-200)',
                padding: '0 14px',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                background: 'var(--gray-50)',
                color: 'var(--dark)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--red)';
                e.target.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--gray-200)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        ),
      )}
      <button
        style={{
          height: 44,
          padding: '0 28px',
          borderRadius: 10,
          border: 'none',
          background: 'var(--dark)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--dark)')}
      >
        Aggiorna Password
      </button>
    </Card>
  );
}

// ─── PLACEHOLDER VIEW ────────────────────────────────────────────────────────

function PlaceholderView({ title }) {
  return (
    <Card style={{ padding: '60px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--dark)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>
        Questa sezione è in fase di sviluppo.
      </p>
    </Card>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function AreaUtente() {
  const [page, setPage] = useState('dashboard');
  const [searchFocused, setSearchFocused] = useState(false);

  const pageTitle =
    NAV_ITEMS.find((n) => n.id === page)?.label || 'Pannello di Controllo';

  const renderContent = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardView setPage={setPage} />;
      case 'account':
        return <AccountView />;
      case 'orders':
        return <OrdersView />;
      case 'documents':
        return <DocumentsView />;
      case 'exposition':
        return <ExpositionView />;
      case 'deadlines':
        return <DeadlinesView />;
      case 'password':
        return <PasswordView />;
      default:
        return <PlaceholderView title={pageTitle} />;
    }
  };

  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        background: '#f5f6f8',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Figtree:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        :root {
          --font-display: 'Outfit', sans-serif;
          --font-body: 'Figtree', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --red: #e63946;
          --green: #059669;
          --dark: #1a1d23;
          --gray-50: #f5f6f8;
          --gray-100: #eef0f3;
          --gray-200: #e2e5ea;
          --gray-400: #9aa1b0;
          --gray-500: #6b7280;
          --gray-600: #5a6070;
          --gray-900: #1a1d23;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>

      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          padding: '0 28px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          DFL
        </div>

        <div style={{ flex: 1, maxWidth: 500, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: searchFocused ? 'var(--red)' : 'var(--gray-400)',
              display: 'flex',
              transition: 'color 0.2s',
            }}
          >
            {icons.search}
          </div>
          <input
            type="text"
            placeholder="Cerca prodotti..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 10,
              border: searchFocused
                ? '2px solid var(--red)'
                : '1.5px solid var(--gray-200)',
              paddingLeft: 38,
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              color: 'var(--dark)',
              background: searchFocused ? '#fff' : 'var(--gray-50)',
              boxShadow: searchFocused
                ? '0 0 0 3px rgba(230,57,70,0.08)'
                : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 10,
            background: 'var(--dark)',
            color: '#fff',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {icons.cart}
          <div>
            <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>
              Carrello
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              €10.66
            </div>
          </div>
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              background: 'var(--red)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
            }}
          >
            1
          </span>
        </div>
      </header>

      {/* ─── BODY ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          maxWidth: 1400,
          margin: '0 auto',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
        <aside
          style={{
            width: 250,
            padding: '24px 16px',
            flexShrink: 0,
            background: '#fff',
            borderRight: '1px solid var(--gray-100)',
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* User card */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--dark), #374151)',
              borderRadius: 14,
              padding: '18px 16px',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                marginBottom: 10,
              }}
            >
              MR
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'var(--font-display)',
                marginBottom: 2,
              }}
            >
              {USER.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {USER.company}
            </div>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.15)',
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {USER.tier}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'var(--red)',
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {USER.discount}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flex: 1,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: active ? 'rgba(230,57,70,0.08)' : 'transparent',
                    color: active ? 'var(--red)' : 'var(--gray-600)',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--gray-50)';
                      e.currentTarget.style.color = 'var(--dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--gray-600)';
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>
                    {icons[item.icon]}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--gray-200)',
              background: '#fff',
              color: 'var(--gray-600)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#dc2626';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)';
              e.currentTarget.style.color = 'var(--gray-600)';
            }}
          >
            <span style={{ display: 'flex' }}>{icons.logout}</span>
            Esci
          </button>
        </aside>

        {/* ─── CONTENT ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: '28px 32px 60px', minWidth: 0 }}>
          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 22,
              fontSize: 12,
              color: 'var(--gray-400)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => setPage('dashboard')}
            >
              Area Utente
            </span>
            {page !== 'dashboard' && (
              <>
                {icons.chevronRight}
                <span style={{ color: 'var(--dark)', fontWeight: 600 }}>
                  {pageTitle}
                </span>
              </>
            )}
          </div>

          {/* Page Title */}
          <h1
            style={{
              margin: '0 0 24px',
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--dark)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              animation: 'fadeUp 0.3s ease both',
            }}
          >
            {pageTitle}
          </h1>

          {/* Content */}
          <div style={{ animation: 'fadeUp 0.35s ease 0.05s both' }}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
