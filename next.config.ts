import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // App servida sob subpath pelo Traefik: https://romulohub.cloud/creator-engine/
  // basePath ajusta rotas, assets e callbacks do NextAuth para o prefixo.
  // Em dev (localhost:3000 na raiz) defina BASE_PATH="" no ambiente.
  basePath: process.env.BASE_PATH ?? "/creator-engine",
  // Build enxuto para Docker: gera .next/standalone com server.js mínimo.
  output: "standalone",
  experimental: {},
}

export default nextConfig
