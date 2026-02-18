import Link from 'next/link';
import React from 'react';

const ActiveLink = ({
  children,
  lang,
  activeClassName,
  href,
  className: propClassName,
  ...props
}: any) => {
  const isActive = lang === href;
  const className = isActive
    ? `${propClassName ?? ''} ${activeClassName}`.trim()
    : propClassName ?? '';

  return (
    <Link href={href} className={className || undefined} {...props}>
      {children}
    </Link>
  );
};

export default ActiveLink;
