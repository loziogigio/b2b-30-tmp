'use client';

import * as React from 'react';

type Props = React.SVGProps<SVGSVGElement> & { className?: string };

export default function CompanyIcon({ className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M3 20.25A1.75 1.75 0 0 0 4.75 22h14.5A1.75 1.75 0 0 0 21 20.25V9.5a.75.75 0 0 0-.75-.75H14V4.75A1.75 1.75 0 0 0 12.25 3h-7.5A1.75 1.75 0 0 0 3 4.75v15.5Zm1.5 0V4.75c0-.138.112-.25.25-.25h7.5c.138 0 .25.112.25.25V20.25H4.5Zm10 0V10.25h4.75c.138 0 .25.112.25.25v9.75c0 .414-.336.75-.75.75H14.5c-.276 0-.5-.224-.5-.5ZM6.75 7.25h1.5v1.5h-1.5v-1.5Zm0 3h1.5v1.5h-1.5v-1.5Zm0 3h1.5v1.5h-1.5v-1.5Zm3-6h1.5v1.5h-1.5v-1.5Zm0 3h1.5v1.5h-1.5v-1.5Zm0 3h1.5v1.5h-1.5v-1.5Zm4.75-1.5h1.5v1.5h-1.5v-1.5Zm0 3h1.5v1.5h-1.5v-1.5Z" />
    </svg>
  );
}
