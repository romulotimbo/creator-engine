# Landing Page — Handoff para desenvolvimento e deploy (VPS)

Documento de orientação para o agente de IA (ou desenvolvedor) responsável pela **landing page estática** em **`https://lp.romulohub.cloud`**.

Este arquivo descreve a infraestrutura existente, decisões já tomadas, o que fazer e o que **não** fazer. A landing é um **projeto separado** do Creator Engine.

---

## 1. Contexto da infraestrutura (VPS romulohub.cloud)

| Componente | Função | URL / acesso |
|---|---|---|
| **Traefik** | Reverse proxy, TLS (Let's Encrypt), roteamento | `:80` / `:443` |
| **postgres** | PostgreSQL 17 + pgvector | Rede interna `creator-internal` |
| **creator-engine-api** | App Next.js (PersonaForge + Creator Engine) | `https://romulohub.cloud/creator-engine/` |
| **hermes-agent** | Agente LLM (não alterar) | `https://hermes.romulohub.cloud/` |
| **landing** *(novo)* | Landing estática | **`https://lp.romulohub.cloud/`** |

### Redes Docker

| Rede | Uso |
|---|---|
| `traefik-proxy` | Exposição pública via Traefik — **a landing entra só aqui** (fase 1) |
| `creator-internal` | Postgres e apps de negócio — **não necessária** para landing estática inicial |

### Banco (referência futura, fase RAG)

- Database: `personal_db`, usuário: `romulo_db_user`
- Schema `rag` reservado para base vetorial / RAG futuro (`prisma/sql/00-init-schemas.sql` no repo Creator Engine)
- **Fase 1 (estática):** landing **não** precisa de Postgres nem variáveis de banco

---

## 2. Decisões já tomadas

1. **Container Docker separado** — não embutir landing no `creator-engine-api`
2. **Landing estática** — HTML/CSS/JS servidos por **nginx** (ou build SSG → nginx)
3. **Subdomínio dedicado:** `lp.romulohub.cloud` (não usar `/` na raiz de `romulohub.cloud` por enquanto)
4. **Sem basic auth** no Traefik — página pública (o Creator Engine usa basic auth + login próprio)
5. **Deploy independente** — git pull + rebuild só do container landing, sem tocar Creator Engine

---

## 3. O que o agente deve entregar (escopo fase 1)

### Repositório / pasta sugerida no VPS

```
/srv/data/landing/
├── docker-compose.yml
├── Dockerfile
├── nginx.conf              # opcional, se customizar nginx
├── public/                 # ou dist/ após build
│   ├── index.html
│   ├── assets/
│   └── ...
└── scripts/
    └── deploy-vps.sh       # opcional, espelhando padrão do CE
```

### Stack recomendada (escolher uma)

| Opção | Build | Container final | Quando usar |
|---|---|---|---|
| **A — HTML puro** | Nenhum | `nginx:alpine` + `COPY public/` | MVP imediato, máxima simplicidade |
| **B — Astro / Vite SSG** | `npm run build` → `dist/` | nginx servindo `dist/` | Componentes, SEO, escala de conteúdo |
| **C — Next `output: 'export'`** | `next build` | nginx servindo `out/` | Só se a equipe já domina Next; evitar se possível |

**Preferência:** A ou B. Evitar acoplar Next completo só para uma landing estática.

---

## 4. Docker — referência mínima

### Dockerfile (multi-stage, opção com build)

```dockerfile
# Stage 1 — build (omitir se HTML puro em public/)
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# HTML puro: COPY public/ /usr/share/nginx/html
EXPOSE 80
```

### nginx.conf (SPA-safe, gzip básico)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

> Se a landing for **100% estática sem client router**, `try_files $uri $uri/ =404` também serve.

### docker-compose.yml

```yaml
services:
  landing:
    build:
      context: .
      dockerfile: Dockerfile
    image: landing:latest
    container_name: landing
    restart: unless-stopped
    networks:
      - traefik-proxy
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-proxy"
      - "traefik.http.routers.landing.rule=Host(`lp.romulohub.cloud`)"
      - "traefik.http.routers.landing.entrypoints=websecure"
      - "traefik.http.routers.landing.tls.certresolver=letsencrypt"
      - "traefik.http.services.landing.loadbalancer.server.port=80"

networks:
  traefik-proxy:
    external: true
    name: traefik-proxy
```

**Importante:**

- **Não** usar `StripPrefix` — a app serve na raiz `/`
- **Não** reutilizar middleware `creator-auth` do Creator Engine
- Certificado TLS: Traefik + `letsencrypt` (mesmo padrão do CE) — exige DNS `lp.romulohub.cloud` apontando para o IP do VPS

---

## 5. DNS e TLS

Antes do primeiro deploy:

1. Criar registro **A** (ou CNAME): `lp.romulohub.cloud` → IP do VPS (`185.137.92.233` ou o IP atual)
2. Subir o container com labels Traefik acima
3. Aguardar emissão Let's Encrypt (primeira requisição HTTPS pode demorar ~1 min)
4. Verificar: `curl -sI https://lp.romulohub.cloud/` → `200` ou `301`

---

## 6. Deploy no VPS (fluxo operacional)

```bash
cd /srv/data/landing
git pull
docker compose build --no-cache
docker compose up -d --force-recreate
docker compose logs landing --tail 30
curl -sI https://lp.romulohub.cloud/ | head -5
```

Script opcional `scripts/deploy-vps.sh` (espelhar Creator Engine):

```bash
#!/usr/bin/env bash
set -euo pipefail
git pull
docker compose build --no-cache landing
docker compose up -d --force-recreate landing
curl -sI "https://lp.romulohub.cloud/" | head -3
echo "Deploy landing concluído."
```

---

## 7. O que NÃO fazer

| Evitar | Motivo |
|---|---|
| Landing dentro do repo/container `creator-engine-api` | Deploy acoplado, basic auth, build pesado (~3 min) |
| Rota `romulohub.cloud/` competindo com CE sem planejar | CE usa `PathPrefix(/creator-engine)`; raiz livre mas subdomínio `lp.` já foi escolhido |
| `StripPrefix` no Traefik | Quebra paths de assets |
| Basic auth na landing pública | Bloqueia visitantes e SEO |
| Conectar landing ao Postgres na fase 1 | Complexidade desnecessária para HTML estático |
| Alterar `hermes-agent`, Traefik global ou `postgres` | Fora do escopo; risco em produção |
| Secrets do CE (AUTH_SECRET, ENCRYPTION_KEY) na landing | Landing não autentica usuários do CE |

---

## 8. Links úteis para conteúdo da landing

O Creator Engine vive em **`https://romulohub.cloud/creator-engine/`** (requer login; pode ter basic auth do Traefik antes do login da app).

CTAs típicos na landing:

- Botão “Acessar plataforma” → `https://romulohub.cloud/creator-engine/login`
- Não prometer URL sem subpath (`/login` na raiz **não** é o CE)

---

## 9. Qualidade e entrega (checklist para o agente)

### Desenvolvimento

- [ ] Mobile-first, performance (Lighthouse > 90 em Performance/Best Practices quando possível)
- [ ] Meta tags: `title`, `description`, Open Graph (`og:image`, `og:url` = `https://lp.romulohub.cloud/`)
- [ ] Favicon + `robots.txt` + `sitemap.xml` (opcional mas recomendado)
- [ ] Imagens otimizadas (WebP/AVIF, lazy load)
- [ ] Sem dependência de API/backend na fase 1

### Deploy

- [ ] DNS `lp.romulohub.cloud` configurado
- [ ] Container `landing` na rede `traefik-proxy`
- [ ] HTTPS 200 em `/`
- [ ] Hard refresh / aba anônima para validar cache

### Segurança mínima

- [ ] Headers via nginx (opcional): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- [ ] Não expor `.env` nem arquivos de build no nginx

---

## 10. Fase 2 (futuro — fora do escopo imediato)

Quando houver **chat RAG** ou formulários dinâmicos:

- Novo serviço ou evolução da landing com API route
- Conexão ao schema `rag` no Postgres (`personal_db`) ou consumo via **`hermes.romulohub.cloud`**
- Rede `creator-internal` apenas se o container precisar falar direto com Postgres
- Manter **subdomínio** `lp.romulohub.cloud` — só adicionar rotas `/api/*` ou subpath interno

Não implementar fase 2 até a landing estática estar no ar e validada.

---

## 11. Referências no repo Creator Engine

Arquivos úteis para entender o padrão de deploy (não copiar literalmente — CE é Next.js):

| Arquivo | Conteúdo |
|---|---|
| `docker-compose.prod.yml` | Labels Traefik, redes, healthcheck |
| `scripts/deploy-vps.sh` | Fluxo git pull → build → recreate |
| `scripts/verify-prod.sh` | Verificações pós-deploy |
| `DEPLOY.md` | Documentação completa do CE |
| `CLAUDE.md` | Mapa de containers e URLs |
| `prisma/sql/00-init-schemas.sql` | Schema `rag` reservado |

---

## 12. Resumo em uma frase para o agente

> Construir uma **landing estática** em repositório/pasta própria, servida por **nginx em container Docker** na rede **`traefik-proxy`**, roteada por **`Host(\`lp.romulohub.cloud\`)`** com TLS Let's Encrypt, **sem auth**, **sem Postgres**, deploy independente do Creator Engine em `romulohub.cloud/creator-engine`.

---

*Gerado a partir da infraestrutura documentada no Creator Engine — romulohub.cloud, jun/2026.*
