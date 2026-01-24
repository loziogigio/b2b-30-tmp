#!/bin/bash
# Test connection from vinc-b2b to vinc-commerce-suite backend

echo "🔍 Testing Backend Connection"
echo "================================"
echo ""

BACKEND_URL="http://localhost:3001"
TENANT_ID="${1:-your-tenant-id}"  # Pass tenant ID as argument or change this default

# Test 1: Backend Health Check
echo "1. Backend Health Check"
echo "   GET ${BACKEND_URL}/api/health"
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/api/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Backend is running"
    echo "   Response: ${HEALTH_RESPONSE}"
else
    echo "   ❌ Backend is NOT running on port 3001"
    echo "   Run: cd vinc-apps/vinc-commerce-suite && pnpm dev"
    exit 1
fi
echo ""

# Test 2: Public Collections API (no auth required)
echo "2. Public Collections API"
echo "   GET ${BACKEND_URL}/api/public/collections"
echo "   Headers: X-Tenant-ID: ${TENANT_ID}"
COLLECTIONS_RESPONSE=$(curl -s -H "X-Tenant-ID: ${TENANT_ID}" "${BACKEND_URL}/api/public/collections")
COLLECTIONS_COUNT=$(echo "${COLLECTIONS_RESPONSE}" | jq -r '.total // 0' 2>/dev/null)
if [ "${COLLECTIONS_COUNT}" == "null" ] || [ "${COLLECTIONS_COUNT}" == "0" ]; then
    echo "   ⚠️  No collections found (expected for fresh tenant)"
else
    echo "   ✅ Found ${COLLECTIONS_COUNT} collections"
fi
echo ""

# Test 3: Public Menu API
echo "3. Public Menu API"
echo "   GET ${BACKEND_URL}/api/public/menu"
echo "   Headers: X-Tenant-ID: ${TENANT_ID}"
MENU_RESPONSE=$(curl -s -H "X-Tenant-ID: ${TENANT_ID}" "${BACKEND_URL}/api/public/menu")
MENU_SUCCESS=$(echo "${MENU_RESPONSE}" | jq -r '.success // false' 2>/dev/null)
if [ "${MENU_SUCCESS}" == "true" ]; then
    MENU_ITEMS=$(echo "${MENU_RESPONSE}" | jq -r '.menu | length' 2>/dev/null)
    echo "   ✅ Menu API working (${MENU_ITEMS} items)"
else
    echo "   ⚠️  Menu API returned unexpected response"
fi
echo ""

# Test 4: Check MongoDB Connection
echo "4. MongoDB Database Check"
echo "   Database: vinc-${TENANT_ID}"
DB_CHECK=$(mongosh "mongodb://root:root@localhost:27017/vinc-${TENANT_ID}?authSource=admin" \
    --quiet --eval "db.getName()" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ MongoDB connection successful"
    echo "   Database: ${DB_CHECK}"

    # Count collections
    COLLECTIONS_IN_DB=$(mongosh "mongodb://root:root@localhost:27017/vinc-${TENANT_ID}?authSource=admin" \
        --quiet --eval "db.getCollectionNames().length" 2>/dev/null)
    echo "   Collections: ${COLLECTIONS_IN_DB}"
else
    echo "   ❌ Cannot connect to MongoDB"
    echo "   Check MongoDB is running: systemctl status mongod"
fi
echo ""

echo "================================"
echo "Summary:"
echo "- Backend: ${BACKEND_URL}"
echo "- Tenant: ${TENANT_ID}"
echo "- Database: vinc-${TENANT_ID}"
echo ""
echo "Next steps:"
echo "1. Start vinc-b2b: pnpm dev (port 3000)"
echo "2. Visit: http://localhost:3000"
echo ""
