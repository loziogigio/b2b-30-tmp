# Reminder Frontend Integration Plan

Complete implementation guide for integrating reminders with bell icon into Hidros customer_web, following the exact pattern of likes.

---

## Files to Create/Modify

### 1. ✅ API Endpoints (DONE)
**File:** `src/framework/basic-rest/utils/api-endpoints-b2b.ts`
- Added REMINDERS endpoints configuration

### 2. API Service Layer (TO CREATE)
**File:** `src/framework/basic-rest/reminders/index.ts`
- Create new file following `src/framework/basic-rest/likes/index.ts` pattern
- Functions to implement:
  - `toggleReminder(sku: string)`
  - `getReminderStatus(sku: string)`
  - `getBulkReminderStatus(skus: string[])`
  - `getUserReminders(page, pageSize)`
  - `getUserRemindersSummary()`
  - `clearAllUserReminders()`
  - `remindersHealthCheck()`

### 3. Reminders Reducer (TO CREATE)
**File:** `src/contexts/reminders/reminders.reducer.ts`
- Copy `src/contexts/likes/likes.reducer.ts` as template
- State shape:
  ```typescript
  interface RemindersState {
    items: ReminderItem[];           // Array of active reminders
    index: Record<string, number>;   // SKU -> array index map
    isEmpty: boolean;
    summary: RemindersSummary | null;
  }

  type ReminderItem = {
    sku: string;
    created_at?: string | null;
    expires_at?: string | null;
    is_active?: boolean;
  };
  ```
- Actions: ADD, REMOVE, UPDATE, HYDRATE, CLEAR, SET_SUMMARY

### 4. Reminders Context (TO CREATE)
**File:** `src/contexts/reminders/reminders.context.tsx`
- Copy `src/contexts/likes/likes.context.tsx` as template
- Provider interface:
  ```typescript
  interface RemindersProviderState extends RemindersState {
    hasReminder: (sku: string) => boolean;
    add: (sku: string, createdAt?: string) => Promise<void>;
    remove: (sku: string) => Promise<void>;
    toggle: (sku: string) => Promise<void>;
    hydrateFromServer: (...) => void;
    loadUserReminders: (...) => Promise<void>;
    loadBulkStatus: (skus: string[]) => Promise<Record<string, boolean>>;
    clearAll: () => Promise<void>;
  }
  ```
- Hook: `useReminders()`
- LocalStorage key: `hidros-app-reminders`

### 5. UI Context Update (TO MODIFY)
**File:** `src/contexts/ui.context.tsx`
- Add `RemindersProvider` to ManagedUIContext
  ```tsx
  <LikesProvider>
    <RemindersProvider>
      <ModalProvider>{children}</ModalProvider>
    </RemindersProvider>
  </LikesProvider>
  ```

### 6. Product Card Component (TO MODIFY)
**File:** `src/components/product/product-cards/product-card-b2b.tsx`
- Add bell icon next to heart icon
- Import: `import { IoIosBell, IoIosBellOutline } from 'react-icons/io'`
- Only show bell when product is NOT available (out of stock)
- Position: Right next to heart icon

### 7. Product Card Horizontal (TO MODIFY)
**File:** `src/components/product/product-cards/product-card-b2b-horizontal.tsx`
- Same as above for horizontal layout

### 8. Product Detail Page (TO MODIFY)
**File:** `src/components/product/product-b2b-details.tsx`
- Add bell icon in header/metadata section
- Only show when out of stock

### 9. My Account - Reminders Page (OPTIONAL - TO CREATE)
**File:** `src/components/my-account/reminders.tsx`
- Show list of user's active reminders
- Similar to wishlist page

---

## Implementation Code Templates

### API Service (`src/framework/basic-rest/reminders/index.ts`)

```typescript
import { get, post, del } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';

export type ReminderToggleAction = 'created' | 'cancelled';

export interface ReminderToggleResponse {
  sku: string;
  user_id: string;
  action: ReminderToggleAction;
  has_active_reminder: boolean;
}

export interface ReminderStatusResponse {
  sku: string;
  has_active_reminder: boolean;
  product_available: boolean;
  reminder_created_at?: string | null;
}

export interface BulkReminderStatusResponse {
  user_id: string;
  reminder_statuses: { sku: string; has_active_reminder: boolean }[];
}

export interface UserRemindersItem {
  id: string;
  sku: string;
  status: 'active' | 'notified' | 'expired' | 'cancelled';
  email?: string | null;
  created_at: string;
  notified_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export interface UserRemindersResponse {
  reminders: UserRemindersItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface UserRemindersSummary {
  user_id: string;
  total_reminders: number;
  active: number;
  notified: number;
  expired: number;
  cancelled: number;
}

const EP = API_ENDPOINTS_B2B.REMINDERS;
const PROJECT_CODE = (process.env.NEXT_PUBLIC_PROJECT_CODE || 'APP') as string;
const getUserId = () => `${PROJECT_CODE}-${ERP_STATIC.customer_code}-${ERP_STATIC.address_code}`;

export async function toggleReminder(sku: string, email?: string): Promise<ReminderToggleResponse> {
  return post<ReminderToggleResponse>(EP.TOGGLE, {
    user_id: getUserId(),
    sku,
    email,
    expires_in_days: 30
  });
}

export async function getReminderStatus(sku: string, userId: string = getUserId()): Promise<ReminderStatusResponse> {
  return get<ReminderStatusResponse>(EP.STATUS(userId, sku));
}

export async function getBulkReminderStatus(skus: string[], userId: string = getUserId()): Promise<BulkReminderStatusResponse> {
  return post<BulkReminderStatusResponse>(EP.BULK_STATUS, { user_id: userId, skus });
}

export async function getUserReminders(
  page = 1,
  pageSize = 20,
  userId: string = getUserId(),
  statusFilter?: 'active' | 'notified' | 'expired' | 'cancelled'
): Promise<UserRemindersResponse> {
  const params: any = { page: String(page), page_size: String(pageSize) };
  if (statusFilter) params.status_filter = statusFilter;
  const qs = new URLSearchParams(params).toString();
  return get<UserRemindersResponse>(`${EP.USER(userId)}?${qs}`);
}

export async function getUserRemindersSummary(userId: string = getUserId()): Promise<UserRemindersSummary> {
  return get<UserRemindersSummary>(EP.USER_SUMMARY(userId));
}

export async function clearAllUserReminders(userId: string = getUserId()): Promise<any> {
  return del(EP.CLEAR_ALL(userId));
}

export async function remindersHealthCheck(): Promise<{ status: string; service: string }> {
  return get(EP.HEALTH);
}
```

### Bell Icon Component in Product Card

```tsx
// In product-card-b2b.tsx, add after heart icon:

import { IoIosBell, IoIosBellOutline } from 'react-icons/io';
import { useReminders } from '@contexts/reminders/reminders.context';

// Inside component:
const reminders = useReminders();
const hasReminder = sku ? reminders.hasReminder(sku) : false;
const [reminderLoading, setReminderLoading] = React.useState<boolean>(false);

// Check if product is out of stock
const isOutOfStock = !priceData || priceData.availability === 0; // Adjust based on your data structure

// Render (next to heart icon):
{isAuthorized && isOutOfStock && (
  <button
    type="button"
    aria-label="Toggle reminder"
    className={cn(
      'shrink-0 ml-2 p-1 rounded transition-colors',
      hasReminder ? 'text-orange-500' : 'text-gray-400 hover:text-brand'
    )}
    onClick={async (e) => {
      e.stopPropagation();
      try {
        setReminderLoading(true);
        if (!sku) return;
        await reminders.toggle(sku);
      } finally {
        setReminderLoading(false);
      }
    }}
    disabled={reminderLoading || !sku}
    title={hasReminder ? t('text-reminder-active') : t('text-notify-when-available')}
  >
    {hasReminder ? (
      <IoIosBell className="text-[18px]" />
    ) : (
      <IoIosBellOutline className="text-[18px]" />
    )}
  </button>
)}
```

---

## UI/UX Specifications

### Icon Colors
- **Active reminder** (filled bell): `text-orange-500` or `text-yellow-500`
- **No reminder** (outline bell): `text-gray-400 hover:text-brand`
- Icon size: `text-[18px]` (matches heart)

### Visibility Rules
- **Show bell ONLY when:**
  1. User is authorized/logged in
  2. Product is out of stock (availability = 0 or not available)
- **Hide bell when:**
  1. Product is in stock
  2. User is not logged in

### Positioning
- **Product Card:** Right next to heart icon (after heart)
- **Product Detail:** In the same section as heart icon
- **Spacing:** `ml-2` (8px margin-left) between heart and bell

### Interaction
- **Click:** Toggle reminder on/off
- **Loading state:** Disable button while API call in progress
- **Tooltip:**
  - Active: "Reminder active"
  - Inactive: "Notify me when available"

---

## i18n Keys to Add

Add to your translation files (e.g., `public/locales/*/common.json`):

```json
{
  "text-reminder": "Reminder",
  "text-reminder-active": "Reminder active - you'll be notified when available",
  "text-notify-when-available": "Notify me when back in stock",
  "text-remove-reminder": "Remove reminder",
  "text-my-reminders": "My Reminders",
  "text-reminders": "Reminders",
  "text-active-reminders": "Active Reminders",
  "text-no-reminders": "No active reminders",
  "text-reminder-added": "Reminder added! We'll notify you when available.",
  "text-reminder-removed": "Reminder removed"
}
```

---

## Testing Checklist

- [ ] API endpoints respond correctly
- [ ] Bell icon appears only when out of stock
- [ ] Bell icon toggles on click
- [ ] Active state (filled bell) shows correctly
- [ ] Loading state disables button
- [ ] Bell appears next to heart in product cards
- [ ] Bell appears in product detail page
- [ ] LocalStorage persists reminder state
- [ ] Bulk status loads efficiently
- [ ] User reminders page shows all reminders
- [ ] Translations work for all languages

---

## Next Steps

1. Create API service file
2. Create reducer file
3. Create context file
4. Add to ManagedUIContext
5. Update product card components
6. Update product detail page
7. Test thoroughly
8. Add translations
9. Create reminders list page (optional)

---

Ready to proceed with file creation?
