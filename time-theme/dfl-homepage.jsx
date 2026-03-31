import { useState, useRef, useEffect } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const CATEGORIES_NAV = [
  'Edilizia e Impiantistica',
  'Idraulica',
  'Ferramenta e Fissaggi',
  'Utensili',
  'Agricoltura e Giardinaggio',
  'Per la Casa',
  'Riscaldamento e Clima',
  'Tempo Libero e Automotive',
];

const QUICK_ACTIONS = [
  {
    label: 'Nuovi Arrivi',
    emoji: '✨',
    count: 1817,
    color: '#e63946',
    desc: 'Ultimi prodotti inseriti',
  },
  {
    label: 'Discount',
    emoji: '🏷️',
    count: 862,
    color: '#1a1d23',
    desc: 'Fino al 50% di sconto',
  },
  {
    label: 'Presto a Catalogo',
    emoji: '📦',
    count: 340,
    color: '#2563eb',
    desc: 'In arrivo prossimamente',
  },
  {
    label: 'Di Nuovo Disponibili',
    emoji: '🔄',
    count: 156,
    color: '#059669',
    desc: 'Tornati in stock',
  },
  {
    label: 'Offerte LED',
    emoji: '💡',
    count: 7168,
    color: '#d97706',
    desc: 'Iniziativa Digital LED',
  },
];

const HERO_SLIDES = [
  {
    title: "Tutto per l'Elettropascolo",
    subtitle: '2026',
    desc: 'Elettrificatori · Batterie · Alimentatori · Cavi e Fili · Paletti · Isolatori · Bande e Reti',
    gradient: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 40%, #40916c 100%)',
    emoji: '🐑',
    tag: 'Agricoltura',
  },
  {
    title: 'Iniziativa Digital LED',
    subtitle: 'Tappa 1',
    desc: 'Un anno di opportunità · Validità dal 23 al 29 marzo 2026 · Scopri le offerte e partecipa',
    gradient: 'linear-gradient(135deg, #e63946 0%, #c1121f 50%, #780000 100%)',
    emoji: '💡',
    tag: 'Promozione',
  },
  {
    title: 'Super Prezzi Building',
    subtitle: 'Primavera 2026',
    desc: 'Materiali edili, utensili professionali e ferramenta ai migliori prezzi del mercato',
    gradient: 'linear-gradient(135deg, #1a1d23 0%, #374151 50%, #4b5563 100%)',
    emoji: '🏗️',
    tag: 'Edilizia',
  },
];

const PRODUCT_SECTIONS = [
  {
    title: 'Life in Garden',
    tag: 'Giardinaggio',
    tagColor: '#059669',
    products: [
      {
        id: '8302175',
        name: 'Lanterna da Campeggio LED',
        brand: 'Active',
        price: 12.9,
        oldPrice: 18.5,
        emoji: '🏕️',
        available: true,
      },
      {
        id: '7906570',
        name: "Borsa Termica 'Active'",
        brand: "Gio'Style",
        price: 15.4,
        oldPrice: 22.0,
        emoji: '🧊',
        available: true,
      },
      {
        id: '8038700',
        name: 'Forno Portatile a Legna',
        brand: 'Clementi',
        price: 289.0,
        oldPrice: null,
        emoji: '🔥',
        available: true,
      },
      {
        id: '8038720',
        name: 'Forno Portatile a Legna XL',
        brand: 'Clementi',
        price: 349.0,
        oldPrice: 420.0,
        emoji: '🍕',
        available: true,
      },
      {
        id: '8038950',
        name: "Barbecue a Gas 'Compact'",
        brand: 'Campingaz',
        price: 189.0,
        oldPrice: 240.0,
        emoji: '🥩',
        available: true,
      },
      {
        id: '6129173',
        name: "Barbecue Muratura 'Ulisse'",
        brand: 'Sunday',
        price: 420.0,
        oldPrice: null,
        emoji: '🧱',
        available: false,
      },
      {
        id: '7041200',
        name: 'Set Attrezzi Giardinaggio',
        brand: 'Gardena',
        price: 34.5,
        oldPrice: 45.0,
        emoji: '🌱',
        available: true,
      },
      {
        id: '7041310',
        name: 'Irrigatore Oscillante',
        brand: 'Gardena',
        price: 28.9,
        oldPrice: null,
        emoji: '💧',
        available: true,
      },
    ],
  },
  {
    title: 'Super Prezzi Building',
    tag: 'Edilizia',
    tagColor: '#dc2626',
    products: [
      {
        id: '5023100',
        name: 'Fulcron Cotto e Pietre',
        brand: 'Arexons',
        price: 6.8,
        oldPrice: 9.9,
        emoji: '🧪',
        available: true,
      },
      {
        id: '5023110',
        name: 'Fulcron Parquet e Laminati',
        brand: 'Arexons',
        price: 7.2,
        oldPrice: 10.5,
        emoji: '🪵',
        available: true,
      },
      {
        id: '5023120',
        name: 'Fulcron Gres e Ceramica',
        brand: 'Arexons',
        price: 6.8,
        oldPrice: 9.9,
        emoji: '🏠',
        available: true,
      },
      {
        id: '3012400',
        name: 'Guaina Bituminosa 10m',
        brand: 'Mapei',
        price: 45.0,
        oldPrice: 58.0,
        emoji: '📐',
        available: true,
      },
      {
        id: '3045600',
        name: 'Pala a Punta Manico Legno',
        brand: 'Eagle',
        price: 18.5,
        oldPrice: null,
        emoji: '⛏️',
        available: true,
      },
      {
        id: '3045650',
        name: 'Piccone con Manico',
        brand: 'Eagle',
        price: 22.0,
        oldPrice: 28.0,
        emoji: '🔨',
        available: true,
      },
      {
        id: '3089100',
        name: 'Livella Laser Professionale',
        brand: 'Bosch',
        price: 89.0,
        oldPrice: 120.0,
        emoji: '📏',
        available: true,
      },
      {
        id: '3089200',
        name: 'Trapano Avvitatore 18V',
        brand: 'Makita',
        price: 145.0,
        oldPrice: 185.0,
        emoji: '🔩',
        available: true,
      },
    ],
  },
  {
    title: 'Scarpe Antinfortunistica',
    tag: 'Sicurezza',
    tagColor: '#7c3aed',
    products: [
      {
        id: 'SA0597',
        name: "Scarpe '7245NB'",
        brand: 'Beta',
        price: 62.5,
        oldPrice: 89.0,
        emoji: '👟',
        available: true,
        variants: 8,
      },
      {
        id: 'SA0122',
        name: "Scarpe 'Cherry'",
        brand: 'U-Power',
        price: 48.9,
        oldPrice: 72.0,
        emoji: '👞',
        available: true,
        variants: 5,
      },
      {
        id: 'SA0463',
        name: "Scarpe 'Michelle'",
        brand: 'U-Power',
        price: 44.2,
        oldPrice: 65.0,
        emoji: '👟',
        available: true,
        variants: 5,
      },
      {
        id: 'SA0658',
        name: "Scarpe 'Arya'",
        brand: 'U-Power',
        price: 55.3,
        oldPrice: 79.0,
        emoji: '🥾',
        available: true,
        variants: 9,
      },
      {
        id: 'SA0659',
        name: "Scarpe 'Bran'",
        brand: 'U-Power',
        price: 58.0,
        oldPrice: 82.0,
        emoji: '🥾',
        available: true,
        variants: 9,
      },
      {
        id: 'SA0660',
        name: "Scarpe 'Vhagar'",
        brand: 'U-Power',
        price: 61.0,
        oldPrice: 85.0,
        emoji: '👢',
        available: false,
        variants: 9,
      },
      {
        id: 'SA0345',
        name: "Stivali S5 'Dunlop'",
        brand: 'Dunlop',
        price: 32.0,
        oldPrice: null,
        emoji: '🥿',
        available: true,
        variants: 6,
      },
      {
        id: 'SA0780',
        name: "Scarpe 'Rebel'",
        brand: 'Base',
        price: 52.0,
        oldPrice: 68.0,
        emoji: '👟',
        available: true,
        variants: 7,
      },
    ],
  },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────

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

const ChevronLeft = () => (
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
);

const ChevronRight = () => (
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
);

const UserIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MapPinIcon = () => (
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

// ─── PRODUCT CAROUSEL ────────────────────────────────────────────────────────

function ProductCarousel({ section }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
  }, []);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <section style={{ marginBottom: 48 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              background: section.tagColor,
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
            {section.tag}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: '#1a1d23',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            {section.title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1.5px solid #e2e5ea',
              background: canScrollLeft ? '#fff' : '#f5f6f8',
              color: canScrollLeft ? '#1a1d23' : '#c8cdd6',
              cursor: canScrollLeft ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1.5px solid #e2e5ea',
              background: canScrollRight ? '#fff' : '#f5f6f8',
              color: canScrollRight ? '#1a1d23' : '#c8cdd6',
              cursor: canScrollRight ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <ChevronRight />
          </button>
          <button
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 10,
              border: '1.5px solid #e2e5ea',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: '#5a6070',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#e63946';
              e.currentTarget.style.color = '#e63946';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e5ea';
              e.currentTarget.style.color = '#5a6070';
            }}
          >
            Vedi tutti <ArrowRight />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: 8,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.carousel-scroll::-webkit-scrollbar { display: none; }`}</style>
        {section.products.map((p, i) => {
          const discount = p.oldPrice
            ? Math.round((1 - p.price / p.oldPrice) * 100)
            : 0;
          return (
            <div
              key={p.id}
              style={{
                minWidth: 210,
                maxWidth: 210,
                scrollSnapAlign: 'start',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #eef0f3',
                overflow: 'hidden',
                transition: 'box-shadow 0.25s, transform 0.25s',
                animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Image */}
              <div
                style={{
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(145deg, #f8f9fb, #eef0f4)',
                  fontSize: 48,
                  position: 'relative',
                }}
              >
                {p.emoji}
                {discount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: '#e63946',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 5,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    −{discount}%
                  </span>
                )}
                {p.variants && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(26,29,35,0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '3px 7px',
                      borderRadius: 5,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {p.variants} var.
                  </span>
                )}
                {!p.available && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    <span
                      style={{
                        background: '#1a1d23',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                      }}
                    >
                      Non disponibile
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px 14px' }}>
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
                      fontSize: 10,
                      fontWeight: 700,
                      color: section.tagColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {p.brand}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: '#9aa1b0',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {p.id}
                  </span>
                </div>
                <h4
                  style={{
                    margin: '0 0 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1a1d23',
                    lineHeight: 1.3,
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.name}
                </h4>
                <div
                  style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#1a1d23',
                      fontFamily: 'var(--font-body)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    €{p.price.toFixed(2)}
                  </span>
                  {p.oldPrice && (
                    <span
                      style={{
                        fontSize: 12,
                        color: '#b0b7c3',
                        textDecoration: 'line-through',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      €{p.oldPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── HERO CAROUSEL ───────────────────────────────────────────────────────────

function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setActive((a) => (a + 1) % HERO_SLIDES.length),
      6000,
    );
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[active];

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        height: 340,
        background: slide.gradient,
        transition: 'background 0.8s ease',
        display: 'flex',
        alignItems: 'center',
        padding: '0 60px',
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: '40%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 60,
          fontSize: 100,
          opacity: 0.15,
          filter: 'blur(1px)',
        }}
      >
        {slide.emoji}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 600 }}>
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 8,
            marginBottom: 16,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
          }}
        >
          {slide.tag} · {slide.subtitle}
        </span>
        <h1
          style={{
            margin: '0 0 14px',
            fontSize: 42,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.1,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em',
          }}
        >
          {slide.title}
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 15,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
            fontFamily: 'var(--font-body)',
            maxWidth: 500,
          }}
        >
          {slide.desc}
        </p>
        <button
          style={{
            height: 44,
            padding: '0 28px',
            borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
        >
          Scopri le offerte <ArrowRight />
        </button>
      </div>

      {/* Dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          zIndex: 2,
        }}
      >
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              width: active === i ? 28 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: active === i ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Nav arrows */}
      <button
        onClick={() =>
          setActive((active - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
        }
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40,
          height: 40,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')
        }
      >
        <ChevronLeft />
      </button>
      <button
        onClick={() => setActive((active + 1) % HERO_SLIDES.length)}
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40,
          height: 40,
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')
        }
      >
        <ChevronRight />
      </button>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function DFLHomepage() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCat, setActiveCat] = useState(null);

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
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>

      {/* ─── TOP BAR ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#1a1d23',
          color: '#fff',
          padding: '0 32px',
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: 0.8,
            }}
          >
            <MapPinIcon />
            <span style={{ fontWeight: 600 }}>
              Via Fieghi, 1 – Sala Consilina
            </span>
            <svg width="10" height="10" viewBox="0 0 10 6" fill="none">
              <path
                d="M1 1L5 5L9 1"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ opacity: 0.6 }}>🔊 Ascolta Radio DFL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              background: 'var(--red)',
              padding: '3px 12px',
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.03em',
            }}
          >
            🎯 Listino VEND 1 – Sconto 50%
          </span>
        </div>
      </div>

      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          padding: '0 32px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
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
              letterSpacing: '-0.02em',
            }}
          >
            DFL
          </div>
          <div style={{ marginLeft: 6 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--gray-400)',
                fontWeight: 600,
                lineHeight: 1,
                fontFamily: 'var(--font-mono)',
              }}
            >
              50°
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--gray-400)',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
              }}
            >
              La Mura
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 600, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: searchFocused ? 'var(--red)' : 'var(--gray-400)',
              display: 'flex',
              transition: 'color 0.2s',
            }}
          >
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Cerca tra 50.000+ prodotti, codici, marchi..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              height: 46,
              borderRadius: 12,
              border: searchFocused
                ? '2px solid var(--red)'
                : '1.5px solid var(--gray-200)',
              paddingLeft: 44,
              paddingRight: 16,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              outline: 'none',
              color: 'var(--dark)',
              background: searchFocused ? '#fff' : 'var(--gray-50)',
              boxShadow: searchFocused
                ? '0 0 0 4px rgba(230,57,70,0.08)'
                : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['Nuovi Inserimenti', 'Tutte le Offerte ★', 'Presto a Catalogo'].map(
            (label, i) => (
              <button
                key={label}
                style={{
                  padding: '7px 14px',
                  borderRadius: 9,
                  border: '1.5px solid var(--gray-200)',
                  background: i === 1 ? 'var(--red)' : '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  color: i === 1 ? '#fff' : 'var(--gray-600)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (i !== 1) {
                    e.currentTarget.style.borderColor = 'var(--red)';
                    e.currentTarget.style.color = 'var(--red)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (i !== 1) {
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                    e.currentTarget.style.color = 'var(--gray-600)';
                  }
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* User + Cart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              border: '1.5px solid var(--gray-200)',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gray-600)',
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
            <UserIcon />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 16px',
              borderRadius: 10,
              background: 'var(--dark)',
              color: '#fff',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <CartIcon />
            <div>
              <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>
                Carrello
              </div>
              <div
                style={{
                  fontSize: 15,
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
                top: -6,
                right: -6,
                background: 'var(--red)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                width: 20,
                height: 20,
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
      </header>

      {/* ─── CATEGORY NAV ─────────────────────────────────────────────── */}
      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--gray-100)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES_NAV.map((cat, i) => (
          <button
            key={cat}
            onClick={() => setActiveCat(activeCat === cat ? null : cat)}
            style={{
              padding: '14px 20px',
              border: 'none',
              borderBottom:
                activeCat === cat
                  ? '2px solid var(--red)'
                  : '2px solid transparent',
              background: 'none',
              fontSize: 13,
              fontWeight: activeCat === cat ? 700 : 600,
              color: activeCat === cat ? 'var(--red)' : 'var(--gray-600)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (activeCat !== cat)
                e.currentTarget.style.color = 'var(--dark)';
            }}
            onMouseLeave={(e) => {
              if (activeCat !== cat)
                e.currentTarget.style.color = 'var(--gray-600)';
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main
        style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 60px' }}
      >
        {/* ─── HERO SECTION ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <HeroCarousel />

          {/* Side banners */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* LED Promo */}
            <div
              style={{
                flex: 1,
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                background: 'linear-gradient(135deg, #e63946 0%, #be123c 100%)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'scale(1.01)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 6,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Iniziativa Digital LED
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1.2,
                  }}
                >
                  Un Anno di
                  <br />
                  Opportunità
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-body)',
                    marginBottom: 8,
                  }}
                >
                  Tappa 1 · 23–29 marzo 2026
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fff',
                    color: 'var(--red)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Clicca qui <ArrowRight />
                </span>
              </div>
            </div>

            {/* All Offers */}
            <div
              style={{
                flex: 1,
                borderRadius: 16,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #1a1d23 0%, #374151 100%)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'scale(1.01)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.2,
                }}
              >
                Tutte le
                <br />
                Offerte 🔥
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  alignSelf: 'flex-start',
                }}
              >
                Scopri ora <ArrowRight />
              </span>
            </div>
          </div>
        </div>

        {/* ─── QUICK ACTION CARDS ───────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 48,
          }}
        >
          {QUICK_ACTIONS.map((action, i) => (
            <div
              key={action.label}
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#fff',
                border: '1px solid var(--gray-100)',
                padding: '18px 18px 16px',
                transition: 'all 0.25s',
                position: 'relative',
                animation: `fadeUp 0.4s ease ${0.1 + i * 0.06}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--gray-100)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: action.color,
                  borderRadius: '14px 14px 0 0',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 28 }}>{action.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--gray-400)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  ({action.count})
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--dark)',
                  fontFamily: 'var(--font-body)',
                  marginBottom: 3,
                }}
              >
                {action.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--gray-500)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {action.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ─── PRODUCT SECTIONS ─────────────────────────────────────── */}
        {PRODUCT_SECTIONS.map((section) => (
          <ProductCarousel key={section.title} section={section} />
        ))}

        {/* ─── CATEGORY GRID ──────────────────────────────────────── */}
        <section style={{ marginTop: 8 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--dark)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              marginBottom: 20,
            }}
          >
            Esplora per Categoria
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(2, 120px)',
              gap: 12,
            }}
          >
            {[
              {
                name: 'Edilizia e Impiantistica',
                emoji: '🏗️',
                gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              },
              {
                name: 'Idraulica',
                emoji: '🔧',
                gradient: 'linear-gradient(135deg, #0e4429, #059669)',
              },
              {
                name: 'Ferramenta e Fissaggi',
                emoji: '🔩',
                gradient: 'linear-gradient(135deg, #78350f, #d97706)',
              },
              {
                name: 'Utensili',
                emoji: '⚡',
                gradient: 'linear-gradient(135deg, #581c87, #7c3aed)',
              },
              {
                name: 'Agricoltura',
                emoji: '🌾',
                gradient: 'linear-gradient(135deg, #14532d, #22c55e)',
              },
              {
                name: 'Per la Casa',
                emoji: '🏠',
                gradient: 'linear-gradient(135deg, #831843, #ec4899)',
              },
              {
                name: 'Riscaldamento',
                emoji: '🔥',
                gradient: 'linear-gradient(135deg, #7c2d12, #ea580c)',
              },
              {
                name: 'Tempo Libero',
                emoji: '⛺',
                gradient: 'linear-gradient(135deg, #1e3a5f, #0ea5e9)',
              },
            ].map((cat, i) => (
              <div
                key={cat.name}
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: cat.gradient,
                  padding: '20px 22px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  animation: `fadeUp 0.4s ease ${0.2 + i * 0.05}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 18,
                    fontSize: 36,
                    opacity: 0.25,
                  }}
                >
                  {cat.emoji}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1.2,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {cat.name}
                </span>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight />
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ─── FOOTER BAR ───────────────────────────────────────────────── */}
      <footer
        style={{
          background: 'var(--dark)',
          color: 'rgba(255,255,255,0.5)',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: 'var(--font-body)',
        }}
      >
        <span>© 2026 DFL La Mura · 50 anni al vostro servizio</span>
        <span style={{ display: 'flex', gap: 20 }}>
          <span style={{ cursor: 'pointer' }}>Condizioni d'uso</span>
          <span style={{ cursor: 'pointer' }}>Privacy</span>
          <span style={{ cursor: 'pointer' }}>Contatti</span>
        </span>
      </footer>
    </div>
  );
}
