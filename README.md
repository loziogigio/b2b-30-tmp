# How to build

# carica le variabili nel tuo shell

set -a
source .env.build
set +a

# build con gli stessi ARG del Dockerfile

docker build -t crowdechain/b2b-40:0.0.15
  --build-arg NEXT_PUBLIC_REST_API_ENDPOINT="$NEXT_PUBLIC_REST_API_ENDPOINT"
  --build-arg NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT="$NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT"
  --build-arg NEXT_PUBLIC_WEBSITE_URL="$NEXT_PUBLIC_WEBSITE_URL"
  --build-arg NEXT_PUBLIC_GOOGLE_API_KEY="$NEXT_PUBLIC_GOOGLE_API_KEY"
  --build-arg NEXT_PUBLIC_STRIPE_PUBLIC_KEY="$NEXT_PUBLIC_STRIPE_PUBLIC_KEY"
  --build-arg CMS_PUBLIC_REST_API_ENDPOINT="$CMS_PUBLIC_REST_API_ENDPOINT"
  --build-arg NEXT_PROJECT_CODE="$NEXT_PROJECT_CODE"
  .
