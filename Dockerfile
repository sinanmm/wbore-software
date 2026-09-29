# ==============================================================================
# Production Dockerfile for WBRE Certificate Management System (Coolify / Docker)
# ==============================================================================
FROM node:22-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy DATABASE_URL during build phase so Prisma client initializes without connecting
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dummy?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/start.sh ./scripts/start.sh
COPY --from=builder /app/certificate-template.ts ./certificate-template.ts

# Ensure upload directory exists and is writable
RUN mkdir -p /app/public/uploads /app/public/uploads/evidence /app/public/uploads/certificates
RUN chmod -R 777 /app/public/uploads
RUN chmod +x /app/scripts/start.sh

EXPOSE 3000

CMD ["./scripts/start.sh"]
