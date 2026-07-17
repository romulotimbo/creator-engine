# VPS romulohub.cloud — Documentação de Infraestrutura

Documento de referência da VPS de produção. Consolida dados reais (`docker ps`, redes Docker, probes HTTPS, workflows n8n) com a documentação dos repositórios.

**Última atualização:** jul/2026  
**Host:** Hostinger VPS (`srv1312275`)  
**IP:** `185.137.92.233`  
**Domínio principal:** `romulohub.cloud`

---

## Visão geral

A VPS roda uma stack Docker orquestrada manualmente via Compose, com **Traefik v3.7** como reverse proxy na borda (`:80` / `:443`, TLS Let's Encrypt). Aplicações expostas publicamente ficam na rede **`traefik-proxy`**; serviços de backend e banco ficam na rede privada **`creator-internal`**.

```
Internet (HTTPS)
       │
       ▼
  Traefik :443
       │
       ├── romulohub.cloud/creator-engine  → creator-engine-api
       ├── hermes.romulohub.cloud          → hermes-agent
       ├── lp.romulohub.cloud              → landing (nginx)
       ├── n8n.romulohub.cloud             → n8n
       └── (weatherbot — URL Traefik a confirmar) → weatherbot-dashboard
```

Diagrama visual: [`assets/vps-romulohub-architecture-v2.png`](../assets/vps-romulohub-architecture-v2.png)

---

## Inventário de containers (live)

Snapshot de `docker ps` em jul/2026:

| Container | Imagem | Porta interna | Exposição | Rede(s) | Função |
|---|---|---|---|---|---|
| `traefik-traefik-1` | `traefik:v3.7` | 80, 443 | **Pública** (`0.0.0.0:80/443`) | `traefik-proxy` | Reverse proxy, TLS, roteamento |
| `creator-engine-api` | `creator-engine-api:latest` | 3000 | Via Traefik | `traefik-proxy` + `creator-internal` | App Next.js (Creator Engine + PersonaForge) |
| `creator-engine-render` | `creator-engine-render:latest` | — | **Interno** (sem Traefik) | `creator-internal` | Worker Remotion (render de vídeos) |
| `postgres` | `pgvector/pgvector:pg17` | 5432 | `127.0.0.1:5432` (host only) | `creator-internal` | Banco principal (`personal_db`) |
| `hermes-agent` | `nousresearch/hermes-agent:latest` | 4860, 9119 | Via Traefik | `traefik-proxy` | Agente LLM (FastAPI/uvicorn) |
| `landing` | `landing:latest` | 80 | Via Traefik | `traefik-proxy` | Landing page estática (nginx) |
| `landing-api` | `landing-api:latest` | 3001 | **Interno** | `creator-internal` | API da landing (waitlist, etc.) |
| `n8n` | `n8nio/n8n:latest` | 5678 | Via Traefik | `traefik-proxy` | Automação / workflows |
| `n8n-postgres` | `pgvector/pgvector:pg16` | 5432 | `127.0.0.1:5433` (host only) | *(isolado)* | Banco dedicado ao n8n |
| `weatherbot-dashboard` | `dashboard-weatherbot-dashboard` | 8501 | Via Traefik | `traefik-proxy` | Dashboard Streamlit (weatherbot) |
| `blog-romulo` | `meu-blog-nextjs` | 3000 | `127.0.0.1:3000` (host only) | *(sem Traefik)* | Blog Next.js — **não público** |

---

## Redes Docker

### `traefik-proxy` (exposição pública)

Containers membros:

- `traefik-traefik-1`
- `creator-engine-api`
- `hermes-agent`
- `landing`
- `n8n`
- `weatherbot-dashboard`

### `creator-internal` (backend privado)

Containers membros:

- `postgres`
- `creator-engine-api`
- `landing-api`
- `creator-engine-render`

> **Nota:** `hermes-agent` e `n8n` **não** estão na `creator-internal`. Provavelmente acessam o Postgres principal via `127.0.0.1:5432` no host (port binding do container `postgres`).

---

## DNS

Todos os subdomínios abaixo apontam para `185.137.92.233`:

| Host | Destino | Status verificado |
|---|---|---|
| `romulohub.cloud` | Traefik | Raiz retorna 404 (sem rota); CE em `/creator-engine` |
| `hermes.romulohub.cloud` | hermes-agent | 302 → `/login` (uvicorn ativo) |
| `lp.romulohub.cloud` | landing (nginx) | 200 OK |
| `n8n.romulohub.cloud` | n8n | 200 OK |

---

## Bancos de dados

### Postgres principal — container `postgres`

| Propriedade | Valor |
|---|---|
| Imagem | `pgvector/pgvector:pg17` |
| Database | `personal_db` |
| Usuário | `romulo_db_user` |
| Porta no host | `127.0.0.1:5432` |
| Volume | `/srv/data/postgres-data` |
| Rede | `creator-internal` |

**Schemas:**

| Schema | Uso | Consumidores |
|---|---|---|
| `public` | Apps pessoais, DMs Instagram, plano de ataque legado (`creator_engine_state`) | hermes-agent, n8n |
| `creator_engine` | Creator Engine (PersonaForge, ferramentas, SOPs, estúdio de vídeo) | creator-engine-api, creator-engine-render, hermes-agent |
| `rag` | Base vetorial (pgvector) para RAG | n8n (workflow LLM Draft), futuro |
| `landing` | Waitlist e dados da landing | landing-api |

Scripts de init/migration: `prisma/sql/` neste repositório.

### Postgres do n8n — container `n8n-postgres`

| Propriedade | Valor |
|---|---|
| Imagem | `pgvector/pgvector:pg16` |
| Porta no host | `127.0.0.1:5433` |
| Função | Metadados internos do n8n (workflows, execuções, credenciais) |

> Os workflows de Instagram DM usam credencial **"Postgres n8n (Instagram DMs)"** — provavelmente apontando para o Postgres **principal** (`personal_db`), não para o `n8n-postgres`. Confirmar com `docker exec n8n env | grep DB` ou inspecionar credenciais no UI do n8n.

---

## Serviços em detalhe

### Traefik (`traefik-traefik-1`)

- **Imagem:** `traefik:v3.7`
- **Portas:** `0.0.0.0:80` e `0.0.0.0:443`
- **Função:** Termina TLS (Let's Encrypt), roteia por `Host()` e `PathPrefix()`, aplica middlewares (ex.: Basic Auth no Creator Engine)
- **Rede:** `traefik-proxy`

### Creator Engine API (`creator-engine-api`)

- **URL:** `https://romulohub.cloud/creator-engine/`
- **Stack:** Next.js 16 standalone, Prisma 6, NextAuth v5
- **Porta:** 3000 (interna)
- **Compose:** `docker-compose.prod.yml` (repo creator-engine)
- **Deploy path:** `/srv/data/creator-engine-api`
- **Script de deploy:** `scripts/deploy-vps.sh`

**Variáveis principais:**

```env
DATABASE_URL=postgresql://romulo_db_user:...@postgres:5432/personal_db?schema=creator_engine
ENCRYPTION_KEY=...
AUTH_EMAIL_DOMAIN=romulohub.cloud   # opcional
AUTHELIA_LOGOUT_URL=...           # opcional
ESTUDIO_DATA_DIR=/data/estudio
N8N_PUBLISH_TOKEN=...          # openssl rand -hex 32 — M2M n8n↔CE
PUBLICACAO_DATA_DIR=/data/publicacao
PUBLICACAO_MEDIA_BASE_URL=https://romulohub.cloud/creator-engine/api/publicacao/media
```

**Traefik:**

- Rota: `Host(romulohub.cloud) && PathPrefix(/creator-engine)`
- Middleware: `authelia@docker` (forward auth — login/MFA centralizado)
- **Rota pública (sem Authelia):** `PathPrefix(/creator-engine/api/publicacao)` — auth por `X-Publish-Token` (n8n) ou `?token=` (Zernio/mídia)
- **Sem StripPrefix** (basePath do Next cuida do subpath)

**Volumes Docker:**

- `creator-engine-estudio-data` → `/data/estudio` (fontes, assets, output de vídeo)
- `creator-engine-publicacao-data` → `/data/publicacao` (mídias prontas para Instagram)

**API de publicação (n8n):**

| Rota | Função |
|---|---|
| `GET /creator-engine/api/publicacao/fila` | Posts elegíveis (AGENDADO + PRONTA + data vencida) |
| `GET /creator-engine/api/publicacao/posts/{id}` | Detalhe para payload Zernio |
| `POST .../midia` | Upload/registro de mídia |
| `GET .../media/{postId}?token=` | URL pública para Zernio |
| `POST .../confirmar` / `.../erro` | Callbacks pós-publicação |

Ver `scripts/publicacao/README.md` e spec em `openspec/changes/publicacao-instagram-n8n/`.

### Creator Engine Render (`creator-engine-render`)

- **Exposição:** nenhuma (worker interno)
- **Stack:** Remotion + Chromium headless + FFmpeg + ExifTool
- **Função:** Consome fila `JobRender` no Postgres (polling `FOR UPDATE SKIP LOCKED`), grava MP4 em `/data/estudio/output`
- **Limites:** 1.5 CPU, 2 GB RAM (para não competir com api/hermes/postgres)
- **Compose:** bloco `creator-engine-render` em `docker-compose.prod.yml`

### Hermes Agent (`hermes-agent`)

- **URL:** `https://hermes.romulohub.cloud/`
- **Imagem:** `nousresearch/hermes-agent:latest`
- **Stack:** FastAPI (uvicorn)
- **Portas internas:** 4860, 9119
- **Função:** Agente LLM — consulta e grava direto no Postgres
- **Schemas usados:** `public.*` (plano de ataque / checklist), `creator_engine.*` (cross-schema)
- **Rede:** apenas `traefik-proxy` (acesso ao DB via host `:5432`)

> **Não alterar** sem necessidade — é infra compartilhada de outros fluxos operacionais.

### Landing estática (`landing`)

- **URL:** `https://lp.romulohub.cloud/`
- **Imagem:** `landing:latest` (nginx)
- **Porta:** 80
- **Deploy path:** `/srv/data/landing`
- **Rede:** `traefik-proxy` (sem Postgres, sem auth)
- **Referência:** `docs/landing-vps-handoff.md`

CTA típico: link para `https://romulohub.cloud/creator-engine/login`

### Landing API (`landing-api`)

- **Exposição:** interna (`creator-internal`), porta 3001
- **Função:** Backend da landing — ex.: formulário de waitlist
- **Banco:** schema `landing` (`landing.vault_waitlist`)
- **Rede:** `creator-internal` (acessa `postgres` diretamente)

> A landing nginx (`landing`) provavelmente faz proxy ou fetch para `landing-api` internamente, ou o frontend chama a API via Traefik em rota separada (confirmar labels Traefik).

### n8n (`n8n`)

- **URL:** `https://n8n.romulohub.cloud/`
- **Instância:** `n8n-romulohub-cloud`
- **Porta:** 5678
- **Banco próprio:** `n8n-postgres` (pg16, host `:5433`)

**Workflows ativos (jul/2026):**

| Nome | ID | Status | Função |
|---|---|---|---|
| Instagram DM → Postgres | `nWY4havQuQJujcJX` | ✅ Ativo | Webhook Zernio → grava DMs em `instagram_dm_messages` |
| Instagram DM → LLM Draft | `aDmLlmDraft2026x` | ✅ Ativo | Schedule 2 min → RAG + Groq → rascunho `pending_review` |
| Instagram DM → Aprovar e Enviar | `aDmApprove2026xy` | ⏸ Inativo | Manual → envia resposta aprovada via API Zernio |

**Integrações externas do n8n:**

| Serviço | Uso |
|---|---|
| **Zernio** (`zernio.com`) | Ponte Instagram DM — webhook inbound + API outbound |
| **Groq API** | LLM `llama-3.1-8b-instant` (rascunhos de resposta) |
| **Google Gemini API** | Embeddings `gemini-embedding-001` (RAG) |
| **Postgres principal** | Tabelas `instagram_dm_*`, `rag_persona_chunks`, `llm_*` |

**Fluxo Instagram DM (@veesemfiltro):**

```
Instagram → Zernio (webhook)
         → n8n "Instagram DM → Postgres"
         → public.instagram_dm_messages

Schedule 2 min → n8n "LLM Draft"
         → Gemini (embedding) → RAG pgvector
         → Groq (rascunho)
         → public.instagram_dm_responses (pending_review)

Manual → n8n "Aprovar e Enviar" (inativo)
         → Zernio API (envio)
         → Instagram
```

### Weatherbot Dashboard (`weatherbot-dashboard`)

- **Imagem:** `dashboard-weatherbot-dashboard` (Streamlit)
- **Porta:** 8501
- **Rede:** `traefik-proxy`
- **URL pública:** a confirmar via labels Traefik (`docker inspect weatherbot-dashboard`)

### Blog Romulo (`blog-romulo`)

- **Imagem:** `meu-blog-nextjs`
- **Porta:** `127.0.0.1:3000` (bind localhost — **não exposto na internet**)
- **Uptime:** ~5 meses
- **Nota:** Provavelmente acesso via SSH tunnel ou uso interno; não passa pelo Traefik.

---

## Volumes e paths no host

| Path | Conteúdo |
|---|---|
| `/srv/data/creator-engine-api/` | Repo + compose do Creator Engine |
| `/srv/data/landing/` | Repo + compose da landing estática |
| `/srv/data/compose/` | Compose legado (alguns arquivos desativados, ex.: `docker-compose.creator.yml.DESATIVADO-*`) |
| `/srv/data/postgres-data/` | Datadir do Postgres principal |
| `/srv/data/backups-split-brain/` | Backups de merge pós-incidente split-brain (jul/2026) |

**Volume Docker nomeado:**

- `creator-engine-estudio-data` → montado em `creator-engine-api` e `creator-engine-render` em `/data/estudio`
- `creator-engine-publicacao-data` → montado em `creator-engine-api` em `/data/publicacao`

---

## Segurança e autenticação

| Serviço | Auth |
|---|---|
| Creator Engine | Authelia (forward auth Traefik) |
| Hermes | Login próprio (redirect `/login`) |
| n8n | Login n8n |
| Landing | Pública (sem auth) |
| Postgres | Só localhost (`127.0.0.1`) — não exposto na internet |

**Secrets (Creator Engine `.env` ao lado da compose):**

- `POSTGRES_PASSWORD`
- `ENCRYPTION_KEY` (AES-256 para credenciais — **backup obrigatório**)
- `N8N_PUBLISH_TOKEN` (publicação Instagram via n8n)

**Secrets (n8n container):**

- `GROQ_API_KEY`, `GEMINI_API_KEY`, `ZERNIO_API_KEY` (conforme workflows)

---

## Operações comuns

### Verificar saúde geral

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker network inspect traefik-proxy creator-internal \
  --format '{{.Name}}: {{range .Containers}}{{.Name}} {{end}}'
```

### Deploy Creator Engine

```bash
cd /srv/data/creator-engine-api
bash scripts/deploy-vps.sh
```

### Deploy Landing

```bash
cd /srv/data/landing
git pull
docker compose build --no-cache
docker compose up -d --force-recreate
curl -sI https://lp.romulohub.cloud/ | head -5
```

### Verificar Creator Engine pós-deploy

```bash
bash scripts/verify-prod.sh
curl -I https://romulohub.cloud/creator-engine/
```

### Acessar Postgres principal

```bash
docker exec -it postgres psql -U romulo_db_user -d personal_db
# \dt creator_engine.*
# \dt public.*
# \dt landing.*
```

### Logs

```bash
docker compose -f /srv/data/creator-engine-api/docker-compose.prod.yml logs -f creator-engine-api
docker logs n8n --tail 50
docker logs hermes-agent --tail 50
```

---

## Incidentes conhecidos

### Split-brain Postgres (jul/2026)

Dois containers Postgres (`postgres` + `compose-postgres-1`) rodavam com o mesmo alias DNS `postgres` na rede `creator-internal` e o mesmo datadir → dados divergiam.

**Correção:** script `scripts/fix-split-brain-vps.sh` — consolidou em um único Postgres, restaurou dump merged, desativou compose obsoleto em `/srv/data/compose/`.

---

## Relação entre projetos

```
┌─────────────────────────────────────────────────────────────┐
│                    Creator Engine (este repo)                │
│  creator-engine-api + creator-engine-render + postgres      │
│  Schema: creator_engine                                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐
│  Landing (repo    │  │  Hermes Agent     │  │  n8n          │
│  separado)        │  │  (imagem Docker)  │  │  (workflows)  │
│  landing +        │  │                   │  │               │
│  landing-api      │  │                   │  │               │
└──────────────────┘  └──────────────────┘  └───────────────┘
         │                      │                    │
         └──────────────────────┴────────────────────┘
                                │
                         postgres (personal_db)
                    schemas: public, creator_engine,
                             rag, landing
```

**Integrações futuras previstas (não implementadas):**

- Creator Engine → n8n → Instagram (publicação automática de vídeos renderizados)
- Landing fase 2 → chat RAG via schema `rag` ou Hermes

---

## Checklist de descobertas pendentes

Itens que ainda não foram confirmados via `docker inspect` ou labels Traefik:

- [ ] URL pública exata do `weatherbot-dashboard`
- [ ] Rota Traefik da `landing-api` (se exposta) ou como `landing` nginx a alcança `:3001`
- [ ] Credencial Postgres do n8n aponta para `postgres:5432` ou `host:5432` ou `n8n-postgres`
- [ ] Labels Traefik completos de todos os containers (`docker inspect <nome> --format '{{json .Config.Labels}}'`)

Comando útil para fechar o checklist:

```bash
for c in creator-engine-api hermes-agent landing landing-api n8n weatherbot-dashboard; do
  echo "=== $c ==="
  docker inspect "$c" --format '{{json .Config.Labels}}' 2>/dev/null | tr ',' '\n' | grep traefik
done
```

---

## Referências no repositório

| Arquivo | Conteúdo |
|---|---|
| `CLAUDE.md` | Arquitetura geral, decisões técnicas |
| `DEPLOY.md` | Deploy Creator Engine passo a passo |
| `docker-compose.prod.yml` | Compose produção (api + postgres + render) |
| `docs/landing-vps-handoff.md` | Handoff da landing estática |
| `scripts/deploy-vps.sh` | Script de deploy automatizado |
| `scripts/verify-prod.sh` | Diagnóstico pós-deploy |
| `scripts/fix-split-brain-vps.sh` | Correção split-brain Postgres |
| `assets/vps-romulohub-architecture-v2.png` | Diagrama visual da infra |

---

*Gerado a partir de inspeção live (docker ps, redes, probes HTTPS, workflows n8n) + documentação do Creator Engine.*
