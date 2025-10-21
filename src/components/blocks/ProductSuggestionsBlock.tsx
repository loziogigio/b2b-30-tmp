import type { ProductSuggestionsBlockConfig } from "@/lib/types/blocks";

interface ProductSuggestionsBlockProps {
  config: ProductSuggestionsBlockConfig;
  productData?: any;
}

export function ProductSuggestionsBlock({ config, productData }: ProductSuggestionsBlockProps) {
  const { title, source, searchQuery, searchFilters, productIds, limit, layout, columns } = config;

  // Fetch products based on source
  let products: any[] = [];

  if (source === "search" && searchQuery) {
    // TODO: Call your search API
    // const searchParams = new URLSearchParams({ text: searchQuery });
    // if (searchFilters) {
    //   Object.entries(searchFilters).forEach(([key, value]) => {
    //     searchParams.append(`filters-${key}`, value);
    //   });
    // }
    // const response = await fetch(`/api/search?${searchParams}`);
    // products = await response.json();
  } else if (source === "related" && productData) {
    // TODO: Call your related products API
    // const response = await fetch(`/api/products/${productData.id}/related?limit=${limit}`);
    // products = await response.json();
  } else if (source === "manual" && productIds) {
    // TODO: Fetch specific products by IDs
    // const response = await fetch(`/api/products?ids=${productIds.join(',')}`);
    // products = await response.json();
  }

  if (products.length === 0) {
    return null;
  }

  const gridClass = layout === "grid"
    ? `grid grid-cols-${columns?.mobile || 2} md:grid-cols-${columns?.tablet || 3} lg:grid-cols-${columns?.desktop || 4} gap-4`
    : "flex overflow-x-auto gap-4";

  return (
    <div className="product-suggestions-block py-8">
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <div className={gridClass}>
        {products.slice(0, limit).map((product) => (
          <div key={product.id} className="product-card">
            {/* Product card component */}
            <p className="text-sm">Product: {product.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
