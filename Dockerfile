# Install dependencies only when needed
FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm here too
RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# Production image, copy only necessary files
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 👉 Install pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@9.5.0 --activate

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Use shell to ensure pnpm works
CMD ["sh", "-c", "pnpm start"]