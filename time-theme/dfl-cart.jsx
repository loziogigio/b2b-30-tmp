import { useState, useMemo } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const INITIAL_CART = [
  {
    id: '102180',
    name: 'Secchio per Muratore in PVC 2 Manici col. Nero',
    model: '2 manici ø mm 350',
    brand: 'Edilizia Pro',
    um: 'PZ',
    mv: 10,
    cf: 10,
    unitPrice: 1.18,
    listPrice: 2.37,
    qty: 10,
    promo: '-50%',
    emoji: '🪣',
    available: true,
  },
  {
    id: '9200430',
    name: "Detergente Spray 'Svitol Bike'",
    model: 'ml 500',
    brand: 'Arexons',
    um: 'PZ',
    mv: 1,
    cf: 12,
    unitPrice: 8.59,
    listPrice: 12.9,
    qty: 2,
    promo: '-33%',
    emoji: '🧴',
    available: true,
  },
  {
    id: 'SA0597',
    name: "Scarpe Antinfortunistica '7245NB'",
    model: 'Tg. 43',
    brand: 'Beta',
    um: 'PZ',
    mv: 1,
    cf: 1,
    unitPrice: 62.5,
    listPrice: 89.0,
    qty: 1,
    promo: '-30%',
    emoji: '👟',
    available: true,
  },
  {
    id: '8038700',
    name: 'Forno Portatile a Legna',
    model: 'Standard',
    brand: 'Clementi',
    um: 'PZ',
    mv: 1,
    cf: 1,
    unitPrice: 289.0,
    listPrice: null,
    qty: 1,
    promo: null,
    emoji: '🔥',
    available: false,
  },
];

const SAVED_CART = [
  {
    id: '5023100',
    name: 'Fulcron Cotto e Pietre Naturali',
    model: '1L',
    brand: 'Arexons',
    um: 'PZ',
    mv: 1,
    cf: 12,
    unitPrice: 6.8,
    listPrice: 9.9,
    qty: 6,
    promo: '-31%',
    emoji: '🧪',
    available: true,
  },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="7" y1="3" x2="7" y2="11" />
    <line x1="3" y1="7" x2="11" y2="7" />
  </svg>
);

const MinusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="3" y1="7" x2="11" y2="7" />
  </svg>
);

const ArrowRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
);

const ArrowLeft = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </svg>
);

const BookmarkIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const TruckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const PrinterIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CartIcon = () => (
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
);

const CheckCircle = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
);

const AlertIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── QTY CONTROL ─────────────────────────────────────────────────────────────

function QtyControl({ qty, setQty, mv = 1 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 10,
        border: '1.5px solid var(--gray-200)',
        overflow: 'hidden',
        height: 38,
        background: '#fff',
      }}
    >
      <button
        onClick={() => setQty(Math.max(mv, qty - mv))}
        style={{
          width: 34,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gray-500)',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-500)')}
      >
        <MinusIcon />
      </button>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(Math.max(mv, parseInt(e.target.value) || mv))}
        style={{
          width: 48,
          height: '100%',
          textAlign: 'center',
          border: 'none',
          borderLeft: '1px solid var(--gray-200)',
          borderRight: '1px solid var(--gray-200)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--dark)',
          outline: 'none',
          background: 'var(--gray-50)',
        }}
      />
      <button
        onClick={() => setQty(qty + mv)}
        style={{
          width: 34,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gray-500)',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-500)')}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

// ─── CART ROW ─────────────────────────────────────────────────────────────────

function CartRow({ item, onUpdateQty, onRemove, onSave, index }) {
  const lineTotal = item.unitPrice * item.qty;
  const discount = item.listPrice
    ? Math.round((1 - item.unitPrice / item.listPrice) * 100)
    : 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr 100px 140px 140px 100px 44px',
        gap: 16,
        alignItems: 'center',
        padding: '18px 0',
        borderBottom: '1px solid var(--gray-100)',
        animation: `fadeIn 0.35s ease ${index * 0.06}s both`,
        opacity: item.available ? 1 : 0.6,
      }}
    >
      {/* Image */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 10,
          background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        {item.emoji}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--red)',
              background: 'rgba(230,57,70,0.08)',
              padding: '2px 7px',
              borderRadius: 5,
            }}
          >
            {item.id}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {item.brand}
          </span>
        </div>
        <h4
          style={{
            margin: '0 0 3px',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--dark)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </h4>
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 10,
            color: 'var(--gray-400)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>Mod: {item.model}</span>
          <span>·</span>
          <span>UM: {item.um}</span>
          <span>MV: {item.mv}</span>
          <span>CF: {item.cf}</span>
        </div>
        {!item.available && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 6,
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 6,
            }}
          >
            <AlertIcon /> Non disponibile
          </div>
        )}
      </div>

      {/* Unit Price */}
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--dark)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          €{item.unitPrice.toFixed(2)}
        </div>
        {item.listPrice && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--gray-400)',
              textDecoration: 'line-through',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            €{item.listPrice.toFixed(2)}
          </div>
        )}
      </div>

      {/* Promo */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {item.promo ? (
          <span
            style={{
              background:
                discount >= 40
                  ? 'var(--red)'
                  : discount >= 25
                    ? '#f59e0b'
                    : '#6b7280',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            {item.promo}
          </span>
        ) : (
          <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>—</span>
        )}
      </div>

      {/* Quantity */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <QtyControl
          qty={item.qty}
          setQty={(q) => onUpdateQty(item.id, q)}
          mv={item.mv}
        />
      </div>

      {/* Line Total */}
      <div
        style={{
          textAlign: 'right',
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--dark)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        €{lineTotal.toFixed(2)}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => onSave(item.id)}
          title="Salva per dopo"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gray-400)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--gray-400)')
          }
        >
          <BookmarkIcon />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          title="Rimuovi"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gray-400)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--gray-400)')
          }
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const [items, setItems] = useState(INITIAL_CART);
  const [savedItems, setSavedItems] = useState(SAVED_CART);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryType, setDeliveryType] = useState('spedizione');
  const [deliveryDate, setDeliveryDate] = useState('2026-03-25');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const updateQty = (id, qty) =>
    setItems(items.map((i) => (i.id === id ? { ...i, qty } : i)));
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const saveItem = (id) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setSavedItems([...savedItems, item]);
      setItems(items.filter((i) => i.id !== id));
    }
  };
  const restoreItem = (id) => {
    const item = savedItems.find((i) => i.id === id);
    if (item) {
      setItems([...items, item]);
      setSavedItems(savedItems.filter((i) => i.id !== id));
    }
  };

  const availableItems = items.filter((i) => i.available);
  const unavailableItems = items.filter((i) => !i.available);

  const totals = useMemo(() => {
    const lordo = availableItems.reduce(
      (sum, i) => sum + (i.listPrice || i.unitPrice) * i.qty,
      0,
    );
    const netto = availableItems.reduce(
      (sum, i) => sum + i.unitPrice * i.qty,
      0,
    );
    const iva = netto * 0.22;
    const total = netto + iva;
    const savings = lordo - netto;
    return { lordo, netto, iva, total, savings };
  }, [availableItems]);

  const filteredItems = (activeTab === 'active' ? items : savedItems).filter(
    (i) =>
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.id.includes(searchQuery) ||
      i.brand.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        background: 'var(--gray-50)',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Figtree:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        :root {
          --font-display: 'Outfit', sans-serif;
          --font-body: 'Figtree', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --red: #e63946;
          --dark: #1a1d23;
          --gray-50: #f5f6f8;
          --gray-100: #eef0f3;
          --gray-200: #e2e5ea;
          --gray-400: #9aa1b0;
          --gray-500: #6b7280;
          --gray-600: #5a6070;
          --gray-900: #1a1d23;
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
        * { box-sizing: border-box; margin:0; padding:0; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input[type="number"] { -moz-appearance:textfield; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:4px; }
      `}</style>

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          padding: '0 32px',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
          }}
        >
          DFL
        </div>

        {/* Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--gray-400)',
          }}
        >
          <span style={{ cursor: 'pointer' }}>🏠</span>
          <span>›</span>
          <span style={{ cursor: 'pointer' }}>Carrello</span>
          <span>›</span>
          <span style={{ color: 'var(--dark)', fontWeight: 600 }}>
            Riepilogo
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          style={{
            height: 38,
            padding: '0 18px',
            borderRadius: 10,
            border: '1.5px solid var(--gray-200)',
            background: '#fff',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--gray-600)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
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
          <ArrowLeft /> Torna al Catalogo
        </button>

        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1.5px solid var(--gray-200)',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gray-500)',
          }}
        >
          <PrinterIcon />
        </button>
      </header>

      {/* ─── MAIN LAYOUT ────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '28px 32px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* ─── LEFT: CART ────────────────────────────────────────────── */}
        <div>
          {/* Title + tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: 'var(--dark)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 28 }}>🛒</span>
                Riepilogo Carrello
              </h1>
              <p
                style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}
              >
                {availableItems.length} articoli disponibili · {items.length}{' '}
                totali
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {items.length > 0 && (
                <button
                  onClick={() => {
                    setItems([]);
                  }}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1.5px solid rgba(230,57,70,0.3)',
                    background: 'rgba(230,57,70,0.04)',
                    color: 'var(--red)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(230,57,70,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(230,57,70,0.04)';
                  }}
                >
                  Svuota carrello
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '2px solid var(--gray-100)',
              marginBottom: 16,
            }}
          >
            {[
              { key: 'active', label: 'Carrello Attivo', count: items.length },
              {
                key: 'saved',
                label: 'Carrello Salvato',
                count: savedItems.length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.key
                      ? '2px solid var(--red)'
                      : '2px solid transparent',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color:
                    activeTab === tab.key ? 'var(--dark)' : 'var(--gray-500)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: -2,
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                <span
                  style={{
                    background:
                      activeTab === tab.key ? 'var(--red)' : 'var(--gray-100)',
                    color: activeTab === tab.key ? '#fff' : 'var(--gray-500)',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-400)',
                display: 'flex',
              }}
            >
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Cerca nel carrello..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: '1.5px solid var(--gray-200)',
                paddingLeft: 40,
                paddingRight: 16,
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                color: 'var(--dark)',
                background: '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--red)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
            />
          </div>

          {/* Cart content */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid var(--gray-100)',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr 100px 140px 140px 100px 44px',
                gap: 16,
                padding: '12px 20px',
                background: 'var(--gray-50)',
                borderBottom: '1px solid var(--gray-100)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span></span>
              <span>Articolo</span>
              <span style={{ textAlign: 'right' }}>Prezzo Unit.</span>
              <span style={{ textAlign: 'center' }}>Promo</span>
              <span style={{ textAlign: 'center' }}>Quantità</span>
              <span style={{ textAlign: 'right' }}>Totale</span>
              <span></span>
            </div>

            {/* Items */}
            <div style={{ padding: '0 20px' }}>
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'var(--gray-400)',
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>
                    {activeTab === 'active' ? '🛒' : '📌'}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                    }}
                  >
                    {activeTab === 'active'
                      ? 'Il carrello è vuoto'
                      : 'Nessun articolo salvato'}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {activeTab === 'active'
                      ? 'Aggiungi prodotti dal catalogo'
                      : 'Salva articoli per acquistarli più tardi'}
                  </div>
                </div>
              ) : activeTab === 'active' ? (
                filteredItems.map((item, i) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    index={i}
                    onUpdateQty={updateQty}
                    onRemove={removeItem}
                    onSave={saveItem}
                  />
                ))
              ) : (
                filteredItems.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '64px 1fr 100px auto',
                      gap: 16,
                      alignItems: 'center',
                      padding: '16px 0',
                      borderBottom: '1px solid var(--gray-100)',
                      animation: `fadeIn 0.35s ease ${i * 0.06}s both`,
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 10,
                        background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                      }}
                    >
                      {item.emoji}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--dark)',
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--gray-400)',
                          marginTop: 2,
                        }}
                      >
                        {item.brand} · {item.id}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        €{item.unitPrice.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        × {item.qty}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreItem(item.id)}
                      style={{
                        height: 36,
                        padding: '0 16px',
                        borderRadius: 8,
                        border: '1.5px solid var(--gray-200)',
                        background: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--dark)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--red)';
                        e.currentTarget.style.color = 'var(--red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gray-200)';
                        e.currentTarget.style.color = 'var(--dark)';
                      }}
                    >
                      + Aggiungi al carrello
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Continue button */}
            {activeTab === 'active' && items.length > 0 && (
              <div
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--gray-100)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--red)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--dark)')
                  }
                >
                  <ArrowLeft /> Continua Ordine
                </button>
              </div>
            )}
          </div>

          {/* Unavailable warning */}
          {unavailableItems.length > 0 && activeTab === 'active' && (
            <div
              style={{
                marginTop: 16,
                padding: '14px 18px',
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: '#991b1b',
              }}
            >
              <AlertIcon />
              <span>
                <strong>
                  {unavailableItems.length} articol
                  {unavailableItems.length > 1 ? 'i' : 'o'}
                </strong>{' '}
                non disponibil{unavailableItems.length > 1 ? 'i' : 'e'} —{' '}
                {unavailableItems.length > 1
                  ? 'non saranno inclusi'
                  : 'non sarà incluso'}{' '}
                nell'ordine.
              </span>
            </div>
          )}
        </div>

        {/* ─── RIGHT: ORDER SUMMARY ──────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 96 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid var(--gray-100)',
              overflow: 'hidden',
              animation: 'slideUp 0.5s ease both',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid var(--gray-100)',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--dark)',
                  fontFamily: 'var(--font-display)',
                  marginBottom: 4,
                }}
              >
                Dettagli Ordine
              </h3>
              <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                Completa il tuo acquisto
              </p>
            </div>

            {/* Fields */}
            <div
              style={{
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Azienda */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gray-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  Nome Azienda
                </label>
                <div
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: '1.5px solid var(--gray-200)',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--dark)',
                    background: 'var(--gray-50)',
                  }}
                >
                  DFL Listino VEND 1 – Sconto 50%
                </div>
              </div>

              {/* Tipo consegna */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gray-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  Tipo di Consegna
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    {
                      value: 'spedizione',
                      label: 'Spedizione',
                      icon: <TruckIcon />,
                    },
                    { value: 'ritiro', label: 'Ritiro', icon: <ShieldIcon /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDeliveryType(opt.value)}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 10,
                        border:
                          deliveryType === opt.value
                            ? '2px solid var(--dark)'
                            : '1.5px solid var(--gray-200)',
                        background:
                          deliveryType === opt.value ? 'var(--dark)' : '#fff',
                        color:
                          deliveryType === opt.value
                            ? '#fff'
                            : 'var(--gray-600)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gray-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  Data di{' '}
                  {deliveryType === 'spedizione' ? 'Spedizione' : 'Ritiro'}
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: 42,
                    borderRadius: 10,
                    border: '1.5px solid var(--gray-200)',
                    padding: '0 14px',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--dark)',
                    outline: 'none',
                    background: '#fff',
                  }}
                />
              </div>

              {/* Indirizzo */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gray-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  Indirizzo
                </label>
                <div
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: '1.5px solid var(--gray-200)',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 13,
                    color: 'var(--dark)',
                    background: 'var(--gray-50)',
                  }}
                >
                  Sala Consilina – Via Fieghi, 1
                </div>
              </div>

              {/* Note */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gray-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                    display: 'block',
                  }}
                >
                  Note ordine (opzionale)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eventuali note..."
                  rows={2}
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1.5px solid var(--gray-200)',
                    padding: '10px 14px',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--dark)',
                    outline: 'none',
                    resize: 'vertical',
                    background: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--red)')}
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'var(--gray-200)')
                  }
                />
              </div>
            </div>

            {/* Totals */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--gray-100)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {[
                { label: 'Totale lordo', value: totals.lordo, strike: true },
                { label: 'Totale netto', value: totals.netto },
                { label: 'IVA (22%)', value: totals.iva },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                    color: 'var(--gray-600)',
                  }}
                >
                  <span>{row.label}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      textDecoration: row.strike ? 'line-through' : 'none',
                      color: row.strike ? 'var(--gray-400)' : 'var(--dark)',
                    }}
                  >
                    €{row.value.toFixed(2)}
                  </span>
                </div>
              ))}

              {totals.savings > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    color: '#059669',
                    background: '#f0fdf4',
                    padding: '6px 10px',
                    borderRadius: 8,
                    marginTop: 2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>💰 Risparmi</span>
                  <span style={{ fontWeight: 700 }}>
                    −€{totals.savings.toFixed(2)}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 12,
                  borderTop: '2px solid var(--gray-100)',
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--dark)',
                  }}
                >
                  Totale
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: 'var(--dark)',
                    fontFamily: 'var(--font-display)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  €{totals.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding: '0 24px 24px' }}>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={availableItems.length === 0}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  border: 'none',
                  background:
                    availableItems.length === 0
                      ? 'var(--gray-200)'
                      : 'var(--dark)',
                  color:
                    availableItems.length === 0 ? 'var(--gray-400)' : '#fff',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: availableItems.length > 0 ? 'pointer' : 'default',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'all 0.25s',
                  boxShadow:
                    availableItems.length > 0
                      ? '0 4px 16px rgba(26,29,35,0.2)'
                      : 'none',
                }}
                onMouseEnter={(e) => {
                  if (availableItems.length > 0) {
                    e.currentTarget.style.background = 'var(--red)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 20px rgba(230,57,70,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (availableItems.length > 0) {
                    e.currentTarget.style.background = 'var(--dark)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 16px rgba(26,29,35,0.2)';
                  }
                }}
              >
                Completa Ordine <ArrowRight />
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 12,
                  fontSize: 11,
                  color: 'var(--gray-400)',
                }}
              >
                <ShieldIcon /> Transazione sicura e protetta
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONFIRMATION OVERLAY ────────────────────────────────────── */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '40px 48px',
              maxWidth: 440,
              width: '90%',
              textAlign: 'center',
              animation: 'slideUp 0.3s ease both',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#059669',
              }}
            >
              <CheckCircle />
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
                marginBottom: 8,
              }}
            >
              Confermi l'ordine?
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--gray-500)',
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {availableItems.length} articol
              {availableItems.length > 1 ? 'i' : 'o'} per un totale di
            </p>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
                marginBottom: 24,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              €{totals.total.toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: '1.5px solid var(--gray-200)',
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--gray-600)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Annulla
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 16px rgba(230,57,70,0.25)',
                }}
              >
                Conferma ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
