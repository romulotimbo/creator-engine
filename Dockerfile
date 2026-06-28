# Creator Engine — imagem de produção (container creator-engine-api)
# Multi-stage: deps → builder → runner. Build roda no Linux (Debian) para que
# os binários nativos (Prisma engine, sharp) sejam os corretos do container.

# ── deps: instala dependências (com devDeps, necessárias ao build) ───────────
FROM node:22-slim AS deps
# openssl é exigido pelo engine do Prisma em runtime/generate
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: gera Prisma client + build standalone do Next ───────────────────
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# basePath de produção (/creator-engine) é o default do next.config; não sobrescrever.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BASE_PATH=/creator-engine
RUN npx prisma generate
RUN npm run build

# ── runner: imagem final mínima ──────────────────────────────────────────────
FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# usuário não-root
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# artefatos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# engine do Prisma (garante o .so do target debian no runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
# server.js é gerado pelo output: "standalone"
CMD ["node", "server.js"]
