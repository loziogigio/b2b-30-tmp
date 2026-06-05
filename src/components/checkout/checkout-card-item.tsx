import { Item } from '@contexts/cart/cart.utils';
import Image from '@components/ui/image';
import { IoIosCloseCircle } from 'react-icons/io';
import { generateCartItemName } from '@utils/generate-cart-item-name';
import usePrice from '@framework/product/use-price';
import { useCart } from '@contexts/cart/cart.context';
import { confirmAction } from '@utils/toast-confirm';

export const CheckoutItem: React.FC<{ item: Item }> = ({ item }) => {
  const { clearItemFromCart } = useCart();
  const { price } = usePrice({
    amount: item.itemTotal,
    currencyCode: 'USD',
  });

  const handleRemove = async () => {
    const ok = await confirmAction({
      message: `Rimuovere "${item?.name ?? 'articolo'}" dal carrello?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      tone: 'danger',
    });
    if (ok) clearItemFromCart(item);
  };

  return (
    <div className="group flex items-center py-4 border-b border-border-base ">
      <div className="flex w-16 h-16 border rounded-md border-border-base shrink-0">
        <Image
          src={item.image ?? '/assets/placeholder/order-product.svg'}
          alt={'item image'}
          className="rounded-md ltr:mr-5 rtl:ml-5"
          width={64}
          height={64}
          style={{ width: 'auto' }}
        />
      </div>
      <h6 className="font-normal text-15px text-brand-dark ltr:pl-3 rtl:pr-3">
        {generateCartItemName(item.name, item.attributes)}
      </h6>
      <div className="flex font-normal ltr:ml-auto rtl:mr-auto text-15px text-brand-dark ltr:pl-2 rtl:pr-2 shrink-0">
        {price}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        className="ltr:ml-3 rtl:mr-3 shrink-0 text-gray-300 transition hover:text-brand-danger"
        aria-label="remove-item"
        title="Rimuovi"
      >
        <IoIosCloseCircle className="text-2xl" />
      </button>
    </div>
  );
};
