// app/[lang]/account/page.tsx
import { redirect } from 'next/navigation';

export default function AccountPage() {
  redirect('account/profile'); // relative path → /[lang]/account/profile
}
