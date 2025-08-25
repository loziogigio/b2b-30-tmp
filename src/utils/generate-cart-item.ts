import isEmpty from 'lodash/isEmpty';
interface Item {
  id: string | number;
  name: string;
  slug: string;
  image: {
    thumbnail: string;
    [key: string]: unknown;
  };
  price: number;
  sale_price?: number;
  final_price?: number;
  price_discount?: number;
  price_gross?: number;
  quantity?: number;
  [key: string]: unknown;
  __cartMeta?: any;
}
interface Variation {
  id: string | number;
  title: string;
  price: number;
  sale_price?: number;
  final_price?: number;
  price_discount?: number;
  price_gross?: number;
  quantity: number;
  [key: string]: unknown;
  __cartMeta?: any;
}
export function generateCartItem(item: Item, variation: Variation) {
  const { id, name, slug, image, price, sale_price, final_price,  quantity, unit , __cartMeta  , price_discount , price_gross} = item;
  if (!isEmpty(variation)) {
    return {
      id: `${id}.${variation.id}`,
      productId: id,
      name: `${name} - ${variation.title}`,
      slug,
      unit,
      stock: variation.quantity,
      price: variation.sale_price ? variation.sale_price : variation.price,
      image: image?.thumbnail,
      variationId: variation.id,
      price_discount: price_discount,
      price_gross: price_gross,
      __cartMeta: __cartMeta
    };
  }
  return {
    id,
    name,
    slug,
    unit,
    image: image?.thumbnail,
    stock: quantity,
    price: sale_price ? sale_price : price,
    final_price:final_price,
    price_discount: price_discount,
    price_gross: price_gross,
    __cartMeta: __cartMeta
  };
}
