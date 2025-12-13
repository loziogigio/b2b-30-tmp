'use client';

import { useSessionStorage } from 'react-use';
import Image from '@components/ui/image';
import HighlightedBar from '@components/common/highlighted-bar';
import Countdown from '@components/common/countdown';
import { useTranslation } from 'src/app/i18n/client';
import { useParams } from 'next/navigation';

export default function HighlightedBarWrapper() {
  const params = useParams();
  const lang = (params?.lang as string) || 'en';
  const { t } = useTranslation(lang, 'common');
  const [highlightedBar, setHighlightedBar] = useSessionStorage(
    'vinc-b2b-highlightedBar',
    'false',
  );

  if (highlightedBar === 'true') {
    return null;
  }

  return (
    <HighlightedBar onClose={() => setHighlightedBar('true')}>
      <div className="flex items-center">
        <div className="hidden sm:flex shrink-0 items-center justify-center bg-brand-light w-9 h-9 rounded-full ltr:mr-2.5 rtl:ml-2.5">
          <Image
            width={23}
            height={23}
            src="/assets/images/delivery-box.svg"
            alt="Delivery Box"
            style={{ width: 'auto' }}
          />
        </div>
        <p
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: t('text-highlighted-bar') }}
        />
      </div>
      <Countdown date={Date.now() + 4000000 * 71} />
    </HighlightedBar>
  );
}
