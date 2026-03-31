import { useState, useEffect, useRef } from 'react';

const PRODUCTS = [
  {
    id: 'CC0833',
    sku: '9200430',
    name: "Detergente Spray 'Svitol Bike'",
    description:
      'Formulazione studiata per essere sicura su tutti i materiali della bici: carbonio, alluminio, acciaio, superfici verniciate o anodizzate.',
    brand: 'Arexons',
    model: 'ml 500',
    um: 'PZ',
    mv: 1,
    cf: 12,
    price: 8.59,
    listPrice: 12.9,
    available: true,
    image: '🧴',
    category: 'Bike Care',
    promo: 'OFFERTA',
    variants: 0,
  },
  {
    id: 'CC0834',
    sku: '9200434',
    name: "Sgrassante Spray 'Svitol Bike'",
    description:
      "A base di solvente, agisce rapidamente rimuovendo grasso, olio, polvere, catrame e sporco, riducendo l'usura. Pensato per effettuare sgrassaggi rapidi.",
    brand: 'Arexons',
    model: 'ml 500',
    um: 'PZ',
    mv: 1,
    cf: 12,
    price: 14.42,
    listPrice: 19.5,
    available: true,
    image: '🫧',
    category: 'Bike Care',
    promo: 'OFFERTA',
    variants: 0,
  },
  {
    id: 'CC0835',
    sku: '9200436',
    name: "Lubrificante Catena per Biciclette 'Wet'",
    description:
      'Ideale per garantire prestazioni di lubrificazione di lunga durata in tutte le condizioni ambientali (asciutte o umide). Lascia sulla catena un film protettivo.',
    brand: 'Arexons',
    model: 'ml 250',
    um: 'PZ',
    mv: 1,
    cf: 12,
    price: 11.8,
    listPrice: 16.0,
    available: true,
    image: '⛓️',
    category: 'Bike Care',
    promo: 'OFFERTA',
    variants: 0,
  },
  {
    id: 'CC0836',
    sku: '9200438',
    name: "Lubrificante Catena per Biciclette 'Dry'",
    description:
      'Miscela bilanciata di cere, oli sintetici e solventi, con additivazione ceramica. Garantisce una lubrificazione pulita di lunga durata.',
    brand: 'Arexons',
    model: 'ml 100',
    um: 'PZ',
    mv: 1,
    cf: 12,
    price: 11.87,
    listPrice: 15.9,
    available: true,
    image: '🔧',
    category: 'Bike Care',
    promo: 'OFFERTA',
    variants: 0,
  },
  {
    id: 'SA0597',
    sku: '7245NB',
    name: "Scarpe Antinfortunistica '7245NB'",
    description:
      "In pelle idrorepellente, stringate con protezione frontale e chiusura a strappo. Puntale in acciaio, resistenza '200 joule'. Antiperforazione in fibra composita.",
    brand: 'Beta',
    model: 'Varie taglie',
    um: 'PZ',
    mv: 1,
    cf: 1,
    price: 62.5,
    listPrice: 89.0,
    available: true,
    image: '👟',
    category: 'Scarpe',
    promo: 'DISCOUNT',
    variants: 8,
  },
  {
    id: 'SA0122',
    sku: 'CHERRY',
    name: "Scarpe Antinfortunistica 'Cherry'",
    description:
      'Tomaia in pelle scamosciata morbida e nylon ultra traspirante, soffietto in nylon imbottito. Fodera wingtex a tunnel traspirante. Copri sottopiede memory.',
    brand: 'U-Power',
    model: 'Varie taglie',
    um: 'PZ',
    mv: 1,
    cf: 1,
    price: 48.9,
    listPrice: 72.0,
    available: true,
    image: '👞',
    category: 'Scarpe',
    promo: null,
    variants: 5,
  },
  {
    id: 'SA0463',
    sku: 'MICHELLE',
    name: "Scarpe Antinfortunistica 'Michelle'",
    description:
      'Leggere. Tomaia in nylon traspirante e film antiabrasione a protezione della punta. Fodera wingtex a tunnel traspirante. Copri sottopiede U Power original.',
    brand: 'U-Power',
    model: 'Varie taglie',
    um: 'PZ',
    mv: 1,
    cf: 1,
    price: 44.2,
    listPrice: 65.0,
    available: false,
    image: '👟',
    category: 'Scarpe',
    promo: null,
    variants: 5,
  },
  {
    id: 'SA0658',
    sku: 'ARYA',
    name: "Scarpe Antinfortunistica 'Arya'",
    description:
      'Progettate per offrire protezione e comfort in ambito professionale anche in condizioni di lavoro impegnative. Tomaia realizzata in U-KNIT elasticizzato.',
    brand: 'U-Power',
    model: 'Varie taglie',
    um: 'PZ',
    mv: 1,
    cf: 1,
    price: 55.3,
    listPrice: 79.0,
    available: true,
    image: '🥾',
    category: 'Scarpe',
    promo: 'OFFERTA',
    variants: 9,
  },
  {
    id: 'FE1378',
    sku: 'FE1378',
    name: 'Telo Copri Bicicletta Universale',
    description:
      'Telo protettivo universale per biciclette, resistente alle intemperie. Materiale impermeabile e anti-UV, con elastico per fissaggio sicuro.',
    brand: 'Ferma',
    model: 'Universale',
    um: 'PZ',
    mv: 1,
    cf: 6,
    price: 9.9,
    listPrice: 14.5,
    available: true,
    image: '🚲',
    category: 'Bike Care',
    promo: null,
    variants: 0,
  },
  {
    id: 'CC0837',
    sku: '9200440',
    name: 'Grasso Spray per Catena Bici',
    description:
      'Grasso spray ad alte prestazioni per catena bici. Lubrifica e protegge dalla corrosione anche in condizioni meteo avverse. Applicazione precisa.',
    brand: 'Arexons',
    model: 'ml 200',
    um: 'PZ',
    mv: 1,
    cf: 12,
    price: 7.45,
    listPrice: 10.9,
    available: true,
    image: '⚙️',
    category: 'Bike Care',
    promo: 'OFFERTA',
    variants: 0,
  },
  {
    id: 'UE0519',
    sku: 'UE0519',
    name: 'Olio Lubrificante Multiuso WD-40',
    description:
      'Lubrificante, anticorrosivo, sbloccante e idrorepellente. Formato con cannuccia smart straw integrata per applicazioni di precisione.',
    brand: 'WD-40',
    model: 'ml 500',
    um: 'PZ',
    mv: 1,
    cf: 24,
    price: 6.8,
    listPrice: 9.9,
    available: true,
    image: '🛢️',
    category: 'Lubrificanti',
    promo: 'DISCOUNT',
    variants: 0,
  },
  {
    id: 'TL1101',
    sku: 'TL1101',
    name: 'Kit Riparazione Bici Completo',
    description:
      "Kit completo per riparazioni bici con leve, camera d'aria, toppe, colla, chiavi esagonali e borsa da sella impermeabile. Essenziale per ogni ciclista.",
    brand: 'Bike Pro',
    model: 'Kit',
    um: 'PZ',
    mv: 1,
    cf: 6,
    price: 15.9,
    listPrice: 22.0,
    available: false,
    image: '🔩',
    category: 'Bike Care',
    promo: null,
    variants: 0,
  },
];

const PROMOS = [
  { label: 'Offerta', count: 429, value: 'OFFERTA' },
  { label: 'Discount', count: 862, value: 'DISCOUNT' },
  { label: 'Giornalino Superprezzi', count: 2298, value: 'SUPER' },
  { label: 'Offerta Standard', count: 459, value: 'STANDARD' },
  { label: 'Offerte LED', count: 7168, value: 'LED' },
];

const BRANDS = [
  { label: 'Arexons', count: 45 },
  { label: 'Beta', count: 118 },
  { label: 'U-Power', count: 95 },
  { label: 'WD-40', count: 22 },
  { label: 'Ferma', count: 38 },
  { label: 'Bike Pro', count: 12 },
];

const CATEGORIES = [
  { label: 'Bike Care', count: 312 },
  { label: 'Scarpe', count: 258 },
  { label: 'Lubrificanti', count: 131 },
  { label: 'Ferramenta', count: 1243 },
  { label: 'Automotive', count: 131 },
];

// Icons
const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect
      x="1"
      y="1"
      width="7"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="10"
      y="1"
      width="7"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="1"
      y="10"
      width="7"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="10"
      y="10"
      width="7"
      height="7"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect
      x="1"
      y="1"
      width="16"
      height="4"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="1"
      y="7"
      width="16"
      height="4"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="1"
      y="13"
      width="16"
      height="4"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const CartIcon = () => (
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
);

const SearchIcon = () => (
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
);

const ChevronIcon = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    style={{
      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
      transition: 'transform 0.2s',
    }}
  >
    <polyline points="3,5 7,9 11,5" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
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
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="3" y1="7" x2="11" y2="7" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

// Filter Section
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        borderBottom: '1px solid #eef0f3',
        paddingBottom: open ? 16 : 12,
        marginBottom: 12,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 8px 0',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: '#1a1d23',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

function FilterCheckbox({ label, count, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 0',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: checked ? '#1a1d23' : '#5a6070',
        fontWeight: checked ? 600 : 400,
        transition: 'color 0.15s',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: checked ? 'none' : '1.5px solid #c8cdd6',
          background: checked ? '#e63946' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        {checked && <CheckIcon />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          color: '#9aa1b0',
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        ({count})
      </span>
    </label>
  );
}

// Quantity Control
function QtyControl({ qty, setQty, mv = 1 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 8,
        border: '1.5px solid #e2e5ea',
        overflow: 'hidden',
        height: 36,
        background: '#fff',
      }}
    >
      <button
        onClick={() => setQty(Math.max(0, qty - mv))}
        style={{
          width: 32,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#5a6070',
        }}
      >
        <MinusIcon />
      </button>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: 44,
          height: '100%',
          textAlign: 'center',
          border: 'none',
          borderLeft: '1px solid #e2e5ea',
          borderRight: '1px solid #e2e5ea',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: '#1a1d23',
          outline: 'none',
          background: '#fafbfc',
        }}
      />
      <button
        onClick={() => setQty(qty + mv)}
        style={{
          width: 32,
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#5a6070',
        }}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

// Product Card (Grid)
function ProductCardGrid({ product, index }) {
  const [qty, setQty] = useState(0);
  const discount = product.listPrice
    ? Math.round((1 - product.price / product.listPrice) * 100)
    : 0;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #eef0f3',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.25s, transform 0.25s',
        animation: `fadeSlideIn 0.4s ease ${index * 0.05}s both`,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Badges */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: '#1a1d23',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 5,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}
        >
          {product.id}
        </span>
        {product.promo && (
          <span
            style={{
              background: product.promo === 'OFFERTA' ? '#e63946' : '#f4a236',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 5,
              fontFamily: "'DM Sans', sans-serif",
              textTransform: 'uppercase',
            }}
          >
            {product.promo === 'OFFERTA' ? `−${discount}%` : 'Promo'}
          </span>
        )}
      </div>
      {product.variants > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            background: 'rgba(26,29,35,0.85)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 5,
            backdropFilter: 'blur(4px)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {product.variants} varianti
        </span>
      )}

      {/* Image area */}
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8f9fb 0%, #f0f2f5 100%)',
          fontSize: 56,
          position: 'relative',
        }}
      >
        {product.image}
      </div>

      {/* Content */}
      <div
        style={{
          padding: '16px 16px 12px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Brand + SKU */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#e63946',
              fontFamily: "'DM Sans', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {product.brand}
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#9aa1b0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            SKU {product.sku}
          </span>
        </div>

        {/* Name */}
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: '#1a1d23',
            lineHeight: 1.35,
            fontFamily: "'DM Sans', sans-serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: '#6b7280',
            lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </p>

        {/* Units */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 10,
            color: '#9aa1b0',
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: 2,
          }}
        >
          <span>UM: {product.um}</span>
          <span>·</span>
          <span>MV: {product.mv}</span>
          <span>·</span>
          <span>CF: {product.cf}</span>
          <span>·</span>
          <span>{product.model}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Price + Availability */}
        <div
          style={{
            borderTop: '1px solid #f0f2f5',
            paddingTop: 12,
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#1a1d23',
                fontFamily: "'DM Sans', sans-serif",
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              €{product.price.toFixed(2)}
            </span>
            {product.listPrice && (
              <span
                style={{
                  fontSize: 13,
                  color: '#b0b7c3',
                  textDecoration: 'line-through',
                  fontFamily: "'DM Sans', sans-serif",
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                €{product.listPrice.toFixed(2)}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: product.available ? '#22c55e' : '#ef4444',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: product.available ? '#16a34a' : '#dc2626',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {product.available ? 'Disponibile' : 'Non disponibile'}
              </span>
            </div>
          </div>

          {/* Add to cart row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QtyControl qty={qty} setQty={setQty} mv={product.mv} />
            <button
              disabled={!product.available || qty === 0}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background:
                  !product.available || qty === 0 ? '#e2e5ea' : '#1a1d23',
                color: !product.available || qty === 0 ? '#9aa1b0' : '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: product.available && qty > 0 ? 'pointer' : 'default',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.03em',
                transition: 'background 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                if (product.available && qty > 0)
                  e.target.style.background = '#e63946';
              }}
              onMouseLeave={(e) => {
                if (product.available && qty > 0)
                  e.target.style.background = '#1a1d23';
              }}
            >
              + Carrello
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Card (List)
function ProductCardList({ product, index }) {
  const [qty, setQty] = useState(0);
  const discount = product.listPrice
    ? Math.round((1 - product.price / product.listPrice) * 100)
    : 0;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #eef0f3',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
        transition: 'box-shadow 0.25s',
        animation: `fadeSlideIn 0.35s ease ${index * 0.04}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image */}
      <div
        style={{
          width: 140,
          minHeight: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8f9fb 0%, #f0f2f5 100%)',
          fontSize: 44,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {product.image}
        {/* Badges */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              background: '#1a1d23',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {product.id}
          </span>
          {product.promo && (
            <span
              style={{
                background: product.promo === 'OFFERTA' ? '#e63946' : '#f4a236',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {product.promo === 'OFFERTA' ? `−${discount}%` : 'Promo'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#e63946',
              fontFamily: "'DM Sans', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {product.brand}
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#9aa1b0',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            SKU {product.sku}
          </span>
          {product.variants > 0 && (
            <span
              style={{
                background: '#f0f2f5',
                color: '#5a6070',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {product.variants} varianti
            </span>
          )}
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: '#1a1d23',
            lineHeight: 1.3,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {product.name}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            fontSize: 10,
            color: '#9aa1b0',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>UM: {product.um}</span>
          <span>MV: {product.mv}</span>
          <span>CF: {product.cf}</span>
          <span>{product.model}</span>
        </div>
      </div>

      {/* Price + Actions */}
      <div
        style={{
          width: 220,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
          borderLeft: '1px solid #f0f2f5',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1a1d23',
              fontFamily: "'DM Sans', sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            €{product.price.toFixed(2)}
          </span>
          {product.listPrice && (
            <span
              style={{
                fontSize: 12,
                color: '#b0b7c3',
                textDecoration: 'line-through',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              €{product.listPrice.toFixed(2)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: product.available ? '#22c55e' : '#ef4444',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: product.available ? '#16a34a' : '#dc2626',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {product.available ? 'Disponibile' : 'Non disponibile'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <QtyControl qty={qty} setQty={setQty} mv={product.mv} />
          <button
            disabled={!product.available || qty === 0}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background:
                !product.available || qty === 0 ? '#e2e5ea' : '#1a1d23',
              color: !product.available || qty === 0 ? '#9aa1b0' : '#fff',
              cursor: product.available && qty > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (product.available && qty > 0)
                e.target.style.background = '#e63946';
            }}
            onMouseLeave={(e) => {
              if (product.available && qty > 0)
                e.target.style.background = '#1a1d23';
            }}
          >
            <CartIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App
export default function B2BProductListing() {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPromos, setSelectedPromos] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredProducts = PRODUCTS.filter((p) => {
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.brand.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (selectedBrands.length && !selectedBrands.includes(p.brand))
      return false;
    if (selectedPromos.length && !selectedPromos.includes(p.promo))
      return false;
    if (selectedCategories.length && !selectedCategories.includes(p.category))
      return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const toggleFilter = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const activeFilters =
    selectedBrands.length + selectedPromos.length + selectedCategories.length;

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#f5f6f8',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        
        * { box-sizing: border-box; }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>

      {/* Top Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #eef0f3',
          padding: '0 24px',
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
        {/* Logo */}
        <div
          style={{
            fontWeight: 800,
            fontSize: 22,
            color: '#e63946',
            letterSpacing: '-0.02em',
            fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#1a1d23' }}>DFL</span>
          <span
            style={{
              fontSize: 11,
              color: '#9aa1b0',
              fontWeight: 500,
              marginLeft: 6,
              verticalAlign: 'top',
            }}
          >
            B2B
          </span>
        </div>

        {/* Search */}
        <div
          style={{
            flex: 1,
            maxWidth: 600,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9aa1b0',
              display: 'flex',
            }}
          >
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Cerca prodotti, codici, marchi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1.5px solid #e2e5ea',
              paddingLeft: 42,
              paddingRight: 16,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              outline: 'none',
              color: '#1a1d23',
              background: '#fafbfc',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#e63946';
              e.target.style.boxShadow = '0 0 0 3px rgba(230,57,70,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e5ea';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['Nuovi Inserimenti', 'Tutte le Offerte', 'Presto a Catalogo'].map(
            (label) => (
              <button
                key={label}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #e2e5ea',
                  background: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#5a6070',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#e63946';
                  e.target.style.color = '#e63946';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e2e5ea';
                  e.target.style.color = '#5a6070';
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* Cart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 8,
            padding: '6px 14px',
            borderRadius: 10,
            background: '#fafbfc',
            border: '1.5px solid #e2e5ea',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <CartIcon />
          <div>
            <div style={{ fontSize: 10, color: '#9aa1b0', fontWeight: 500 }}>
              Carrello
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1d23' }}>
              €10.66
            </div>
          </div>
          <span
            style={{
              background: '#e63946',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            1
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex', maxWidth: 1440, margin: '0 auto' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: sidebarOpen ? 260 : 0,
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            background: '#fff',
            borderRight: '1px solid #eef0f3',
            padding: sidebarOpen ? '20px 20px' : '20px 0',
            flexShrink: 0,
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: 64,
            overflowY: 'auto',
          }}
        >
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setSelectedBrands([]);
                setSelectedPromos([]);
                setSelectedCategories([]);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                border: '1.5px solid #e63946',
                background: 'rgba(230,57,70,0.05)',
                color: '#e63946',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: 16,
              }}
            >
              Rimuovi filtri ({activeFilters})
            </button>
          )}

          <FilterSection title="Promozioni">
            {PROMOS.map((p) => (
              <FilterCheckbox
                key={p.value}
                label={p.label}
                count={p.count}
                checked={selectedPromos.includes(p.value)}
                onChange={() =>
                  toggleFilter(selectedPromos, setSelectedPromos, p.value)
                }
              />
            ))}
          </FilterSection>

          <FilterSection title="Marchi">
            {BRANDS.map((b) => (
              <FilterCheckbox
                key={b.label}
                label={b.label}
                count={b.count}
                checked={selectedBrands.includes(b.label)}
                onChange={() =>
                  toggleFilter(selectedBrands, setSelectedBrands, b.label)
                }
              />
            ))}
          </FilterSection>

          <FilterSection title="Categoria">
            {CATEGORIES.map((c) => (
              <FilterCheckbox
                key={c.label}
                label={c.label}
                count={c.count}
                checked={selectedCategories.includes(c.label)}
                onChange={() =>
                  toggleFilter(
                    selectedCategories,
                    setSelectedCategories,
                    c.label,
                  )
                }
              />
            ))}
          </FilterSection>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1.5px solid #e2e5ea',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5a6070',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="2" y1="4" x2="14" y2="4" />
                  <line x1="2" y1="8" x2="10" y2="8" />
                  <line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              </button>
              <span
                style={{
                  fontSize: 14,
                  color: '#5a6070',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <strong style={{ color: '#1a1d23' }}>
                  {sortedProducts.length}
                </strong>{' '}
                prodotti trovati
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  height: 36,
                  borderRadius: 8,
                  border: '1.5px solid #e2e5ea',
                  padding: '0 32px 0 12',
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#5a6070',
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239aa1b0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="relevance">Rilevanza</option>
                <option value="price_asc">Prezzo crescente</option>
                <option value="price_desc">Prezzo decrescente</option>
                <option value="name">Nome A-Z</option>
              </select>

              {/* View toggle */}
              <div
                style={{
                  display: 'flex',
                  borderRadius: 8,
                  border: '1.5px solid #e2e5ea',
                  overflow: 'hidden',
                }}
              >
                {[
                  { mode: 'grid', Icon: GridIcon },
                  { mode: 'list', Icon: ListIcon },
                ].map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      width: 36,
                      height: 34,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === mode ? '#1a1d23' : '#fff',
                      color: viewMode === mode ? '#fff' : '#9aa1b0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products */}
          {sortedProducts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#9aa1b0',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#5a6070' }}>
                Nessun prodotto trovato
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Prova a modificare i filtri o la ricerca
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))',
                gap: 16,
              }}
            >
              {/* Fix grid columns */}
              <style>{`
                @media (min-width: 1200px) {
                  .product-grid { grid-template-columns: repeat(4, 1fr) !important; }
                }
                @media (min-width: 900px) and (max-width: 1199px) {
                  .product-grid { grid-template-columns: repeat(3, 1fr) !important; }
                }
                @media (min-width: 600px) and (max-width: 899px) {
                  .product-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 599px) {
                  .product-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
              <div
                className="product-grid"
                style={{
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns: sidebarOpen
                    ? 'repeat(3, 1fr)'
                    : 'repeat(4, 1fr)',
                }}
              >
                {sortedProducts.map((p, i) => (
                  <ProductCardGrid key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedProducts.map((p, i) => (
                <ProductCardList key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
