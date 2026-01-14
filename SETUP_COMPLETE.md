# vinc-b2b Setup Complete

## What Was Done

### 1. Fixed Translation Labels

Updated authentication forms to load both `common` and `forms` namespaces:

- [src/components/auth/login-form.tsx](src/components/auth/login-form.tsx)
- [src/components/auth/sign-up-form.tsx](src/components/auth/sign-up-form.tsx)
- [src/components/auth/forget-password-form.tsx](src/components/auth/forget-password-form.tsx)

**Result:** Login page now shows proper Italian translations:

- "label-email" → "Indirizzo email"
- "label-password" → "Password"
- "label-remember-me" → "Ricordami"

### 2. Configured Backend Connection

Updated [.env](.env) to connect to local vinc-commerce-suite backend:

```bash
# Tenant Configuration
NEXT_PUBLIC_TENANT_ID=your-tenant-id
NEXT_PUBLIC_PROJECT_CODE=vinc-your-tenant-id

# MongoDB (same database as backend)
MONGO_URL=mongodb://root:root@localhost:27017/?authSource=admin
MONGO_DB=vinc-your-tenant-id

# Backend APIs (localhost:3001)
PIM_API_PRIVATE_URL=http://localhost:3001
NEXT_PUBLIC_PIM_API_URL=http://localhost:3001
NEXT_PUBLIC_COMMERCE_API_URL=http://localhost:3001/api/public
NEXT_PUBLIC_B2B_BUILDER_URL=http://localhost:3001
```

### 3. Multi-Tenant Configuration

Created tenant-specific .env files for easy switching between tenants:

**Available configurations:**

- `.env.tenant-a` - Tenant A configuration
- `.env.tenant-b` - Tenant B configuration

**Switch between tenants:**

```bash
# For Tenant A
cp .env.tenant-a .env

# For Tenant B
cp .env.tenant-b .env
```

**Refactored MongoDB connection code** to use generic variable names:

- `MONGO_URL` (instead of tenant-specific names)
- `MONGO_DB` (instead of tenant-specific names)
- `MONGO_MIN_POOL_SIZE`
- `MONGO_MAX_POOL_SIZE`

This allows easy tenant switching without code changes.

### 4. Created Documentation

- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Complete development setup guide
- [test-backend-connection.sh](test-backend-connection.sh) - Connection verification script

## Quick Start

### 1. Test Backend Connection

```bash
./test-backend-connection.sh
```

This checks:

- Backend is running on port 3001
- Public APIs are accessible
- MongoDB database exists
- Tenant configuration is correct

### 2. Start Both Services

**Terminal 1 - Backend:**

```bash
cd /path/to/vinc-apps/vinc-commerce-suite
pnpm dev
```

Backend runs on: http://localhost:3001

**Terminal 2 - Storefront:**

```bash
cd /path/to/vinc-b2b
pnpm dev
```

Storefront runs on: http://localhost:3000

### 3. Access the Sites

| Service          | URL                             | Description       |
| ---------------- | ------------------------------- | ----------------- |
| **Storefront**   | http://localhost:3000           | Customer B2B shop |
| **Admin Portal** | http://localhost:3001/b2b/login | PIM management    |
| **Builder**      | http://localhost:3001/b2b/home-settings | Page builder |

## Architecture

```
┌─────────────────┐        ┌──────────────────────┐
│   vinc-b2b      │        │ vinc-commerce-suite  │
│   Port 3000     │◄──────►│   Port 3001          │
│                 │        │                      │
│ - Storefront    │        │ - PIM Backend        │
│ - Customer UI   │        │ - Admin Portal       │
│ - Product Views │        │ - API Endpoints      │
└─────────────────┘        └──────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
            ┌────────────────┐
            │   MongoDB       │
            │   localhost     │
            │   vinc-tenant   │
            └────────────────┘
```

## API Integration

The storefront uses the following APIs from the backend:

### Public APIs (No Auth Required)

```bash
# Collections
GET http://localhost:3001/api/public/collections
Headers: X-Tenant-ID: your-tenant-id

# Product Search
POST http://localhost:3001/api/public/search
Headers: X-Tenant-ID: your-tenant-id
Body: { "query": "pump", "page": 1, "limit": 20 }

# Menu
GET http://localhost:3001/api/public/menu
Headers: X-Tenant-ID: your-tenant-id
```

### B2B APIs (Session Required)

```bash
# Customers (via session cookie)
GET http://localhost:3001/api/b2b/customers
Cookie: vinc_b2b_session=...

# Orders
GET http://localhost:3001/api/b2b/orders
Cookie: vinc_b2b_session=...
```

## Configuration Files

### vinc-b2b Environment (.env)

```bash
# Tenant
NEXT_PUBLIC_TENANT_ID=your-tenant-id
NEXT_PUBLIC_PROJECT_CODE=vinc-your-tenant-id

# Backend
NEXT_PUBLIC_PIM_API_URL=http://localhost:3001
NEXT_PUBLIC_COMMERCE_API_URL=http://localhost:3001/api/public

# Database
MONGO_URL=mongodb://root:root@localhost:27017/?authSource=admin
MONGO_DB=vinc-your-tenant-id

# Settings
NEXT_PUBLIC_REQUIRE_LOGIN=true
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
```

### vinc-commerce-suite Environment (.env)

```bash
# MongoDB
VINC_MONGO_URL=mongodb://root:root@localhost:27017/?authSource=admin
VINC_TENANT_ID=your-tenant-id

# Solr
SOLR_URL=http://your-solr-server:8983/solr
SOLR_ENABLED=true

# Server
PORT=3001
```

## Common Workflows

### Import Products from BMS

```bash
cd /path/to/doc/export/time-to-pim

# Import 100 products
npx tsx 01-sync-core.ts your-tenant-config --limit 100

# Verify import
node /path/to/vinc-commerce-suite/scripts/check-pim-count.cjs your-tenant-id
```

### Create Test Customer

1. Login to admin portal: http://localhost:3001/b2b/login
2. Navigate to Customers → Add Customer
3. Create a test customer with email/password
4. Use those credentials to login on storefront (port 3000)

### Clear Test Data

```bash
cd /path/to/vinc-commerce-suite

# Clear products
npx tsx scripts/clear-products.ts your-tenant-id

# Clear orders/customers
npx tsx scripts/clear-all-data.ts your-tenant-id

# Clear stuck jobs
node scripts/cleanup-stuck-jobs.js your-tenant-id
```

## Troubleshooting

### Issue: Login page shows translation keys (label-email, etc.)

**Status:** **FIXED!**

The authentication forms now correctly load both translation namespaces.

### Issue: "Cannot connect to backend"

**Check:**

1. Backend is running: `curl http://localhost:3001/api/health`
2. MongoDB is running: `systemctl status mongod`
3. Tenant database exists: `node scripts/check-tenant.cjs your-tenant-id`

### Issue: Empty product catalog

**Solution:**
Import products from BMS:

```bash
cd /path/to/doc/export/time-to-pim
npx tsx 01-sync-core.ts your-tenant-config --limit 100
```

### Issue: CORS errors in browser

**Check:**
The backend middleware sets CORS headers allowing all origins:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, X-Tenant-ID, ...
```

If still having issues, verify in browser DevTools → Network tab.

## Next Steps

1. Backend configured and running
2. Storefront configured and running
3. Translation labels fixed
4. Import sample products from BMS
5. Create test customer account
6. Test end-to-end ordering flow
7. Configure home page builder
8. Set up payment processing (if needed)

## Additional Resources

- **Setup Guide:** [LOCAL_SETUP.md](LOCAL_SETUP.md)
- **Connection Test:** [test-backend-connection.sh](test-backend-connection.sh)
- **Backend CLAUDE.md:** `/vinc-apps/vinc-commerce-suite/CLAUDE.md`
- **BMS Sync Guide:** `/doc/export/time-to-pim/COMPLETE_SYNC_GUIDE.md`

## Support

If you encounter issues:

1. Check the logs in both terminal windows
2. Run the connection test script
3. Verify environment variables are set correctly
4. Check MongoDB is running and accessible
5. Ensure ports 3000 and 3001 are not in use by other services
