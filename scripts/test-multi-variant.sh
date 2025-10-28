#!/bin/bash
# Multi-Variant Publishing System - Smoke Test Script
# Tests campaign persistence, segment targeting, and API endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api/pages"
LANG="${LANG:-it}"

echo "🧪 Multi-Variant Publishing System - Smoke Test"
echo "================================================"
echo "Base URL: $BASE_URL"
echo "Language: $LANG"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test results
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAILED++))
  fi
}

# Test 1: List versions for home page
echo "Test 1: List all versions for 'home' page"
echo "-------------------------------------------"
RESPONSE=$(curl -s "${API_BASE}/home/publish")
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "GET /api/pages/home/publish returns valid JSON"

VERSION_COUNT=$(echo "$RESPONSE" | jq '.versions | length' 2>/dev/null || echo "0")
echo "Found $VERSION_COUNT version(s)"
echo ""

# Test 2: Resolve page with no context (should return default)
echo "Test 2: Resolve page with no context (default version)"
echo "--------------------------------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "POST /api/pages/home/resolve with empty context returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  VERSION=$(echo "$RESPONSE" | jq -r '.data.version' 2>/dev/null || echo "unknown")
  MATCHED_BY=$(echo "$RESPONSE" | jq -r '.data.matchedBy' 2>/dev/null || echo "unknown")
  echo "  → Resolved to version: $VERSION (matchedBy: $MATCHED_BY)"
  test_result 0 "Default version resolved successfully"
else
  test_result 1 "Default version resolution failed"
fi
echo ""

# Test 3: Resolve with campaign tag
echo "Test 3: Resolve with campaign tag"
echo "-----------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"campaign":"google-ads-test"}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "Resolve with campaign='google-ads-test' returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  MATCHED_BY=$(echo "$RESPONSE" | jq -r '.data.matchedBy' 2>/dev/null || echo "unknown")
  echo "  → Match type: $MATCHED_BY"

  if [ "$MATCHED_BY" = "campaign" ]; then
    test_result 0 "Campaign-specific version matched"
  elif [ "$MATCHED_BY" = "default" ]; then
    echo -e "  ${YELLOW}ℹ INFO${NC}: No campaign-specific version exists, fell back to default"
    test_result 0 "Fallback to default version works"
  else
    test_result 0 "Version resolved (matchedBy: $MATCHED_BY)"
  fi
else
  test_result 1 "Campaign resolution failed"
fi
echo ""

# Test 4: Resolve with segment tag
echo "Test 4: Resolve with segment tag"
echo "----------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"segment":"vip"}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "Resolve with segment='vip' returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  MATCHED_BY=$(echo "$RESPONSE" | jq -r '.data.matchedBy' 2>/dev/null || echo "unknown")
  echo "  → Match type: $MATCHED_BY"
  test_result 0 "Segment resolution completed"
else
  test_result 1 "Segment resolution failed"
fi
echo ""

# Test 5: Resolve with multi-criteria (campaign + segment)
echo "Test 5: Resolve with multi-criteria (campaign + segment)"
echo "---------------------------------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"campaign":"google-ads-test","segment":"vip"}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "Resolve with campaign+segment returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  MATCHED_BY=$(echo "$RESPONSE" | jq -r '.data.matchedBy' 2>/dev/null || echo "unknown")
  echo "  → Match type: $MATCHED_BY"
  test_result 0 "Multi-criteria resolution completed"
else
  test_result 1 "Multi-criteria resolution failed"
fi
echo ""

# Test 6: Resolve with attributes (device, region, language)
echo "Test 6: Resolve with attributes (device, region, language)"
echo "------------------------------------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"campaign":"mobile-campaign","attributes":{"device":"mobile","region":"us-east","language":"en"}}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "Resolve with attributes returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  MATCHED_BY=$(echo "$RESPONSE" | jq -r '.data.matchedBy' 2>/dev/null || echo "unknown")
  echo "  → Match type: $MATCHED_BY"
  test_result 0 "Attribute-based resolution completed"
else
  test_result 1 "Attribute-based resolution failed"
fi
echo ""

# Test 7: GET endpoint (query params instead of POST body)
echo "Test 7: GET endpoint with query parameters"
echo "-------------------------------------------"
RESPONSE=$(curl -s "${API_BASE}/home/resolve?campaign=google-ads-test&segment=vip")
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "GET /api/pages/home/resolve?campaign=... returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
test_result $([ "$SUCCESS" = "true" ] && echo 0 || echo 1) "GET endpoint resolution works"
echo ""

# Test 8: Preview mode (includeDraft=true)
echo "Test 8: Preview mode (draft versions)"
echo "--------------------------------------"
RESPONSE=$(curl -s -X POST "${API_BASE}/home/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"preview":true}')
echo "$RESPONSE" | jq '.' > /dev/null 2>&1
test_result $? "Preview mode returns valid JSON"

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
  STATUS=$(echo "$RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "unknown")
  echo "  → Version status: $STATUS"
  test_result 0 "Preview mode resolution completed"
else
  test_result 1 "Preview mode resolution failed"
fi
echo ""

# Test 9: Invalid slug (should return 404)
echo "Test 9: Invalid slug (error handling)"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/nonexistent-page-slug/resolve")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "404" ]; then
  test_result 0 "Invalid slug returns 404 status"
else
  test_result 1 "Invalid slug should return 404, got $HTTP_CODE"
fi
echo ""

# Test 10: Publish endpoint - Update version metadata
echo "Test 10: Update version metadata (if version 1 exists)"
echo "--------------------------------------------------------"

# First check if version 1 exists
VERSIONS_RESPONSE=$(curl -s "${API_BASE}/home/publish")
HAS_VERSION_1=$(echo "$VERSIONS_RESPONSE" | jq '.versions[] | select(.version == 1)' 2>/dev/null)

if [ -n "$HAS_VERSION_1" ]; then
  echo "Version 1 exists, testing update..."

  RESPONSE=$(curl -s -X POST "${API_BASE}/home/publish" \
    -H 'Content-Type: application/json' \
    -d '{
      "versionNumber": 1,
      "campaign": "test-campaign-from-script",
      "segment": "test-segment",
      "priority": 10,
      "comment": "Updated by smoke test script"
    }')

  echo "$RESPONSE" | jq '.' > /dev/null 2>&1
  test_result $? "Publish endpoint update returns valid JSON"

  SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
  if [ "$SUCCESS" = "true" ]; then
    UPDATED_CAMPAIGN=$(echo "$RESPONSE" | jq -r '.version.tags.campaign' 2>/dev/null || echo "")
    echo "  → Updated campaign tag: $UPDATED_CAMPAIGN"
    test_result 0 "Version metadata updated successfully"
  else
    test_result 1 "Version metadata update failed"
  fi
else
  echo -e "${YELLOW}ℹ INFO${NC}: Version 1 doesn't exist, skipping update test"
  test_result 0 "Skipped (no version 1 available)"
fi
echo ""

# Summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi