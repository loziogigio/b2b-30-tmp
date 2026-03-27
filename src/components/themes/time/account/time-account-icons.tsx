const s = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const };

export function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...s} strokeWidth="1.6">
      <rect x="1" y="1" width="7" height="7" rx="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function IconCoins() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M15 9.5c-.3-1-1.3-1.5-3-1.5s-3 .7-3 2 1.3 2 3 2 3 .7 3 2-1.3 2-3 2" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconMessage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="2.5">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

export function IconTruck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16,8 20,8 23,11 23,16 16,16" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function IconMapPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s} strokeWidth="2.5">
      <polyline points="9,6 15,12 9,18" />
    </svg>
  );
}

export function IconPrint() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="1.8">
      <polyline points="6,9 6,2 18,2 18,9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
