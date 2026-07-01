# ──────────────────────────────────────────────────────────────
#  AI Video Studio — Production Dockerfile
#  Multi-stage build: deps → build → runtime
# ──────────────────────────────────────────────────────────────

# ---- Base stage ----
# Use Debian-slim (not alpine) because onnxruntime-node ships prebuilt
# binaries for glibc Linux; alpine (musl) can't load them.
FROM node:20-bookworm-slim AS base
WORKDIR /app

# ffmpeg is required at runtime for video rendering.
# git + curl are needed by some npm native builds and the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    ca-certificates \
    fonts-dejavu-core \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependencies stage ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- Build stage ----
FROM deps AS build
COPY . .
# Vite needs this at build time (inlined into the client bundle)
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ---- Production runtime stage ----
FROM base AS production
ENV NODE_ENV=production

# Copy installed node_modules (includes native binaries: ffmpeg-static,
# ffprobe-static, onnxruntime-node)
COPY --from=deps /app/node_modules ./node_modules

# Copy built server bundle + static client assets
COPY --from=build /app/dist ./dist

# Copy runtime files needed by the server
COPY package.json ./
COPY assets ./assets
COPY db ./db
COPY contracts ./contracts
COPY api ./api
COPY public ./public

EXPOSE 3000

# Healthcheck hits the static index (served by Hono in production)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]
