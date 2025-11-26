"use client";

import Link from '@components/ui/link';
import cn from 'classnames';
import { siteSettings } from '@settings/site-settings';
import { useHomeSettings } from '@/hooks/use-home-settings';

const Logo: React.FC<React.AnchorHTMLAttributes<{}>> = ({
  className,
  href = siteSettings.logo.href,
  ...props
}) => {
  const { settings } = useHomeSettings();
  const branding = settings?.branding;

  const logoUrl = branding?.logo || siteSettings.logo.url;
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
