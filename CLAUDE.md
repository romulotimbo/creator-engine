# Creator Engine — CLAUDE.md

Sistema operacional para criação e gestão de personas digitais em Instagram, TikTok, YouTube e FanVue.
Desenvolvido por Rômulo — projeto local, deploy futuro em VPS (romulohub.cloud).

> **Arquitetura em dois níveis:**
> - **Creator Engine (nível superior):** ferramentas, templates, SOPs, prompts globais, analytics cross-persona — reutilizáveis entre todas as personas.
> - **PersonaForge (módulo interno):** gestão operacional de cada persona específica — contas, roteiros, calendário, funil, financeiro, imagens, credenciais.
>
> O que antes se chamava "PersonaForge" é agora o módulo PF dentro do Creator Engine.
> **Renomeação concluída:** `package.json` (`name: "creator-engine"`), `layout.tsx`, `sidebar.tsx` e tela de login já refletem "Creator Engine".

---

## Infraestrutura / Hospedagem (VPS romulohub.cloud)

Deploy em VPS com 4 containers Docker gerenciados pelo Traefik:

| Container | Função | URL |
|---|---|---|
| `creator-engine-api` | Esta aplicação (Next.js). O **plano de ataque** atual vira página subordinada. | `https://romulohub.cloud/creator-engine/` |
| `postgres` | `pgvector/pgvector:pg17` — relacional + vetorial | interno |
| `hermes-agent` | Agente LLM (não tocar). Consulta/grava direto no Postgres. | `https://hermes.romulohub.cloud/` |
| `traefik` | Reverse proxy / gestão de URLs | `:80/:443` |

**Subpath:** a app é servida sob `/creator-engine` → `next.config.ts` usa `basePath: "/creator-engine"` (sobrescreva com `BASE_PATH=""` para dev na raiz). `NEXTAUTH_URL` deve incluir o subpath.

**Banco — separação por schema (1 database, vários schemas):**
- Database `personal_db`, usuário `romulo_db_user`
- `public` → apps **pessoais** (inclui `creator_engine_state` = plano de ataque atual)
- `creator_engine` → apps de **negócio** (esta aplicação — `?schema=creator_engine` na `DATABASE_URL`)
- `rag` → base **vetorial** (pgvector) para LLM/RAG futuro (landing page)

Escolha de schemas (não databases separados) é deliberada: o `hermes-agent` acessa `creator_engine.*` via cross-schema nativo do Postgres na mesma conexão.

**Scripts SQL (`prisma/sql/`)** — rodar manualmente em banco existente (`init-db.sql` só roda em volume novo):
- `00-init-schemas.sql` — cria schemas `creator_engine` e `rag` (idempotente). Extensão `vector` fica comentada (exige superuser).
- `01-copy-plano-de-ataque.sql` — **copia** `public.creator_engine_state` → `creator_engine` (`CREATE TABLE LIKE INCLUDING ALL` + `INSERT`). A tabela original fica **intacta** (hermes/checklist seguem funcionando); a cópia é para migrar a app oportunamente. Idempotente.

```bash
psql -U romulo_db_user -d personal_db -f prisma/sql/00-init-schemas.sql
psql -U romulo_db_user -d personal_db -f prisma/sql/01-copy-plano-de-ataque.sql
```

A cópia `creator_engine.creator_engine_state` ainda **não está modelada** no `schema.prisma` (placeholder comentado). Não rodar `prisma db push --accept-data-loss` antes de introspeccioná-la.

---

## Stack

- **Next.js 16.2.9** com App Router (`src/app/`) e TypeScript
- **Prisma 6** + **PostgreSQL** (Docker no VPS; local via .env.local)
- **NextAuth v5** (`next-auth@^5.0.0-beta.28`) com Credentials provider + JWT strategy + `@auth/prisma-adapter`
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Radix UI** para componentes headless
- **Recharts** para gráficos
- **date-fns** com locale pt-BR
- **Zod** para validação
- **bcryptjs** para hashing de senhas
- **AES-256-GCM** via Node.js crypto para credenciais criptografadas no banco

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Layout de tela cheia centralizada
│   │   └── login/page.tsx          # Tela de login (client component)
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth guard + sidebar + main container
│   │   ├── page.tsx                # Dashboard global (server component)
│   │   ├── personas/
│   │   │   ├── page.tsx            # Lista de personas
│   │   │   ├── nova/page.tsx       # Formulário de criação
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # Hub da persona (stats, contas, info)
│   │   │       ├── roteiros/       # Lista de posts/roteiros
│   │   │       ├── calendario/     # Calendário da persona
│   │   │       ├── metricas/       # Snapshots de seguidores por conta (histórico + gráfico)
│   │   │       ├── funil/          # Funil de monetização + checklist
│   │   │       ├── imagens/        # Galeria de imagens geradas por IA
│   │   │       └── credenciais/    # Credenciais criptografadas
│   │   ├── financeiro/page.tsx     # Receitas e custos globais
│   │   ├── discovery/page.tsx      # Hub de ideias e experimentos
│   │   └── calendario/page.tsx     # Calendário global de posts
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── personas/route.ts       # GET (lista) + POST (cria)
│   │   ├── personas/[slug]/route.ts # GET + PUT + DELETE
│   │   ├── posts/route.ts          # GET (filtros: personaId, status, tipo) + POST
│   │   ├── financeiro/route.ts     # GET (resumo) + POST (receita ou custo)
│   │   ├── discovery/route.ts      # GET + POST
│   │   └── metricas/route.ts       # GET (lista) + POST (snapshot upsert)
│   │   └── metricas/[id]/route.ts  # PUT + DELETE snapshot
│   ├── layout.tsx                  # Root layout (Inter font, dark bg)
│   └── globals.css                 # CSS variables do tema escuro
├── components/
│   ├── layout/sidebar.tsx          # Sidebar fixa com navegação (client component)
│   ├── dashboard/
│   │   ├── stats.tsx               # Cards de métricas globais
│   │   └── personas-table.tsx      # Tabela de personas com contas e progresso
│   └── personas/
│       └── persona-card.tsx        # Card de persona para grid
├── lib/
│   ├── db.ts                       # Singleton do Prisma client
│   ├── auth.ts                     # Configuração NextAuth v5
│   ├── encryption.ts               # encrypt/decrypt AES-256-GCM
│   ├── metricas.ts                 # parse date, upsert dia, sync seguidoresAtual
│   └── utils.ts                    # cn(), formatDate(), formatCurrency(), slugify(), constantes
├── types/
│   └── index.ts                    # Re-exports Prisma + tipos compostos
prisma/
├── schema.prisma                   # Schema completo (ver seção abaixo)
└── seed.ts                         # Seed: usuário admin + persona veesemfiltro
```

---

## Tema Visual (Dark Mode)

Variáveis CSS em `globals.css`:

| Variável | Valor | Uso |
|---|---|---|
| `--background` | `#0a0a0f` | Fundo geral |
| `--card` | `#111118` | Cards e painéis |
| `--border` | `#1e1e2e` | Bordas |
| `--border-subtle` | `#2d2d3f` | Inputs e bordas secundárias |
| `--primary` | `#7c3aed` | Roxo primário (botões, links) |
| `--accent` | `#4a0e8f` | Roxo escuro (hover) |
| `--text` | `#e2e8f0` | Texto principal |
| `--text-muted` | `#94a3b8` | Texto secundário |
| `--text-faint` | `#64748b` | Labels e placeholders |

Regra: componentes usam inline styles com esses valores (sem classes Tailwind de cor, pois Tailwind v4 não tem compiler local).

---

## Banco de Dados — Modelos Principais

### Personas e Status
- `Persona` — entidade central (slug único, nomeArtistico, nicho, aparencia, personalidade, backstory, incongruenciaCentral, disclosureIa)
- `PersonaStatus` enum: `ATIVA | TESTE | SHADOW_BAN | SUSPENSA | BANIDA`
- `PersonaStatusLog` — histórico de transições de status

### Plataformas
- `ContaPlataforma` — conta por plataforma (Instagram, TikTok, YouTube, FanVue, Facebook)
- `MetricaHistorica` — snapshots de seguidores, engajamento e receita diária

### Posts / Roteiros
- `Post` — 15 campos de conteúdo + promptIa + status + dataPublicacao + ordem
- `TipoPost` enum: `IMAGEM | REEL | STORY | ENSAIO | CARROSSEL`
- `PilarConteudo` enum: `IDENTIDADE | LIFESTYLE | SENSUALIDADE | BASTIDORES`
- `StatusPost` enum: `PENDENTE | APROVADO | AGENDADO | PUBLICADO | REJEITADO`

### Monetização e Financeiro
- `FunilMonetizacao` — landing page, link afiliado, faixas de preço
- `ChecklistItem` — itens de setup por bloco
- `Receita` / `Custo` — transações financeiras por persona (ou globais)

### Operacional
- `Credencial` — credenciais criptografadas (AES-256) por persona (`global=false`, `personaId`) ou globais/ferramentas (`global=true`, `ferramentaId` opcional → `Ferramenta`)
- `FluxoImagem` / `ImagemGerada` — registro de workflows de geração de imagem por IA
- `DiscoveryEntry` — ideias, experimentos, tendências e aprendizados
- `PlanoSemanal` / `KpiSemana` — planejamento e metas semanais por persona

### Auth (NextAuth v5)
- `User`, `Account`, `Session`, `VerificationToken`

---

## Configuração do Ambiente

### Variáveis necessárias (`.env.local`)

```env
DATABASE_URL="postgresql://romulo_db_user:SENHA@localhost:5432/personal_db?schema=creator_engine"
AUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000/creator-engine"
ENCRYPTION_KEY="gere-com-openssl-rand-hex-32"
# BASE_PATH=""   # use "" para rodar na raiz em dev (sem o subpath /creator-engine)
```

### Primeiros passos após clonar

```bash
npm install                  # dependências já instaladas, mas rodar se necessário
npx prisma db push           # cria schema no banco (sem migrations formais)
npx prisma generate          # gera o Prisma client
npm run db:seed              # cria admin@creator-engine.local / creatorengine123 + veesemfiltro
npm run dev                  # http://localhost:3000/creator-engine (ou raiz com BASE_PATH="")
```

### Scripts disponíveis

```bash
npm run dev          # desenvolvimento com hot reload
npm run build        # build de produção
npm run db:push      # sincroniza schema → banco (dev)
npm run db:migrate   # migrations formais (produção)
npm run db:generate  # regenera Prisma client após mudar schema
npm run db:studio    # abre Prisma Studio (UI do banco)
npm run db:seed      # popula dados iniciais
```

---

## Persona Inicial: veesemfiltro

Persona de exemplo já no seed:
- **Slug:** `veesemfiltro`
- **Nicho:** Lifestyle alternativo / afiliados / conteúdo adulto
- **Aparência:** Mulher branca, 25-30 anos, cabelo pixie curto, tatuagens visíveis (braços, pescoço), estética edgy/alternativa
- **Personalidade:** Forte, direta, provocativa, confiante. Tom irreverente, às vezes irônico
- **Incongruência central:** Estética alternativa/tatuada vs. posicionamento conservador
- **Contas no seed:** Instagram e TikTok (@veesemfiltro), meta de 5.000 seguidores cada
- **Disclosure IA:** ativo

---

## Decisões Técnicas Importantes

1. **NextAuth v5 com JWT** — sem sessions no banco (somente Credentials). O `PrismaAdapter` está configurado mas `strategy: "jwt"` evita criar linhas em `Session`.

2. **AES-256-GCM para credenciais** — a `Credencial.valorEnc` armazena `iv:tag:data` como hex string. Nunca salvar credenciais em plaintext. A chave vem de `ENCRYPTION_KEY` (64 chars hex = 32 bytes).

3. **Sem classes de cor Tailwind** — Tailwind v4 sem compiler não gera utilidades de cor customizadas. Usar CSS variables via inline styles ou `var(--primary)` no CSS.

4. **Server Components por padrão** — pages são async server components que buscam dados diretamente via `db.*`. Apenas sidebar e login são `"use client"`.

5. **Slug como identificador de persona** — URLs usam slug (ex: `/personas/veesemfiltro`), não ID. O slug é único e imutável após criação.

6. **Formatação pt-BR** — `formatDate()` usa `date-fns/ptBR`, `formatCurrency()` usa `Intl.NumberFormat('pt-BR', {currency: 'BRL'})`.

---

## O Que Ainda Falta Implementar

### Fase 0 — Setup (FAZER PRIMEIRO em cada sessão nova)
- [x] ~~Banco de dev local~~ — `docker-compose.dev.yml` (pgvector/pgvector:pg17). Sobe com `docker compose -f docker-compose.dev.yml up -d`; scripts em `prisma/sql/` criam os schemas no init.
- [x] ~~Criar `.env`~~ — arquivo único (Next + Prisma CLI + seed), `DATABASE_URL` com `?schema=creator_engine`, segredos gerados, `BASE_PATH=""` para dev na raiz.
- [x] ~~Rodar `db push && db:seed && dev`~~ — schema aplicado, seed `admin@creator-engine.local` / `creatorengine123`, app em `http://localhost:3000`.
- [x] ~~Renomear "PersonaForge" → "Creator Engine"~~ — feito em `layout.tsx`, `sidebar.tsx`, `package.json`, login, schema, `.env.example`
- [x] ~~**Plano de ataque**~~ — `/plano-de-ataque` com model `PlanoAtaqueItem` e checklist editável

### Fase 1 — PersonaForge (alta prioridade)
- [x] ~~**Formulário de persona com contas**~~ — `/personas/nova`: cria `Persona` + `ContaPlataforma` em transação única (nested create). Valida RN-02 (FanVue exige disclosure) e unicidade de plataforma. ✅ verificado contra o banco.
- [x] ~~**Modal CRUD de posts**~~ — `/personas/[slug]/roteiros`: modal cria/edita/exclui posts com todos os 15+ campos; endpoint `/api/posts/[id]` (PUT/DELETE); RN-04 (BANIDA não agenda) e aviso RN-02 no promptIa. ✅ ciclo verificado no banco.
- [x] ~~**Aprovação de post**~~ — dropdown de status inline na tabela de roteiros, confirmação ao publicar; PUT seta `dataStatus` e auto-preenche `dataPublicacao` em PUBLICADO. ✅ verificado.
- [x] ~~**Importação de XLSX**~~ — `/api/posts/import` (ExcelJS): parseia as 4 abas de conteúdo (cabeçalho linha 3), mapeia colunas A–R → campos do `Post`, createMany em transação com modo append/replace. Botão na UI de roteiros. ✅ 521 posts da planilha importados para veesemfiltro.
- [x] ~~**Calendário interativo mensal**~~ — `/personas/[slug]/calendario`: grid mensal (date-fns, semana seg-dom), navegação de mês, chips coloridos por status, **drag-drop** para reagendar (PUT dataPublicacao otimista) + bandeja de roteiros sem data. ✅ contrato verificado.
- [x] ~~**Gráficos Recharts no dashboard**~~ — hub da persona: linha de crescimento de seguidores (uma linha por plataforma, via MetricaHistorica) + barras receita×custo por mês, com estados vazios. ✅ agregação verificada com amostra.
- [x] ~~**Modal add receita/custo**~~ — `/financeiro`: botões + Receita / + Custo abrem modal validado (Zod no server, coerção valor/data); custo global (personaId null); `router.refresh()` recalcula P&L. ✅ verificado.
- [x] ~~**Plano semanal**~~ — `/personas/[slug]/plano`: cards por semana ISO, modal cria/edita sprint com KPIs dinâmicos (início/meta/atual) e barra de progresso; rotas `/api/planos` e `/api/planos/[id]` (replace de KPIs em transação); unicidade por semana. ✅ verificado.

### Fase 2 — Creator Engine (novos módulos — schema novo necessário)

Os módulos abaixo **não estão no `schema.prisma` atual**. Adicionar antes de implementar as UIs:

#### CE-01: Ferramentas
- [x] ~~Adicionar modelos `Ferramenta`, `CategoriaFerramenta`, `StatusAssinatura` ao schema~~ — feito + `db push`. ✅ smoke test (enums, String[], Json).
- [x] ~~Rota `/ferramentas` com CRUD e dashboard de assinaturas~~ — CRUD via modal (`/api/ferramentas` + `[id]`), dashboard com custo mensal agregado (ativas+trial), contagem e **alertas de renovação ≤7 dias**; sidebar com seção Creator Engine. ✅ agregação verificada; 6 ferramentas reais semeadas.
- [x] ~~**Credenciais globais em Ferramentas**~~ — seção em `/ferramentas` via `CredenciaisPanel` (`global=true`); vínculo opcional `ferramentaId`; mesma API `/api/credenciais` com filtros `global=true` / `personaId`; isolamento da listagem por persona.

#### CE-02: Templates de Conteúdo
- [x] ~~Adicionar modelos `TemplateConteudo`, `VariavelTemplate`, `ExemploTemplate` ao schema~~ — feito + `db push`.
- [x] ~~Rota `/templates` com editor e sistema de variáveis (`{{nome_persona}}`, `{{nicho}}`)~~ — CRUD via modal (`/api/templates` + `[id]`), variáveis auto-detectadas do conteúdo (descrição/valor padrão), filtros por categoria; botão **"Usar template"** instancia para persona (pré-preenche nome/nicho, preview ao vivo, registra `ExemploTemplate` + incrementa `usos`) via `/api/templates/[id]/usar`. ✅ verificado.

#### CE-03: SOPs
- [x] ~~Adicionar modelos `Sop`, `SopPasso`, `SopHistorico`, `ExecucaoSop` ao schema~~ — feito + `db push` (ChecklistSop fundido em SopPasso). ✅
- [x] ~~Rota `/sops` com execução guiada step-by-step e histórico~~ — CRUD via modal (`/api/sops` + `[id]`) com passos ordenáveis e ferramenta por passo; **execução guiada** com checklist + progresso + atribuição a persona (`/api/sops/[id]/executar` grava `ExecucaoSop`); changelog versionado (`SopHistorico`). ✅ verificado.

#### CE-04: Prompts Globais
- [x] ~~Adicionar modelos `PromptGlobal`, `CategoriaPrompt`, `PromptExemplo` ao schema~~ — feito + `db push` (Task 9). ✅ smoke test.
- [x] ~~Rota `/prompts` com galeria, filtros e validação de lista negra (RN-02)~~ — CRUD via modal (`/api/prompts` + `[id]`), galeria com thumbnails de `PromptExemplo`, filtros por categoria/ferramenta, parâmetros JSON, alerta RN-02 (lista negra centralizada em `utils`, reusada no modal de posts). ✅ verificado.
- [x] ~~Importar `promptIa` dos `Post` existentes para a biblioteca global~~ — `POST /api/prompts/import` + botão em `/prompts`

#### CE-05: Analytics Cross-Persona
- [x] ~~Rota `/analytics` com gráficos comparativos de seguidores, ROI por persona, ranking de pilares~~ — linha comparativa por persona (MetricaHistorica), tabela de ROI (receita/custo) ordenada, ranking de pilares (barras). ✅ agregação verificada.
- [x] ~~Alertas automáticos: persona sem post há 7+ dias, conta sem métrica há 3+ dias~~ — cards de alerta no topo do `/analytics`. ✅ verificado.

### Baixa Prioridade
- [x] ~~**Credenciais com reveal**~~ — `/personas/[slug]/credenciais`: CRUD com valor criptografado AES-256-GCM (`/api/credenciais` + `[id]`); **reveal exige senha mestra** (re-auth bcrypt da senha da conta, `/api/credenciais/[id]/reveal`); **audit log** (`CredencialLog`, sobrevive à exclusão via SetNull) registra CRIADA/REVELADA/EDITADA/EXCLUIDA/REVELACAO_NEGADA. ✅ verificado. **TOTP** como 2º fator quando MFA ativo (`/perfil`).
- [x] ~~**Status Log**~~ — histórico visual de mudanças de status da persona no hub
- [x] ~~**Export para Excel**~~ — exportar roteiros filtrados para `.xlsx` (`/api/posts/export`)
- [x] ~~**MFA/TOTP**~~ — setup em `/perfil`, exigido no login e reveal de credenciais

---

## Sidebar — Estrutura de Navegação

```
Creator Engine
├── Dashboard Global        /               IMPLEMENTADO
├── Personas (PersonaForge) /personas       IMPLEMENTADO
├── Calendário              /calendario     IMPLEMENTADO
├── Financeiro              /financeiro     IMPLEMENTADO
├── Discovery               /discovery      IMPLEMENTADO
── [ Creator Engine ] ─────────────────────────────────
├── Ferramentas             /ferramentas    IMPLEMENTADO
├── Templates               /templates      IMPLEMENTADO
├── SOPs                    /sops           IMPLEMENTADO
├── Prompts Globais         /prompts        IMPLEMENTADO
└── Analytics Global        /analytics      IMPLEMENTADO
```

---

## Deploy (VPS romulohub.cloud)

- **URL:** `https://romulohub.cloud/creator-engine/` (subpath via `basePath`, roteado pelo Traefik)
- **Container da app:** `creator-engine-api` (Next.js)
- **Banco:** container `postgres` (`pgvector/pgvector:pg17`), database `personal_db`, schema `creator_engine`
- **Reverse proxy:** Traefik (já existente) — gerencia URLs e TLS
- **Build:** `npm run build && npm start` (porta 3000 no container)
- **NextAuth atrás do Traefik:** `trustHost: true` em `src/lib/auth.ts` é **obrigatório** — sem ele o Auth.js lança `UntrustedHost` em produção (csrf/session 500, login quebrado). Já configurado.

```env
# Produção (host = nome do serviço docker "postgres")
DATABASE_URL="postgresql://romulo_db_user:SENHA@postgres:5432/personal_db?schema=creator_engine"
NEXTAUTH_URL="https://romulohub.cloud/creator-engine"
AUTH_SECRET="[gerar novo para produção]"
ENCRYPTION_KEY="[gerar novo para produção — diferente do desenvolvimento]"
```

---

## Referências

- **Documento de requisitos v2.0:** `CreatorEngine-Requisitos-v2.docx` (em Documents/Claude)
- **Documento de requisitos v1.0 (original):** `PersonaForge-Requisitos.docx` (em Documents/Claude)
- **Planilha de roteiros:** `veesemfiltro-roteiros-519posts.xlsx` (em Documents/Claude)
- **Vault Obsidian original:** `C:\Users\romul\Documents\PersonaForge\vault\PersonaForge`
