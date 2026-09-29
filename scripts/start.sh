#!/bin/sh
set -e

echo "Starting WBRE Certificate Management System..."

# Run database schema migrations if DATABASE_URL is reachable
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database schema..."
  npx prisma db push --skip-generate || npx prisma migrate deploy || true
  
  # Optional: Seed initial admin if specified
  if [ "$RUN_SEED" = "true" ]; then
    echo "Running initial database seed..."
    npx tsx prisma/seed.ts || true
  fi
fi

echo "Starting Next.js Server on port ${PORT:-3000}..."
exec node server.js
