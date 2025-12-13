import { NextResponse } from 'next/server';
import { fetchProductList } from '@/framework/basic-rest/product/get-b2b-product';
import { transformSearchParams } from '@/utils/transform/b2b-product';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get('text') || '').trim();
  const query = (searchParams.get('query') || '').trim();
  const limitParam = searchParams.get('limit') || '8';
  const limit = Number.parseInt(limitParam, 10);

  if (!text && !query) {
    return NextResponse.json({ items: [] });
  }

  const perPage = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 8;

  const params = transformSearchParams({
    search: query || { text },
    per_page: perPage,
  });

  try {
    const { items } = await fetchProductList(params, 0);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[product-search] Failed to fetch products', error);
    return NextResponse.json(
      { items: [], error: 'Failed to fetch products' },
      { status: 500 },
    );
  }
}
