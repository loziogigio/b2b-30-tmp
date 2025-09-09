import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { FaChevronDown } from 'react-icons/fa';
import LocationIcon from '@components/icons/location-icon';
import { useModalAction } from '@components/common/modal/modal.context';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { useUI } from '@contexts/ui.context';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

interface DeliveryProps {
  lang: string;
  className?: string;
}

function makeTitle(r?: AddressB2B) {
  if (!r) return '';
  const line1 = r.title || '';
  return `${line1}`.trim();
}

const Delivery: React.FC<DeliveryProps> = ({ lang, className }) => {
  const { t } = useTranslation(lang, 'common');
  // const { isAuthorized } = useUI();
  const isAuthorized = true;
  const { openModal } = useModalAction();

  // 🔹 get selected delivery address from context
  const { selected } = useDeliveryAddress();

  function handleDeliveryView() {
    !isAuthorized ? openModal('LOGIN_VIEW') : openModal('DELIVERY_VIEW');
  }

  const label = !isAuthorized
    ? t('text-address')
    : selected
    ? makeTitle(selected)
    : t('text-home-address');

  return (
    <div className={cn('delivery-address', className)}>
      <button
        className="inline-flex items-center text-15px text-brand-dark tracking-[0.1px]"
        onClick={handleDeliveryView}
      >
        <LocationIcon />
        <span className="ltr:pl-1.5 lg:rtl:pr-1.5">{t('text-delivery')}:</span>
        <span className="font-semibold text-brand relative top-[1px] ltr:pl-1 rtl:pr-1">
          {label}
        </span>
        <span className="ltr:pl-1.5 lg:rtl:pr-1.5">
          <FaChevronDown className="text-xs text-brand-dark text-opacity-40" />
        </span>
      </button>
    </div>
  );
};

export default Delivery;
