#!/bin/bash

# VINC B2B Docker Build Script
# Supports both single-tenant and multi-tenant builds
#
# Usage:
#   Single-tenant: ./build-docker.sh <tenant> [version] [--push]
#   Multi-tenant:  ./build-docker.sh multi [version] [--push]
#
# Examples:
#   ./build-docker.sh tenant-a              # single-tenant using .env.deploy.tenant-a
#   ./build-docker.sh tenant-a 2.1.6        # override version
#   ./build-docker.sh tenant-b --push       # build and push using config version
#   ./build-docker.sh multi                 # multi-tenant using .env.deploy.multi
#   ./build-docker.sh multi 2.1.6 --push    # multi-tenant with version and push

set -e

# ============================================================================
# Arguments
# ============================================================================
TENANT=${1:-""}

# Handle case where second arg is --push (no version override)
if [[ "$2" == "--push" ]]; then
    VERSION_ARG=""
    PUSH="--push"
else
    VERSION_ARG=${2:-""}
    PUSH=${3:-""}
fi

# ============================================================================
# Validation
# ============================================================================
if [ -z "$TENANT" ]; then
    echo "Usage: ./build-docker.sh <tenant|multi> [version] [--push]"
    echo ""
    echo "Build modes:"
    echo "  <tenant>  - Single-tenant build (uses .env.deploy.<tenant>)"
    echo "  multi     - Multi-tenant build (uses .env.deploy.multi)"
    echo ""
    echo "Available configurations:"
    for f in .env.deploy.*; do
        if [ -f "$f" ]; then
            config_name=$(echo "$f" | sed 's/.env.deploy.//')
            if [[ "$config_name" == "multi" ]]; then
                echo "  - multi (multi-tenant)"
            else
                echo "  - $config_name"
            fi
        fi
    done
    echo ""
    echo "Examples:"
    echo "  ./build-docker.sh tenant-a 2.1.5"
    echo "  ./build-docker.sh tenant-b 2.1.5 --push"
    echo "  ./build-docker.sh multi 2.1.5 --push"
    exit 1
fi

ENV_FILE=".env.deploy.${TENANT}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Configuration file '$ENV_FILE' not found!"
    echo ""
    echo "Available configurations:"
    for f in .env.deploy.*; do
        if [ -f "$f" ]; then
            config_name=$(echo "$f" | sed 's/.env.deploy.//')
            echo "  - $config_name"
        fi
    done
    exit 1
fi

# ============================================================================
# Load Configuration
# ============================================================================
echo "Loading configuration: $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

# Use VERSION from argument, or config file, or default
VERSION=${VERSION_ARG:-${VERSION:-"1.0.0"}}

# Determine build mode
IS_MULTI_TENANT=false
if [[ "$TENANT" == "multi" ]] || [[ "${TENANT_MODE}" == "multi" ]]; then
    IS_MULTI_TENANT=true
fi

# Set image name based on mode
if [[ "$IS_MULTI_TENANT" == "true" ]]; then
    IMAGE_NAME=${DOCKER_IMAGE:-"crowdechain/vinc-b2b"}
else
    IMAGE_NAME=${DOCKER_IMAGE:-"crowdechain/vinc-b2b-${TENANT}"}
fi

echo ""
echo "========================================"
echo "  VINC B2B Docker Build"
echo "========================================"
echo "Mode:    $([ "$IS_MULTI_TENANT" == "true" ] && echo "Multi-tenant" || echo "Single-tenant")"
echo "Config:  ${ENV_FILE}"
echo "Image:   ${IMAGE_NAME}:${VERSION}"
echo "========================================"
echo ""

# ============================================================================
# Display Build Arguments
# ============================================================================
echo "Build Arguments:"

if [[ "$IS_MULTI_TENANT" == "true" ]]; then
    echo "  Multi-Tenant Config:"
    echo "    TENANT_MODE=multi"
    echo "    MONGO_URL=(provided by cluster at runtime)"
    echo "    MONGO_DB=(provided by cluster at runtime)"
    echo "    POOL_MAX_CONNECTIONS=${POOL_MAX_CONNECTIONS:-50}"
    echo "    POOL_PER_DB_SIZE=${POOL_PER_DB_SIZE:-10}"
    echo "    TENANT_CACHE_TTL_SECONDS=${TENANT_CACHE_TTL_SECONDS:-300}"
    echo ""
else
    echo "  Single-Tenant Config:"
    echo "    TENANT_MODE=single"
    echo "    NEXT_PUBLIC_TENANT_ID=${NEXT_PUBLIC_TENANT_ID}"
    echo "    NEXT_PUBLIC_PROJECT_CODE=${NEXT_PUBLIC_PROJECT_CODE}"
    echo "    NEXT_PROJECT_CODE=${NEXT_PROJECT_CODE}"
    echo ""
    echo "  API Keys:"
    echo "    NEXT_PUBLIC_API_KEY_ID=${NEXT_PUBLIC_API_KEY_ID}"
    echo "    NEXT_PUBLIC_API_SECRET=***hidden***"
    echo ""
fi

echo "  PIM/Commerce Suite:"
echo "    NEXT_PUBLIC_PIM_API_URL=${NEXT_PUBLIC_PIM_API_URL}"
echo "    PIM_API_PRIVATE_URL=${PIM_API_PRIVATE_URL}"
echo "    NEXT_PUBLIC_SSO_URL=${NEXT_PUBLIC_SSO_URL}"
echo "    NEXT_PUBLIC_B2B_BUILDER_URL=${NEXT_PUBLIC_B2B_BUILDER_URL}"
echo ""
echo "  Storefront:"
echo "    NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL}"
echo "    NEXT_PUBLIC_STOREFRONT_URL=${NEXT_PUBLIC_STOREFRONT_URL}"
echo "    NEXT_PUBLIC_REST_API_ENDPOINT=${NEXT_PUBLIC_REST_API_ENDPOINT}"
echo ""
echo "  Legacy Backend:"
echo "    NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT=${NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT}"
echo "    VINC_API_URL=${VINC_API_URL}"
echo ""

# ============================================================================
# Build Docker Image
# ============================================================================
echo "Step 1/4: Building Docker image..."

# Build command with all args
# Note: MONGO_URL and MONGO_DB are provided by cluster at runtime
docker build \
  --build-arg TENANT_MODE="$([ "$IS_MULTI_TENANT" == "true" ] && echo "multi" || echo "single")" \
  --build-arg POOL_MAX_CONNECTIONS="${POOL_MAX_CONNECTIONS:-50}" \
  --build-arg POOL_PER_DB_SIZE="${POOL_PER_DB_SIZE:-10}" \
  --build-arg POOL_TTL_MS="${POOL_TTL_MS:-1800000}" \
  --build-arg TENANT_CACHE_TTL_SECONDS="${TENANT_CACHE_TTL_SECONDS:-300}" \
  --build-arg NEXT_PUBLIC_TENANT_ID="${NEXT_PUBLIC_TENANT_ID:-}" \
  --build-arg NEXT_PUBLIC_PROJECT_CODE="${NEXT_PUBLIC_PROJECT_CODE:-}" \
  --build-arg NEXT_PROJECT_CODE="${NEXT_PROJECT_CODE:-}" \
  --build-arg NEXT_PUBLIC_API_KEY_ID="${NEXT_PUBLIC_API_KEY_ID:-}" \
  --build-arg NEXT_PUBLIC_API_SECRET="${NEXT_PUBLIC_API_SECRET:-}" \
  --build-arg API_KEY_ID="${API_KEY_ID:-}" \
  --build-arg API_SECRET="${API_SECRET:-}" \
  --build-arg NEXT_PUBLIC_PIM_API_URL="${NEXT_PUBLIC_PIM_API_URL:-}" \
  --build-arg PIM_API_PRIVATE_URL="${PIM_API_PRIVATE_URL:-}" \
  --build-arg NEXT_PUBLIC_SSO_URL="${NEXT_PUBLIC_SSO_URL:-}" \
  --build-arg NEXT_PUBLIC_B2B_BUILDER_URL="${NEXT_PUBLIC_B2B_BUILDER_URL:-}" \
  --build-arg NEXT_PUBLIC_WEBSITE_URL="${NEXT_PUBLIC_WEBSITE_URL:-}" \
  --build-arg NEXT_PUBLIC_STOREFRONT_URL="${NEXT_PUBLIC_STOREFRONT_URL:-}" \
  --build-arg NEXT_PUBLIC_REST_API_ENDPOINT="${NEXT_PUBLIC_REST_API_ENDPOINT:-}" \
  --build-arg NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT="${NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT:-}" \
  --build-arg CMS_PUBLIC_REST_API_ENDPOINT="${CMS_PUBLIC_REST_API_ENDPOINT:-}" \
  --build-arg VINC_API_URL="${VINC_API_URL:-}" \
  --build-arg VINC_INTERNAL_API_KEY="${VINC_INTERNAL_API_KEY:-}" \
  --build-arg NEXT_PUBLIC_GOOGLE_API_KEY="${NEXT_PUBLIC_GOOGLE_API_KEY:-}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLIC_KEY="${NEXT_PUBLIC_STRIPE_PUBLIC_KEY:-}" \
  --label "tenant-mode=$([ "$IS_MULTI_TENANT" == "true" ] && echo "multi" || echo "single")" \
  --label "tenant=${TENANT}" \
  --label "version=${VERSION}" \
  --label "build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  -t ${IMAGE_NAME}:${VERSION} \
  -t ${IMAGE_NAME}:latest \
  .

echo ""
echo "Build complete!"
echo ""

# ============================================================================
# Show Image Tags
# ============================================================================
echo "Step 2/4: Image tags created:"
docker images ${IMAGE_NAME} | head -n 3
echo ""

# ============================================================================
# Test Image
# ============================================================================
echo "Step 3/4: Testing image..."
docker run --rm ${IMAGE_NAME}:${VERSION} node --version
docker run --rm ${IMAGE_NAME}:${VERSION} sh -c "test -f /app/server.js && echo 'Standalone build verified'"
echo ""

# ============================================================================
# Push to Registry
# ============================================================================
if [[ "$PUSH" == "--push" ]]; then
    echo "Step 4/4: Pushing to registry..."
    docker push ${IMAGE_NAME}:${VERSION}
    docker push ${IMAGE_NAME}:latest
    echo "Images pushed successfully!"
else
    echo "Step 4/4: Skipping push (use --push to push to registry)"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Mode: $([ "$IS_MULTI_TENANT" == "true" ] && echo "Multi-tenant" || echo "Single-tenant")"
echo ""
echo "Images created:"
echo "  ${IMAGE_NAME}:${VERSION}"
echo "  ${IMAGE_NAME}:latest"
echo ""
echo "Image size:"
docker images ${IMAGE_NAME}:${VERSION} --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
echo ""
echo "Local test:"
echo "  docker run -p 3000:3000 ${IMAGE_NAME}:${VERSION}"
echo ""

if [[ "$IS_MULTI_TENANT" == "true" ]]; then
    echo "Multi-tenant deployment:"
    echo "  docker run -p 3000:3000 \\"
    echo "    -e MONGO_URL=mongodb://... \\"
    echo "    -e TENANTS_DB=vinc-tenants \\"
    echo "    -e SSO_API_URL=https://cs.vendereincloud.it \\"
    echo "    -e SSO_CLIENT_ID=vinc-b2b \\"
    echo "    -e SSO_CLIENT_SECRET=your-secret \\"
    echo "    ${IMAGE_NAME}:${VERSION}"
    echo ""
fi

if [[ "$PUSH" != "--push" ]]; then
    echo "To push to registry:"
    echo "  ./build-docker.sh ${TENANT} ${VERSION} --push"
    echo ""
fi
