import { PORTAL_DATA_SDK_SOURCE } from '@/lib/portal-data/sdk-source';

/** Inline vinc.data helper; must precede the portal's custom scripts. */
export function PortalDataSdk() {
  return (
    <script
      id="vinc-portal-data-sdk"
      dangerouslySetInnerHTML={{ __html: PORTAL_DATA_SDK_SOURCE }}
    />
  );
}
