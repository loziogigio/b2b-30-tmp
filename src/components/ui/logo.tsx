"use client";

import Link from '@components/ui/link';
import cn from 'classnames';
import { siteSettings } from '@settings/site-settings';
import { useHomeSettings } from '@/hooks/use-home-settings';

const GRAY_LOGO_URL = 'https://hidros.s3.eu-de.cloud-object-storage.appdomain.cloud/hidros/eshop/mymb_settings/logo_gray.png';

interface LogoProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'gray';
}

const Logo: React.FC<LogoProps> = ({
  className,
  href = siteSettings.logo.href,
  variant = 'default',
  ...props
}) => {
  const { settings } = useHomeSettings();
  const branding = settings?.branding;

  const defaultLogoUrl = branding?.logo || siteSettings.logo.url;
  const logoUrl = variant === 'gray' ? GRAY_LOGO_URL : defaultLogoUrl;
  const logoAlt = branding?.title || siteSettings.logo.alt;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center focus:outline-none',
        className,
      )}
      {...props}
    >
      <img
        src={logoUrl}
        alt={logoAlt}
        loading="eager"
        className="h-full w-auto object-contain"
      />
    </Link>
  );
};

export default Logo;
