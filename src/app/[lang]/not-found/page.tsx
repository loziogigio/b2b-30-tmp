// not-found.tsx
'use client';

import { redirect, usePathname } from 'next/navigation';

const notFoundPath = '/not-found';

export default function NotFound() {
  const pathname = usePathname();
  // Prevent infinite redirect in case not-found page does not exist
  if (pathname === notFoundPath) {
    console.error('not-found page does not exist');
    redirect('/');
  }
  redirect(notFoundPath);
}
