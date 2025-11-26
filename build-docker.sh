#!/bin/bash

# Customer Web (Hidros B2B) Docker Build Script
# Image: crowdechain/b2b-40
# Usage: ./build-docker.sh [version] [--push]

set -e

VERSION=${1:-"1.0.1"}
IMAGE_NAME="crowdechain/b2b-40"
PUSH=${2:-""}

echo "🏗️  Building Customer Web Docker Image"
echo "========================================"
echo "Image: ${IMAGE_NAME}:${VERSION}"
echo ""

# Load environment variables from .env
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with required variables."
    exit 1
fi

# Source .env to get build-time variables
set -a
source .env
set +a

echo "📦 Build Arguments:"
echo "  NEXT_PUBLIC_REST_API_ENDPOINT=${NEXT_PUBLIC_REST_API_ENDPOINT}"
echo "  NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT=${NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT}"
echo "  NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL}"
echo "  NEXT_PUBLIC_B2B_BUILDER_URL=${NEXT_PUBLIC_B2B_BUILDER_URL}"
echo "  NEXT_PROJECT_CODE=${NEXT_PROJECT_CODE}"
echo ""

echo "🔨 Step 1/4: Building Docker image..."
docker build \
  --build-arg NEXT_PUBLIC_REST_API_ENDPOINT="${NEXT_PUBLIC_REST_API_ENDPOINT}" \
  --build-arg NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT="${NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT}" \
  --build-arg NEXT_PUBLIC_WEBSITE_URL="${NEXT_PUBLIC_WEBSITE_URL}" \
  --build-arg NEXT_PUBLIC_GOOGLE_API_KEY="${NEXT_PUBLIC_GOOGLE_API_KEY:-}" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLIC_KEY="${NEXT_PUBLIC_STRIPE_PUBLIC_KEY:-}" \
  --build-arg CMS_PUBLIC_REST_API_ENDPOINT="${CMS_PUBLIC_REST_API_ENDPOINT}" \
  --build-arg NEXT_PROJECT_CODE="${NEXT_PROJECT_CODE}" \
  --build-arg NEXT_PUBLIC_B2B_BUILDER_URL="${NEXT_PUBLIC_B2B_BUILDER_URL}" \
  --build-arg VINC_STOREFRONT_URL="${VINC_STOREFRONT_URL}" \
  --label "version=${VERSION}" \
  --label "build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  -t ${IMAGE_NAME}:${VERSION} \
  -t ${IMAGE_NAME}:latest \
  .

echo ""
echo "✅ Build complete!"
echo ""

echo "🏷️  Step 2/4: Image tags created:"
docker images ${IMAGE_NAME} | head -n 2

echo ""

# Test the image
echo "🧪 Step 3/4: Testing image..."
docker run --rm ${IMAGE_NAME}:${VERSION} node --version
docker run --rm ${IMAGE_NAME}:${VERSION} sh -c "ls -la /app/.next/standalone > /dev/null && echo '✅ Standalone build verified'"

echo ""

# Push if requested
if [[ "$PUSH" == "--push" ]]; then
    echo "📤 Step 4/4: Pushing to registry..."

    read -p "Push ${IMAGE_NAME}:${VERSION} to Docker registry? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker push ${IMAGE_NAME}:${VERSION}
        docker push ${IMAGE_NAME}:latest
        echo "✅ Images pushed successfully!"
    else
        echo "⏭️  Push cancelled"
    fi
else
    echo "⏭️  Step 4/4: Skipping push (use --push to push to registry)"
fi

echo ""
echo "=========================================="
echo "✅ Build Complete!"
echo ""
echo "Images created:"
echo "  ${IMAGE_NAME}:${VERSION}"
echo "  ${IMAGE_NAME}:latest"
echo ""
echo "Local test:"
echo "  docker run -p 3000:3000 --env-file .env.runtime \\"
echo "    ${IMAGE_NAME}:${VERSION}"
echo ""
if [[ "$PUSH" != "--push" ]]; then
    echo "To push to registry:"
    echo "  ./build-docker.sh ${VERSION} --push"
    echo ""
fi

# Show image size
echo "Image size:"
docker images ${IMAGE_NAME}:${VERSION} --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
echo ""
