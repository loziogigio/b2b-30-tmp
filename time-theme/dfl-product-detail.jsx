import { useState, useRef, useEffect } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const PRODUCT = {
  id: '6130057',
  codFigura: 'TL0884',
  sku: '6130057',
  name: "Set da Giardino Polipropilene 'Rosalie Lounge'",
  brand: 'Keter',
  model: 'colore bianco',
  weight: '35.0 kg',
  volume: '453600 CM3',
  category: 'Giardinaggio',
  categoryPath: ['Home', 'Per la Casa', 'Giardinaggio', 'Set da Giardino'],
  description:
    'Realizzato interamente in polipropilene ad effetto rattan, resistente agli agenti atmosferici e raggi UV. Dal design moderno ed elegante, risulta essere un giusto compromesso per chi desidera un prodotto robusto, piacevole e che duri nel tempo. Composto da un tavolo rettangolare cm. 60x55x39, un divano cm. 113x65x74, due sedie cm. 65x63x74. Con cuscini in policotone.',
  features: [
    'Polipropilene effetto rattan resistente UV',
    'Design moderno ed elegante',
    'Tavolo rettangolare 60×55×39 cm',
    'Divano 113×65×74 cm',
    '2 Sedie 65×63×74 cm',
    'Cuscini in policotone inclusi',
    'Resistente agli agenti atmosferici',
    'Montaggio facile senza attrezzi',
  ],
  specs: [
    { label: 'Modello', value: 'colore bianco' },
    { label: 'Marca', value: 'Keter' },
    { label: 'Materiale', value: 'Polipropilene' },
    { label: 'Finitura', value: 'Effetto rattan' },
    { label: 'Peso', value: '35.0 kg' },
    { label: 'Volume', value: '453600 CM3' },
    { label: 'Tavolo', value: '60×55×39 cm' },
    { label: 'Divano', value: '113×65×74 cm' },
    { label: 'Sedie', value: '65×63×74 cm (×2)' },
    { label: 'Cuscini', value: 'Policotone, inclusi' },
    { label: 'Resistenza UV', value: 'Sì' },
    { label: 'Uso esterno', value: 'Sì' },
  ],
  um: 'CF',
  mv: 1,
  cf: 1,
  listPrice: 414.34,
  price: 186.45,
  promoLabel: 'DISCOUNT',
  promoDiscount: '-50% -10%',
  promoExpiry: '31/12/2026',
  available: true,
  images: ['🪑', '🛋️', '☕', '📐'],
  imageLabels: ['Set completo', 'Divano', 'Dettaglio', 'Dimensioni'],
};

const SIMILAR_PRODUCTS = [
  {
    id: '6130058',
    name: "Set Giardino 'Corona Lounge'",
    brand: 'Keter',
    price: 210.0,
    oldPrice: 480.0,
    emoji: '🪑',
    promo: '-56%',
    available: true,
  },
  {
    id: '6130042',
    name: "Set Giardino 'Corfu' 4pz",
    brand: 'Keter',
    price: 165.0,
    oldPrice: 350.0,
    emoji: '🛋️',
    promo: '-53%',
    available: true,
  },
  {
    id: '6130090',
    name: "Divano 2 Posti 'Malibu'",
    brand: 'Keter',
    price: 89.9,
    oldPrice: 180.0,
    emoji: '🛋️',
    promo: '-50%',
    available: true,
  },
  {
    id: '7041500',
    name: 'Set Bistrot Metallo 3pz',
    brand: 'Bama',
    price: 75.0,
    oldPrice: 120.0,
    emoji: '🪑',
    promo: '-38%',
    available: false,
  },
  {
    id: '6130100',
    name: "Poltrona 'Iowa' Rattan",
    brand: 'Keter',
    price: 52.0,
    oldPrice: 95.0,
    emoji: '💺',
    promo: '-45%',
    available: true,
  },
  {
    id: '6130110',
    name: "Tavolino 'Luzon' Rattan",
    brand: 'Keter',
    price: 34.0,
    oldPrice: 65.0,
    emoji: '☕',
    promo: '-48%',
    available: true,
  },
];

const BOUGHT_TOGETHER = [
  {
    id: '7906570',
    name: "Borsa Termica 'Active' 24L",
    brand: "Gio'Style",
    price: 15.4,
    oldPrice: 22.0,
    emoji: '🧊',
  },
  {
    id: '6129500',
    name: 'Copertura Set Giardino 200×160',
    brand: 'Verdemax',
    price: 24.9,
    oldPrice: 35.0,
    emoji: '🛡️',
  },
  {
    id: '8302175',
    name: 'Lanterna LED da Giardino',
    brand: 'Active',
    price: 12.9,
    oldPrice: 18.5,
    emoji: '🏮',
  },
  {
    id: '7041310',
    name: 'Irrigatore Oscillante Aqua',
    brand: 'Gardena',
    price: 28.9,
    oldPrice: null,
    emoji: '💧',
  },
];

const RECENTLY_BOUGHT = [
  {
    id: '5023100',
    name: 'Fulcron Cotto e Pietre',
    brand: 'Arexons',
    price: 6.8,
    date: '18 Mar',
    emoji: '🧪',
  },
  {
    id: 'UE0519',
    name: 'Olio Lubrificante WD-40',
    brand: 'WD-40',
    price: 6.8,
    date: '14 Mar',
    emoji: '🛢️',
  },
  {
    id: 'SA0597',
    name: "Scarpe Antinf. '7245NB'",
    brand: 'Beta',
    price: 62.5,
    date: '10 Mar',
    emoji: '👟',
  },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────

const icons = {
  arrowRight: (
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
  ),
  arrowLeft: (
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
  ),
  plus: (
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
  ),
  minus: (
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
  ),
  heart: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  heartFilled: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  share: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  print: (
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
  ),
  truck: (
    <svg
      width="18"
      height="18"
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
  ),
  shield: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  check: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="2,7 5.5,10.5 12,4" />
    </svg>
  ),
  cart: (
    <svg
      width="20"
      height="20"
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
  chevLeft: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="15,18 9,12 15,6" />
    </svg>
  ),
  chevRight: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="9,6 15,12 9,18" />
    </svg>
  ),
  copy: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  tag: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  clock: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  star: (f) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={f ? '#f59e0b' : 'none'}
      stroke={f ? '#f59e0b' : '#d1d5db'}
      strokeWidth="2"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  ),
  zap: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  ),
  users: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  box: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

// ─── QTY CONTROL ─────────────────────────────────────────────────────────────

function QtyControl({ qty, setQty, mv = 1, large }) {
  const h = large ? 50 : 36;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: large ? 12 : 10,
        border: '1.5px solid var(--gray-200)',
        overflow: 'hidden',
        height: h,
        background: '#fff',
      }}
    >
      <button
        onClick={() => setQty(Math.max(0, qty - mv))}
        style={{
          width: large ? 46 : 34,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gray-500)',
          transition: 'all 0.15s',
        }}
      >
        {icons.minus}
      </button>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: large ? 64 : 44,
          height: '100%',
          textAlign: 'center',
          border: 'none',
          borderLeft: '1px solid var(--gray-200)',
          borderRight: '1px solid var(--gray-200)',
          fontFamily: 'var(--font-body)',
          fontSize: large ? 16 : 13,
          fontWeight: 700,
          color: 'var(--dark)',
          outline: 'none',
          background: 'var(--gray-50)',
        }}
      />
      <button
        onClick={() => setQty(qty + mv)}
        style={{
          width: large ? 46 : 34,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gray-500)',
          transition: 'all 0.15s',
        }}
      >
        {icons.plus}
      </button>
    </div>
  );
}

// ─── HORIZONTAL CAROUSEL ─────────────────────────────────────────────────────

function Carousel({ title, tag, tagColor, children, count }) {
  const ref = useRef(null);
  const scroll = (d) =>
    ref.current?.scrollBy({ left: d * 280, behavior: 'smooth' });
  return (
    <section style={{ marginBottom: 48 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tag && (
            <span
              style={{
                background: tagColor || 'var(--dark)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {tag}
            </span>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--dark)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h2>
          {count && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--gray-400)',
                fontWeight: 500,
              }}
            >
              ({count})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => scroll(-1)} style={navBtnStyle}>
            {icons.chevLeft}
          </button>
          <button onClick={() => scroll(1)} style={navBtnStyle}>
            {icons.chevRight}
          </button>
        </div>
      </div>
      <div
        ref={ref}
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: 6,
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </div>
    </section>
  );
}

const navBtnStyle = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: '1.5px solid var(--gray-200)',
  background: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--gray-500)',
  transition: 'all 0.15s',
};

// ─── MINI PRODUCT CARD ───────────────────────────────────────────────────────

function MiniCard({ p, i, showPrice = true, extra }) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <div
      style={{
        minWidth: 200,
        maxWidth: 200,
        scrollSnapAlign: 'start',
        flexShrink: 0,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid var(--gray-100)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s',
        animation: `fadeUp 0.35s ease ${(i || 0) * 0.05}s both`,
        opacity: p.available === false ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.07)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div
        style={{
          height: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
          fontSize: 44,
          position: 'relative',
        }}
      >
        {p.emoji}
        {p.promo && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'var(--red)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 5,
            }}
          >
            {p.promo}
          </span>
        )}
        {p.available === false && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                background: 'var(--dark)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 5,
              }}
            >
              Non disponibile
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 3,
          }}
        >
          {p.brand}
        </div>
        <h4
          style={{
            margin: '0 0 6px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--dark)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {p.name}
        </h4>
        {showPrice && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--dark)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              €{p.price.toFixed(2)}
            </span>
            {p.oldPrice && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--gray-400)',
                  textDecoration: 'line-through',
                }}
              >
                €{p.oldPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}
        {extra}
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(0);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('desc');
  const [bundleItems, setBundleItems] = useState([true, true, true, true]);
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const p = PRODUCT;
  const discount = Math.round((1 - p.price / p.listPrice) * 100);

  const bundleTotal =
    BOUGHT_TOGETHER.reduce(
      (s, item, i) => s + (bundleItems[i] ? item.price : 0),
      0,
    ) + (qty > 0 ? p.price : 0);
  const bundleOldTotal =
    BOUGHT_TOGETHER.reduce(
      (s, item, i) => s + (bundleItems[i] ? item.oldPrice || item.price : 0),
      0,
    ) + (qty > 0 ? p.listPrice : 0);
  const bundleSavings = bundleOldTotal - bundleTotal;
  const selectedBundleCount =
    bundleItems.filter(Boolean).length + (qty > 0 ? 1 : 0);

  const handleAddToCart = () => {
    if (qty === 0) return;
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pop { 0% { transform:scale(1); } 50% { transform:scale(1.15); } 100% { transform:scale(1); } }
        * { box-sizing:border-box; margin:0; padding:0; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; }
        input[type="number"] { -moz-appearance:textfield; }
        ::-webkit-scrollbar { height:4px; width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:4px; }
      `}</style>

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top row: logo + search + actions */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            DFL
          </div>

          {/* Search bar */}
          <div style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
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
              {icons.search}
            </div>
            <input
              type="text"
              placeholder="Cerca prodotti, codici, marchi..."
              style={{
                width: '100%',
                height: 42,
                borderRadius: 11,
                border: '1.5px solid var(--gray-200)',
                paddingLeft: 42,
                paddingRight: 16,
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                color: 'var(--dark)',
                background: 'var(--gray-50)',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--red)';
                e.target.style.background = '#fff';
                e.target.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--gray-200)';
                e.target.style.background = 'var(--gray-50)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['Nuovi Inserimenti', 'Tutte le Offerte ★'].map((label, i) => (
              <button
                key={label}
                style={{
                  padding: '6px 13px',
                  borderRadius: 8,
                  border: i === 1 ? 'none' : '1.5px solid var(--gray-200)',
                  background: i === 1 ? 'var(--red)' : '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  color: i === 1 ? '#fff' : 'var(--gray-600)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 9,
              border: '1.5px solid var(--gray-200)',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gray-600)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-body)',
              flexShrink: 0,
            }}
          >
            {icons.arrowLeft} Indietro
          </button>

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
              flexShrink: 0,
            }}
          >
            {icons.cart}
            <span style={{ fontSize: 14, fontWeight: 800 }}>€11.85</span>
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                background: 'var(--red)',
                color: '#fff',
                fontSize: 9,
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
        </div>

        {/* Bottom row: breadcrumb */}
        <div
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--gray-400)',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          {p.categoryPath.map((c, i) => (
            <span
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {i > 0 && <span style={{ color: 'var(--gray-200)' }}>›</span>}
              <span
                style={{
                  cursor: 'pointer',
                  color:
                    i === p.categoryPath.length - 1
                      ? 'var(--dark)'
                      : 'var(--gray-400)',
                  fontWeight: i === p.categoryPath.length - 1 ? 600 : 400,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (i < p.categoryPath.length - 1)
                    e.currentTarget.style.color = 'var(--red)';
                }}
                onMouseLeave={(e) => {
                  if (i < p.categoryPath.length - 1)
                    e.currentTarget.style.color = 'var(--gray-400)';
                }}
              >
                {c}
              </span>
            </span>
          ))}
        </div>
      </header>

      <main
        style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 60px' }}
      >
        {/* ═══════════════════════════════════════════════════════════════
            PRODUCT HERO
            ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '520px 1fr',
            gap: 40,
            marginBottom: 48,
            animation: 'fadeUp 0.4s ease both',
          }}
        >
          {/* ─── IMAGE GALLERY ──────────────────────────────────────── */}
          <div>
            {/* Main image */}
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
                height: 420,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 140,
                position: 'relative',
                marginBottom: 12,
                border: '1px solid var(--gray-100)',
              }}
            >
              {p.images[activeImage]}
              {/* Promo badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    background: 'var(--red)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  −{discount}%
                </span>
                <span
                  style={{
                    background: 'var(--dark)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {p.promoLabel}
                </span>
              </div>
              {/* Nav arrows */}
              <button
                onClick={() =>
                  setActiveImage(
                    (activeImage - 1 + p.images.length) % p.images.length,
                  )
                }
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...navBtnStyle,
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {icons.chevLeft}
              </button>
              <button
                onClick={() =>
                  setActiveImage((activeImage + 1) % p.images.length)
                }
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...navBtnStyle,
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {icons.chevRight}
              </button>
            </div>
            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: 8 }}>
              {p.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    border:
                      activeImage === i
                        ? '2px solid var(--red)'
                        : '1.5px solid var(--gray-200)',
                    background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    boxShadow:
                      activeImage === i
                        ? '0 0 0 3px rgba(230,57,70,0.15)'
                        : 'none',
                  }}
                >
                  {img}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  color: 'var(--gray-400)',
                }}
              >
                {p.imageLabels[activeImage]}
              </div>
            </div>
          </div>

          {/* ─── PRODUCT INFO ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Brand + codes */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.05em',
                }}
              >
                {p.brand.toUpperCase()}
              </span>
              <span
                style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  color: 'var(--gray-600)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
                onClick={handleCopy}
              >
                {p.id} {copied ? icons.check : icons.copy}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--gray-400)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Fig: {p.codFigura}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--dark)',
                lineHeight: 1.2,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.03em',
                marginBottom: 12,
              }}
            >
              {p.name}
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: 14,
                color: 'var(--gray-600)',
                lineHeight: 1.65,
                marginBottom: 20,
                maxWidth: 560,
              }}
            >
              {p.description}
            </p>

            {/* Quick specs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
                marginBottom: 20,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-100)',
              }}
            >
              {[
                { l: 'Modello', v: p.model },
                { l: 'Peso', v: p.weight },
                { l: 'Volume', v: p.volume },
                {
                  l: 'Stato',
                  v: p.available ? 'Disponibile' : 'Non disponibile',
                  color: p.available ? '#059669' : '#dc2626',
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--gray-400)',
                      fontWeight: 500,
                    }}
                  >
                    {s.l}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: s.color || 'var(--dark)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {s.l === 'Stato' && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: s.color,
                        }}
                      />
                    )}
                    {s.v}
                  </span>
                </div>
              ))}
            </div>

            {/* ─── PRICING BLOCK ───────────────────────────────────── */}
            <div
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '2px solid var(--gray-100)',
                background: '#fff',
                marginBottom: 16,
              }}
            >
              {/* Listino */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--gray-400)',
                    fontWeight: 500,
                  }}
                >
                  Listino
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--gray-400)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  UM: {p.um} · MV: {p.mv} · CF: {p.cf}
                </span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: 'var(--gray-400)',
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums',
                  marginBottom: 8,
                }}
              >
                €{p.listPrice.toFixed(2)}
              </div>

              {/* Promo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(230,57,70,0.04)',
                  border: '1px solid rgba(230,57,70,0.15)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {icons.tag}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--red)',
                    }}
                  >
                    {p.promoLabel}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--gray-600)',
                  }}
                >
                  {p.promoDiscount}
                </span>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--red)',
                  }}
                >
                  {icons.clock} Scade {p.promoExpiry}
                </span>
              </div>

              {/* Price */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    color: 'var(--dark)',
                    fontFamily: 'var(--font-display)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  €{p.price.toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#059669',
                    background: '#f0fdf4',
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  Risparmi €{(p.listPrice - p.price).toFixed(2)}
                </span>
              </div>

              {/* Add to cart */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <QtyControl qty={qty} setQty={setQty} mv={p.mv} large />
                <button
                  onClick={handleAddToCart}
                  disabled={qty === 0}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 12,
                    border: 'none',
                    background: addedToCart
                      ? '#059669'
                      : qty === 0
                        ? 'var(--gray-200)'
                        : 'var(--dark)',
                    color: qty === 0 ? 'var(--gray-400)' : '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: qty > 0 ? 'pointer' : 'default',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.25s',
                    boxShadow:
                      qty > 0 && !addedToCart
                        ? '0 4px 16px rgba(26,29,35,0.2)'
                        : 'none',
                    animation: addedToCart ? 'pop 0.3s ease' : 'none',
                  }}
                >
                  {addedToCart ? (
                    <>{icons.check} Aggiunto!</>
                  ) : (
                    <>+ Aggiungi al Carrello</>
                  )}
                </button>
              </div>
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                {
                  icon: liked ? icons.heartFilled : icons.heart,
                  label: 'Salva',
                  color: liked ? 'var(--red)' : 'var(--gray-600)',
                  onClick: () => setLiked(!liked),
                },
                {
                  icon: icons.share,
                  label: 'Condividi',
                  color: 'var(--gray-600)',
                },
                {
                  icon: icons.print,
                  label: 'Stampa',
                  color: 'var(--gray-600)',
                },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 9,
                    border: '1.5px solid var(--gray-200)',
                    background: '#fff',
                    color: a.color,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>

            {/* Trust badges */}
            <div
              style={{
                display: 'flex',
                gap: 20,
                marginTop: 20,
                padding: '14px 0',
                borderTop: '1px solid var(--gray-100)',
              }}
            >
              {[
                { icon: icons.truck, label: 'Consegna 2-4 giorni' },
                { icon: icons.shield, label: 'Reso 30 giorni' },
                { icon: icons.box, label: 'Garanzia inclusa' },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 11,
                    color: 'var(--gray-500)',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: 'var(--gray-400)' }}>{b.icon}</span>
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FREQUENTLY BOUGHT TOGETHER
            ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid var(--gray-100)',
            padding: '24px 28px',
            marginBottom: 48,
            animation: 'fadeUp 0.4s ease 0.1s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 20 }}>⚡</span>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              Acquistati Insieme Frequentemente
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Main product */}
            <div
              style={{
                width: 160,
                padding: '14px',
                borderRadius: 12,
                border: '2px solid var(--red)',
                background: 'rgba(230,57,70,0.03)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>{p.images[0]}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.name.slice(0, 25)}...
              </div>
              <div
                style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}
              >
                €{p.price.toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--gray-400)',
                  marginTop: 2,
                  fontWeight: 600,
                }}
              >
                QUESTO PRODOTTO
              </div>
            </div>

            {BOUGHT_TOGETHER.map((item, i) => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span
                  style={{
                    fontSize: 20,
                    color: 'var(--gray-300)',
                    fontWeight: 300,
                  }}
                >
                  +
                </span>
                <label
                  style={{
                    width: 160,
                    padding: '14px',
                    borderRadius: 12,
                    border: bundleItems[i]
                      ? '2px solid var(--dark)'
                      : '1.5px solid var(--gray-200)',
                    background: bundleItems[i] ? 'rgba(26,29,35,0.02)' : '#fff',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: bundleItems[i] ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={bundleItems[i]}
                    onChange={() => {
                      const n = [...bundleItems];
                      n[i] = !n[i];
                      setBundleItems(n);
                    }}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: 36, marginBottom: 6 }}>
                    {item.emoji}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--dark)',
                      marginBottom: 3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name.slice(0, 22)}...
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: 'var(--dark)',
                      }}
                    >
                      €{item.price.toFixed(2)}
                    </span>
                    {item.oldPrice && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--gray-400)',
                          textDecoration: 'line-through',
                        }}
                      >
                        €{item.oldPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </label>
              </div>
            ))}

            {/* Bundle total */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginLeft: 8,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  color: 'var(--gray-300)',
                  fontWeight: 300,
                }}
              >
                =
              </span>
              <div
                style={{
                  padding: '16px 22px',
                  borderRadius: 12,
                  background: 'var(--dark)',
                  color: '#fff',
                  textAlign: 'center',
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.6,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  {selectedBundleCount} prodott
                  {selectedBundleCount === 1 ? 'o' : 'i'} selezionat
                  {selectedBundleCount === 1 ? 'o' : 'i'}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  €{bundleTotal.toFixed(2)}
                </div>
                {bundleSavings > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#86efac',
                      fontWeight: 600,
                      marginTop: 4,
                    }}
                  >
                    Risparmi €{bundleSavings.toFixed(2)}
                  </div>
                )}
                <button
                  style={{
                    marginTop: 10,
                    width: '100%',
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--red)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s',
                  }}
                >
                  Aggiungi tutti
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TABS: DESCRIPTION / SPECS / SHIPPING
            ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid var(--gray-100)',
            overflow: 'hidden',
            marginBottom: 48,
            animation: 'fadeUp 0.4s ease 0.15s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '2px solid var(--gray-100)',
            }}
          >
            {[
              { key: 'desc', label: 'Caratteristiche' },
              { key: 'specs', label: 'Specifiche Tecniche' },
              { key: 'shipping', label: 'Spedizione e Resi' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '14px 24px',
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
                  marginBottom: -2,
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {activeTab === 'desc' && (
              <div>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--gray-600)',
                    lineHeight: 1.7,
                    marginBottom: 20,
                    maxWidth: 700,
                  }}
                >
                  {p.description}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 24px',
                  }}
                >
                  {p.features.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                        color: 'var(--gray-600)',
                        padding: '8px 0',
                      }}
                    >
                      <span style={{ color: '#059669', flexShrink: 0 }}>
                        {icons.check}
                      </span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'specs' && (
              <div style={{ maxWidth: 600 }}>
                {p.specs.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom:
                        i < p.specs.length - 1
                          ? '1px solid var(--gray-100)'
                          : 'none',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--dark)' }}>
                      {s.label}
                    </span>
                    <span style={{ color: 'var(--gray-600)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'shipping' && (
              <div
                style={{
                  maxWidth: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {[
                  {
                    icon: icons.truck,
                    title: 'Spedizione',
                    desc: 'Consegna in 2-4 giorni lavorativi. Spedizione gratuita per ordini superiori a €250.',
                  },
                  {
                    icon: icons.shield,
                    title: 'Resi',
                    desc: 'Reso gratuito entro 30 giorni dalla consegna. Il prodotto deve essere integro e nella confezione originale.',
                  },
                  {
                    icon: icons.box,
                    title: 'Garanzia',
                    desc: 'Garanzia del produttore inclusa. Per prodotti professionali, estensione garanzia disponibile.',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 14,
                      padding: '16px 18px',
                      borderRadius: 12,
                      background: 'var(--gray-50)',
                      border: '1px solid var(--gray-100)',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--gray-400)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--dark)',
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--gray-500)',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RECENTLY BOUGHT BY YOU
            ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid var(--gray-100)',
            padding: '20px 24px',
            marginBottom: 48,
            animation: 'fadeUp 0.4s ease 0.2s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {icons.clock}
            <h3
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--dark)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Acquistati di Recente
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {RECENTLY_BOUGHT.map((item, i) => (
              <div
                key={item.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--gray-100)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  animation: `fadeUp 0.3s ease ${0.25 + i * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.boxShadow =
                    '0 2px 12px rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-100)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {item.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--dark)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                    {item.brand} · {item.date}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--dark)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    €{item.price.toFixed(2)}
                  </div>
                  <button
                    style={{
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--red)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Riordina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SIMILAR PRODUCTS CAROUSEL
            ═══════════════════════════════════════════════════════════════ */}
        <Carousel
          title="Prodotti Simili"
          tag="Consigliati"
          tagColor="#2563eb"
          count={SIMILAR_PRODUCTS.length}
        >
          {SIMILAR_PRODUCTS.map((prod, i) => (
            <MiniCard key={prod.id} p={prod} i={i} />
          ))}
        </Carousel>

        {/* ═══════════════════════════════════════════════════════════════
            ALSO BOUGHT BY OTHER CUSTOMERS
            ═══════════════════════════════════════════════════════════════ */}
        <Carousel
          title="Altri Clienti Hanno Acquistato"
          tag="Popolare"
          tagColor="#7c3aed"
          count={BOUGHT_TOGETHER.length}
        >
          {BOUGHT_TOGETHER.map((prod, i) => (
            <MiniCard key={prod.id} p={prod} i={i} />
          ))}
        </Carousel>
      </main>

      {/* ─── STICKY BOTTOM BAR (mobile-feel) ─────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--gray-100)',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{p.images[0]}</span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--dark)',
                maxWidth: 200,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
              {p.brand} · {p.id}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: 'var(--dark)',
              fontFamily: 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            €{p.price.toFixed(2)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--gray-400)',
              textDecoration: 'line-through',
            }}
          >
            €{p.listPrice.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
            −{discount}%
          </span>
        </div>
        <QtyControl qty={qty} setQty={setQty} mv={p.mv} />
        <button
          onClick={handleAddToCart}
          disabled={qty === 0}
          style={{
            height: 44,
            padding: '0 28px',
            borderRadius: 11,
            border: 'none',
            background: addedToCart
              ? '#059669'
              : qty === 0
                ? 'var(--gray-200)'
                : 'var(--dark)',
            color: qty === 0 ? 'var(--gray-400)' : '#fff',
            fontSize: 14,
            fontWeight: 800,
            cursor: qty > 0 ? 'pointer' : 'default',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.25s',
            animation: addedToCart ? 'pop 0.3s ease' : 'none',
            boxShadow:
              qty > 0 && !addedToCart
                ? '0 4px 16px rgba(26,29,35,0.2)'
                : 'none',
          }}
        >
          {addedToCart ? <>{icons.check} Aggiunto!</> : <>+ Carrello</>}
        </button>
      </div>

      {/* spacing for sticky bar */}
      <div style={{ height: 70 }} />
    </div>
  );
}
