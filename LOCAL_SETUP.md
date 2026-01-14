# Local Development Setup - vinc-b2b with PIM Backend

This guide explains how to run the vinc-b2b storefront locally connected to the vinc-commerce-suite PIM backend.

## Architecture

```
vinc-b2b (port 3000)          vinc-commerce-suite (port 3001)
Customer Storefront     <-->   PIM Backend + Admin Portal
```

## Prerequisites

1. **MongoDB** running at `localhost:27017` with credentials `root:root`
2. **vinc-commerce-suite** backend running on port 3001
3. **Node.js** and **pnpm** installed

## Configuration

The `.env` file has been configured for local development:

```bash
# Tenant
NEXT_PUBLIC_TENANT_ID=your-tenant-id
NEXT_PUBLIC_PROJECT_CODE=vinc-your-tenant-id

# MongoDB (same database as backend)
MONGO_URL=mongodb://root:root@localhost:27017/?authSource=admin
MONGO_DB=vinc-your-tenant-id

# Backend APIs (vinc-commerce-suite on port 3001)
PIM_API_PRIVATE_URL=http://localhost:3001
NEXT_PUBLIC_PIM_API_URL=http://localhost:3001
NEXT_PUBLIC_COMMERCE_API_URL=http://localhost:3001/api/public

# Storefront
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
NEXT_PUBLIC_REQUIRE_LOGIN=true
```

## Switching Between Tenants

The project supports multiple tenant configurations for local development. To switch between tenants:

### 1. Copy the tenant-specific .env file

```bash
# For Tenant A
cp .env.tenant-a .env

# For Tenant B
cp .env.tenant-b .env
```

### 2. Restart the dev server

```bash
pnpm dev
```

### 3. Verify tenant configuration

- Check browser console for `NEXT_PUBLIC_TENANT_ID`
- Verify API calls include correct `X-Tenant-ID` header
- Ensure MongoDB connection points to correct database

### Available Tenant Configurations

| Tenant   | File           | Database           | Domain              |
| -------- | -------------- | ------------------ | ------------------- |
| Tenant A | `.env.tenant-a` | `vinc-tenant-a`   | `b2b.tenant-a.com`  |
| Tenant B | `.env.tenant-b` | `vinc-tenant-b`   | `b2b.tenant-b.com`  |

**Note:** Each tenant uses the same backend (localhost:3001) but connects to a different MongoDB database. Make sure the corresponding tenant database exists in MongoDB before switching.

## Step-by-Step Setup

### 1. Start the Backend (vinc-commerce-suite)

```bash
cd /path/to/vinc-apps/vinc-commerce-suite

# Start the dev server
pnpm dev

# Backend will be available at http://localhost:3001
```

**Admin Portal URL:** http://localhost:3001/b2b/login

### 2. Start the Storefront (vinc-b2b)

```bash
cd /path/to/vinc-b2b

# Install dependencies (first time only)
pnpm install

# Start the dev server
pnpm dev

# Storefront will be available at http://localhost:3000
```

### 3. Access the Sites

| Service          | URL                             | Purpose                           |
| ---------------- | ------------------------------- | --------------------------------- |
| **Storefront**   | http://localhost:3000           | Customer-facing B2B shop          |
| **Admin Portal** | http://localhost:3001/b2b/login | PIM management, orders, customers |

## Login & Authentication

### Backend Admin Login (port 3001)

The vinc-commerce-suite backend has B2B admin users in the `b2busers` collection:

```bash
# Check if admin user exists
node scripts/check-tenant.cjs your-tenant-id
```

**Default admin credentials** (if seeded):

- Email: `admin@your-domain.com`
- Password: (check with team)

### Storefront Login (port 3000)

The storefront requires **customer accounts** from the `customers` collection. These are created via:

- Admin portal → Customers section
- API imports from legacy systems
- Registration requests

**Test customer credentials:**

- You may need to create a test customer through the admin portal first

## Verification Checklist

**Backend (port 3001)**

```bash
# 1. Check backend is running
curl http://localhost:3001/api/health

# 2. Verify tenant database exists
node scripts/check-tenant.cjs your-tenant-id

# 3. Check admin user exists
# Login at http://localhost:3001/b2b/login
```

**Storefront (port 3000)**

```bash
# 1. Check storefront is running
curl http://localhost:3000/api/health

# 2. Visit homepage (should show login page if REQUIRE_LOGIN=true)
# http://localhost:3000
```

**Database**

```bash
# Check MongoDB connection
mongosh "mongodb://root:root@localhost:27017/?authSource=admin"

# Switch to tenant database
use vinc-your-tenant-id

# Check collections exist
show collections
# Expected: b2busers, customers, pimproducts, categories, etc.
```

## Common Issues

### Issue: "Login Required" page on storefront

**Cause:** `NEXT_PUBLIC_REQUIRE_LOGIN=true` requires authentication

**Solutions:**

1. Create a customer account via admin portal
2. Or set `NEXT_PUBLIC_REQUIRE_LOGIN=false` for public access

### Issue: API calls failing with 404

**Cause:** Backend not running or wrong URL

**Solution:**

```bash
# Check backend status
curl http://localhost:3001/api/health

# Restart backend if needed
cd vinc-apps/vinc-commerce-suite
pnpm dev
```

### Issue: Empty product catalog

**Cause:** No products imported yet

**Solution:**

```bash
# Sync products from BMS
cd /path/to/doc/export/time-to-pim
npx tsx 01-sync-core.ts your-tenant-config --limit 100

# Or use the PIM import UI at http://localhost:3001/b2b/pim/products
```

### Issue: Translation keys showing (label-email, label-password)

**Fixed!** The login form translations have been updated to load both `common` and `forms` namespaces.

## Development Workflow

1. **Start both servers:**

   ```bash
   # Terminal 1: Backend
   cd vinc-apps/vinc-commerce-suite && pnpm dev

   # Terminal 2: Storefront
   cd vinc-b2b && pnpm dev
   ```

2. **Make changes:**

   - Backend changes auto-reload via Next.js
   - Storefront changes auto-reload via Next.js
   - Both support hot module replacement

3. **Test the flow:**
   - Import products via admin portal (port 3001)
   - View products on storefront (port 3000)
   - Create orders, manage cart, etc.

## API Endpoints Reference

### Public APIs (accessible from storefront)

```bash
# Get collections
GET http://localhost:3001/api/public/tenants/your-tenant-id/collections

# Search products
POST http://localhost:3001/api/public/tenants/your-tenant-id/search
```

### B2B APIs (require authentication)

```bash
# Get customers (requires B2B session)
GET http://localhost:3001/api/b2b/customers

# Get orders (requires B2B session)
GET http://localhost:3001/api/b2b/orders
```

### PIM Import API (requires API key)

```bash
# Batch import products
POST http://localhost:3001/api/b2b/pim/import/api
Headers:
  x-auth-method: api-key
  x-api-key-id: ak_your-tenant-id_aabbccddeeff
  x-api-secret: sk_aabbccddeeff00112233445566778899
```

## Next Steps

1. Backend running on port 3001
2. Storefront running on port 3000
3. Translation labels fixed
4. Create test customer account
5. Import sample products
6. Test end-to-end ordering flow

## Additional Resources

- **Backend README:** `/vinc-apps/vinc-commerce-suite/README.md`
- **CLAUDE.md:** Project conventions and guidelines
- **Sync Scripts:** `/doc/export/time-to-pim/`
