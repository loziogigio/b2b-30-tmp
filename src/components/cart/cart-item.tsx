// cart-item.tsx
import Link from '@components/ui/link';
import Image from '@components/ui/image';
import { IoIosCloseCircle } from 'react-icons/io';
import { useCart } from '@contexts/cart/cart.context';
import usePrice from '@framework/product/use-price';
import { ROUTES } from '@utils/routes';
import AddToCart from '@components/product/add-to-cart';
import UpdateCart from '@components/product/update-cart';

type CartItemProps = {
  item: any;
  lang: string;
};

const getUnitNet = (it: any) =>
  Number(
    it?.priceDiscount ??
      it?.price_discount ??
      it?.__cartMeta?.price_discount ??
      it?.price ??
      0
  );

const getQty = (it: any) => Number(it?.quantity ?? 0);

const CartItem: React.FC<CartItemProps> = ({ lang, item }) => {
  const { isInStock, clearItemFromCart } = useCart();
  const outOfStock = !isInStock(item.id);

  const qty = getQty(item);
  const unit = getUnitNet(item);
  const line = unit * qty;

  const { price: unitPrice } = usePrice({ amount: unit, currencyCode: 'EUR' });
  const { price: linePrice } = usePrice({ amount: line, currencyCode: 'EUR' });

  return (
    <div
      className="group relative flex w-full items-center justify-start gap-3 border-b border-border-one/70 py-3 last:border-b-0 md:py-3.5"
      title={item?.name}
    >
      {/* image + quick remove */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200">
        <Image
          src={item?.image ?? '/assets/placeholder/cart-item.svg'}
          width={64}
          height={64}
          loading="eager"
          alt={item?.name || 'Product Image'}
          className="h-full w-full object-cover bg-fill-thumbnail"
        />
        <button
          onClick={() => clearItemFromCart(item.id)}
          className="absolute inset-0 hidden items-center justify-center bg-black/20 text-white transition md:flex md:opacity-0 md:group-hover:opacity-100"
          aria-label="remove-item"
          title="Remove"
        >
          <IoIosCloseCircle className="text-2xl" />
        </button>
      </div>

      {/* content */}
      <div className="flex w-full items-start justify-between gap-3 overflow-hidden">
        <div className="min-w-0">
          <div className="text-xs text-blue-600 font-semibold">{item?.sku}</div>
          <Link
            href={`/${lang}${ROUTES.PRODUCT}/${item?.slug}`}
            className="block truncate text-[13px] font-medium text-brand-dark transition hover:text-brand md:text-sm"
          >
            {item?.name}
          </Link>
          {/* qty × unit */}
          <div className="mt-0.5 text-[11px] text-gray-600">
            {qty} × {unitPrice}
          </div>

          {/* compact counter */}
          <UpdateCart  item={item} lang={''}  />
        </div>

        {/* line total */}
        <div className="shrink-0 text-right text-sm font-semibold text-brand-dark md:text-base">
          {linePrice}
        </div>
      </div>
    </div>
  );
};

export default CartItem;
