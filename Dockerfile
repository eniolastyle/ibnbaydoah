# Multi-stage Dockerfile for Ibn Baydoah Platform on Coolify / Docker
# Stage 1: Build client and prepare assets
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . ./
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

# Copy compiled frontend, server, database schema/store, and seed files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Ensure persistent data directory exists for fallback JSON & backups
RUN mkdir -p /app/server/data

# Coolify / Docker Healthcheck using built-in Node 22 fetch (no busybox wget flag quirks)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
