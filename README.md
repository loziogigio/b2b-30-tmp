# Customer Web Application

A modern Next.js 15 e-commerce application built with TypeScript, TailwindCSS, and React Query.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Getting Started](#getting-started)

## Overview

This is a customer web application that serves as an e-commerce platform with:

- Multi-language support (i18n)
- Dynamic page building
- Product catalog with search
- Shopping cart and checkout
- Customer account management
- Stripe and Google Maps integration

## Tech Stack

### Core

- Next.js 15 - App Router
- TypeScript 5.7
- React 19
- TailwindCSS 3.4

### State & Data

- Jotai - State management
- React Query - Server state
- React Context - Global state

## Getting Started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Development Guidelines

### 1. Write Reusable Code

Keep code DRY (Don't Repeat Yourself). Create reusable components with props instead of duplicating code.

### 2. Keep Components Small

Components should be focused and under 200 lines. Split large components into smaller pieces.

### 3. Centralize Types

All TypeScript types go in `/src/lib/types/` or `/src/framework/basic-rest/[domain]/types.ts`

### 4. Use Framework Layer

All API calls must use `/src/framework/basic-rest/` with React Query, never directly in components.

### 5. Context Usage

Use contexts only for truly global state (cart, likes, ui). Prefer React Query for server state.

---

**Last Updated:** 2025-01-10

Project Structure

```
vinc-b2b/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── [lang]/         # Internationalized routes
│   │   ├── api/            # API routes
│   │   └── i18n/           # i18n config & locales
│   ├── components/         # React components by feature
│   │   ├── account/
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── product/
│   │   ├── ui/             # Reusable UI components
│   │   └── common/         # Shared components
│   ├── contexts/           # React Context providers
│   ├── framework/          # API abstraction layer
│   │   └── basic-rest/    # REST API with React Query
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Layout components
│   ├── lib/                # Core utilities
│   │   ├── types/         # TypeScript definitions
│   │   ├── auth/
│   │   └── db/
│   ├── settings/           # App configuration
│   └── utils/              # Helper functions
├── public/                 # Static assets
└── middleware.ts          # Next.js middleware
```

## Code Examples

### Good vs Bad: Reusable Components

**✅ DO - Reusable component:**

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button = ({ variant, size = 'md', onClick, children }: ButtonProps) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  };
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  return (
    <button 
      className={`rounded ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

**❌ DON'T - Duplicated code:**

```typescript
export const PrimaryButton = ({ onClick, children }) => (
  <button className="bg-blue-600 text-white px-4 py-2" onClick={onClick}>
    {children}
  </button>
);

export const SecondaryButton = ({ onClick, children }) => (
  <button className="bg-gray-200 text-gray-800 px-4 py-2" onClick={onClick}>
    {children}
  </button>
);
```

### Good vs Bad: Component Size

**✅ DO - Small, focused components:**

```typescript
const ProductImage = ({ src, alt }: { src: string; alt: string }) => (
  <Image src={src} alt={alt} width={300} height={300} className="rounded-lg" />
);

const ProductPrice = ({ price, currency }: { price: number; currency: string }) => (
  <span className="text-lg font-bold">{currency} {price.toFixed(2)}</span>
);

const ProductCard = ({ product }: { product: Product }) => (
  <div className="border rounded-lg p-4">
    <ProductImage src={product.image} alt={product.name} />
    <h3 className="mt-2 font-semibold">{product.name}</h3>
    <ProductPrice price={product.price} currency={product.currency} />
  </div>
);
```

**❌ DON'T - Large monolithic component:**

```typescript
const ProductCard = ({ product }) => (
  <div className="border rounded-lg p-4">
    <Image src={product.image} alt={product.name} width={300} height={300} />
    <h3>{product.name}</h3>
    <span>{product.currency} {product.price}</span>
    <button onClick={() => { /* 50+ lines of logic */ }}>Add to Cart</button>
    {/* ... 100+ more lines ... */}
  </div>
);
```

### Good vs Bad: Type Definitions

**✅ DO - Centralized types:**

```typescript
// /src/lib/types/product.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  inStock: boolean;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
```

**❌ DON'T - Scattered types:**

```typescript
// In ProductCard.tsx
type Product = { id: string; name: string; price: number; };

// In ProductList.tsx
interface Product { id: string; name: string; price: number; currency: string; }
// ^ Inconsistent!
```

### Good vs Bad: API Calls

**✅ DO - Framework layer:**

```typescript
// /src/framework/basic-rest/product/get-product.ts
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../utils/http';
import type { Product } from '@lib/types/product';

export const useProduct = (id: string) => {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => httpClient.get(`/api/products/${id}`)
  });
};

// In component:
import { useProduct } from '@framework/product/get-product';

const ProductDetail = ({ id }: { id: string }) => {
  const { data: product, isLoading, error } = useProduct(id);
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{product.name}</div>;
};
```

**❌ DON'T - Direct API calls:**

```typescript
const ProductDetail = ({ id }) => {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data));
  }, [id]);
  
  return <div>{product?.name}</div>;
};
```

## Key Architectural Patterns

### 1. Framework Abstraction Layer

The `/src/framework/basic-rest/` provides abstraction over API calls:

- Centralizes API endpoint definitions
- Provides consistent error handling
- Enables easy API provider switching
- Uses React Query for caching and state management

**Structure:**

```
framework/basic-rest/
├── product/
│   ├── get-product.ts
│   ├── get-products.ts
│   └── types.ts
├── auth/
├── cart/
├── order/
└── utils/
    ├── http.ts              # HTTP client
    ├── api-endpoints.ts     # Endpoint constants
    └── httpB2B.ts          # B2B HTTP client
```

### 2. Page Block System

Dynamic pages are built using blocks defined in `/src/lib/types/blocks.ts`:

```typescript
type PageBlock =
  | ProductInfoBlockConfig
  | ProductSuggestionsBlockConfig
  | RichTextBlockConfig
  | CustomHTMLBlockConfig
  | ProductDataTableBlockConfig;
```

This enables:

- Dynamic page composition
- A/B testing with versioning
- Campaign-specific content
- Multi-region/language variations

### 3. Middleware for Context

The `middleware.ts` handles:

- Language detection and routing
- Campaign parameter persistence
- Device detection
- Context merging for personalization

### 4. Context-Based State

Global state via focused contexts:

```typescript
// cart/cart.context.tsx
export const CartProvider = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  // ... cart logic
  return <CartContext.Provider value={{ items, addItem, removeItem }} />;
};
```

**Current Contexts:**

- `cart` - Shopping cart state
- `likes` - Wishlist/favorites
- `address` - User addresses
- `ui` - UI state (modals, drawers)
- `home-settings` - Dynamic page config

## Best Practices

### Performance

1. **React Query for Server Data** - Automatic caching and refetching
2. **Optimize Images** - Use Next.js `<Image>` with proper sizing
3. **Code Splitting** - Lazy load with `dynamic()` import
4. **Memoization** - Use `useMemo` and `useCallback` for expensive operations

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@components/charts/heavy-chart'), {
  loading: () => <Spinner />,
  ssr: false
});
```

### Error Handling

```typescript
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        return await httpClient.get(API_ENDPOINTS.PRODUCTS);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error; // React Query handles this
      }
    }
  });
};
```

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers

### Internationalization

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('common');
  return <h1>{t('welcome')}</h1>;
};
```

## Recommendations for Future Development

### 1. Improve Type Organization

**Current:** Types mostly in `/src/lib/types/blocks.ts` with some scattered in framework

**Recommended Structure:**

```
src/lib/types/
├── index.ts          # Re-export all types
├── product.ts        # Product-related types
├── order.ts          # Order-related types
├── user.ts           # User-related types
├── cart.ts           # Cart-related types
├── blocks.ts         # Page block types (exists)
└── api.ts            # API response/request types
```

### 2. Component Refactoring

**Identify large components:**

```bash
find src/components -name "*.tsx" -exec wc -l {} + | sort -rn | head -20
```

**Split by:**

- UI logic vs business logic
- Container (data) vs presentational (UI) components
- Feature sections within large components

### 3. Add Storybook

```bash
pnpm add -D @storybook/react @storybook/addon-essentials
```

**Benefits:**

- Visual component documentation
- Isolated development
- UI regression testing
- Design system docs

### 4. Implement Unit Testing

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

**Priority:**

1. Utility functions (`/src/utils/`)
2. Custom hooks (`/src/hooks/`)
3. Framework layer (`/src/framework/`)
4. Critical UI components

### 5. Add API Response Validation

```bash
pnpm add zod
```

**Example:**

```typescript
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  inStock: z.boolean()
});

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const data = await httpClient.get(`/products/${id}`);
      return ProductSchema.parse(data); // Runtime validation
    }
  });
};
```

### 6. Consolidate HTTP Clients

**Current:** Separate `httpClient` and `httpB2B`

**Recommended:**

```typescript
// utils/create-http-client.ts
export const createHttpClient = (baseURL: string) => {
  const client = axios.create({ baseURL });
  
  client.interceptors.response.use(
    response => response.data,
    error => {
      // Centralized error handling
      return Promise.reject(error);
    }
  );
  
  return client;
};

export const httpClient = createHttpClient(process.env.NEXT_PUBLIC_API_URL);
export const httpB2B = createHttpClient(process.env.NEXT_PUBLIC_B2B_API_URL);
```

### 7. Enhance Form Handling

Add:

- Zod schemas + React Hook Form integration
- Reusable form components with validation
- Form state persistence (auto-save)

### 8. Monitoring & Analytics

Implement:

- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- User analytics (GA4, Mixpanel)
- A/B testing framework

### 9. API Documentation

Create `/docs/api-integration.md` with:

- API endpoints and purposes
- Authentication flow
- Rate limiting
- Error codes
- Request/response examples

### 10. CI/CD Quality Checks

```bash
# Add to pipeline:
pnpm check-types     # Type checking
pnpm lint            # Linting
pnpm check-format    # Format checking
pnpm test            # Unit tests (when added)
```

## Code Quality Observations

### ✅ Strengths

1. **Strong TypeScript** - Strict mode with comprehensive config
2. **Path Aliases** - Clean imports via tsconfig paths
3. **Framework Abstraction** - Clean API layer separation
4. **Context Organization** - Focused domain contexts
5. **Modern Stack** - React 19 & Next.js 15

### ⚠️ Areas for Improvement

1. **Type Coverage** - Not all types centralized
2. **Component Size** - Some components could be smaller
3. **Testing** - No unit tests currently
4. **Documentation** - Limited JSDoc comments
5. **Validation** - No runtime API response validation

## File Naming Conventions

- Components: `kebab-case.tsx` (e.g., `product-card.tsx`)
- Types: `kebab-case.ts` (e.g., `product-types.ts`)
- Utilities: `kebab-case.ts` (e.g., `format-price.ts`)
- Hooks: `use-*.tsx` (e.g., `use-cart.tsx`)

## Import Organization

Use path aliases from `tsconfig.json`:

```typescript
import { Product } from '@lib/types/product';
import { useProduct } from '@framework/product/get-product';
import { Button } from '@components/ui/button';
import { formatPrice } from '@utils/format-price';
```

## Available Scripts

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm format       # Format with Prettier
pnpm check-types  # TypeScript type check
pnpm test-all     # All checks (format, lint, types, build)
```

## Environment Variables

Key variables (see `.env.example`):

- `NEXT_PUBLIC_API_URL` - Main API endpoint
- `NEXT_PUBLIC_B2B_API_URL` - B2B API endpoint
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps key

## Contributing

1. Follow established folder structure
2. Use TypeScript strictly (no `any`)
3. Write small, focused components
4. Centralize types
5. Use framework layer for APIs
6. Run `pnpm test-all` before committing
7. Follow Prettier code style
