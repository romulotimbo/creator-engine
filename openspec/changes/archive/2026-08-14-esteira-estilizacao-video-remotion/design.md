## Context

O Creator Engine é um Next.js 16 + Prisma 6 + Postgres (schema `creator_engine`), servido sob `/creator-engine` atrás do Traefik na VPS `romulohub.cloud`, com containers `creator-engine-api`, `postgres`, `hermes-agent` e `traefik`. Na VPS já existem n8n e uma API de integração com o Instagram, mas **nenhum** deles está integrado ao código do Creator Engine hoje.

A dor: estilizar vídeos (caption + branding) para Stories/Reels/Feed é lento e manual. A geração do vídeo bruto continua fora desta esteira — o operador produz os clipes por fora e os disponibiliza num diretório. A esteira aplica um **layout pré-estabelecido** guiado por um "roteiro de estilização" (ex.: *"do seg 00 ao 05, texto X com animação Y"*).

Decisões já travadas com o usuário: **Remotion** como motor; identidade visual **Tactical Rebel** (persona veesemfiltro, ver `docs/Guia_Linha_Editorial_Tactical_Rebel.md`); **render em container na VPS**; escopo limitado à **esteira de estilização** (publicação automática fica para change futura). O doc `docs/LINHA-EDITORIAL.md` (produto Energi Power) é referência de *como* modelar Remotion + tokens, mas sua identidade de produto NÃO será adotada para a persona.

## Goals / Non-Goals

**Goals:**
- Reduzir o tempo/atenção por peça: soltar vídeo bruto + escolher template + preencher roteiro → render com identidade consistente, sem edição manual em CapCut/DaVinci.
- Modelar o "roteiro de estilização" como dado estruturado (timeline JSON validado) que serve de contrato entre a UI e o render.
- Templates Remotion parametrizados (props/JSON) reutilizáveis em 9:16, 1:1 e 4:5, implementando a identidade Tactical Rebel.
- Render assíncrono na VPS que não trava a app, com status observável na UI.
- Reaproveitar o padrão de pós existente (strip de metadados FFmpeg/ExifTool).
- Deixar um **gancho estável de saída** (registro/evento de "output pronto") para a automação de publicação futura, sem implementá-la.

**Non-Goals:**
- Publicação automática (n8n → Instagram API) — apenas o gancho é previsto.
- Geração do vídeo bruto (IA/gravação) — entra pronto na esteira.
- Identidade de áudio/SFX e legendas automáticas a partir de fala.
- Editor de vídeo com timeline visual "pixel-perfect" (a v1 é um editor de roteiro estruturado + preview, não um NLE).

## Decisions

### D1 — Motor de render: Remotion em workspace isolada
Remotion (React programático) reusa a stack do projeto, permite preview (Remotion Studio), parametrização por props e multi-formato da mesma composição. Fica em `remotion/` **fora do bundle Next** (é buildado/renderizado pelo worker, não pela app).
- *Alternativas:* DaVinci Resolve (manual, desktop, não automatizável server-side — rejeitado apesar do guia Tactical Rebel ser escrito para ele); FFmpeg puro (sem preview/reuso, texto na mão); Revideo/Motion Canvas (não-React, sem sinergia). 
- *Nota:* o guia Tactical Rebel será **traduzido** de macros DaVinci para tokens + componentes Remotion.

### D2 — Brand kit como fonte única: `brand/tokens.ts`
Cores (`#000000`, `#F2F2F2`, `#C5A059`), tipografia (Bebas Neue/Anton para impacto; Cinzel/Cormorant Garamond para convicção), safe zones por formato e tokens de animação (write-on 0–15 frames, corte seco) ficam num módulo TS único importado pelas composições Remotion. Fontes via `@remotion/google-fonts`/`@remotion/fonts` ou `.ttf` em `brand/fonts/`.
- *Rationale:* evita divergência e permite que a persona tenha identidade programável e consistente.

### D3 — Roteiro de estilização = timeline JSON validado (Zod)
O "texto de direção" vira um documento estruturado versionável:
```jsonc
{
  "formato": "9x16",
  "template": "gancho-incongruencia",
  "fonteVideoId": "...",
  "tracks": [
    { "tipo": "texto", "inicio": 0, "fim": 5, "conteudo": "...", "estilo": "impacto",
      "animacao": "write-on", "assetTag": null, "posicao": "safe-top" },
    { "tipo": "asset", "inicio": 4, "fim": 6, "assetTag": "moldura-tatica", "animacao": "fade" }
  ]
}
```
Tempos em **segundos** (convertidos p/ frames no render via fps do formato). Validação Zod no server (intervalos ⊆ duração da fonte, tags existentes, estilo ∈ hierarquia Tactical Rebel).
- *Rationale:* é o contrato estável entre UI, preview e worker; testável; serializável no Postgres (Json).

### D4 — Ingestão por diretório + registro no banco
Um **volume compartilhado** (`/data/estudio/fontes`) é o "inbox". O operador solta os clipes lá. A app oferece um endpoint **"escanear pasta"** que registra novos arquivos como `FonteVideo` (path relativo, duração/dimensões extraídas via ffprobe, persona associável). 
- *Alternativas:* upload via UI (mais atrito p/ vídeos grandes) — suportado como caminho secundário; watcher automático (chokidar no worker) — considerado v1.1 para evitar complexidade inicial. v1 = scan sob demanda + upload opcional.

### D5 — Fila de render: tabela `JobRender` no Postgres + worker polling
Sem broker novo. A app insere `JobRender(status=FILA)`; o container worker `creator-engine-render` faz polling (SELECT ... FOR UPDATE SKIP LOCKED) → renderiza → atualiza status (`RENDERIZANDO`→`POS`→`PRONTO`/`ERRO`) e grava `outputPath`. A UI faz polling/refresh do status.
- *Alternativas:* Redis/BullMQ (infra extra), n8n como orquestrador (acoplaria cedo à automação que está fora de escopo). Tabela-fila é suficiente para o volume atual e alinha com "1 database, vários schemas".

### D6 — Worker de render na VPS (`creator-engine-render`)
Novo serviço no `docker-compose.prod.yml`: Node + Remotion renderer (Chromium headless) + FFmpeg, montando o volume compartilhado e lendo a mesma `DATABASE_URL` (schema `creator_engine`). Roda `npx remotion render <comp> --props` com os props derivados do roteiro, depois o **pós** (FFmpeg `-map_metadata -1` + ExifTool `-all=`, padrão herdado). Output em `/data/estudio/output`.
- *Rationale:* consistente com o deploy atual; render pesado isolado da app; escala trocando a imagem/host depois (Runpod fica como evolução).

### D7 — Gancho de publicação (previsto, não implementado)
Quando `JobRender` chega a `PRONTO`, grava-se um registro estável (output + metadados + `personaId`/`postId` opcional). Nenhuma chamada a n8n/Instagram nesta change; a automação futura consumirá esse registro (webhook ou n8n lendo a tabela). `Post`/`ContaPlataforma` só serão ligados numa change futura.

### D8 — UI dentro do padrão existente
Nova seção sidebar (Creator Engine → "Estúdio de Vídeo"). Telas: biblioteca de templates (nível CE), e por persona: Fontes, Editor de Roteiro (form + preview do JSON), Jobs (status). Server Components + inline styles com CSS variables do tema dark, como o resto do app.

## Risks / Trade-offs

- **Render pesado (Chromium headless) na VPS pode competir por CPU/RAM com os outros containers** → limitar concorrência do worker (1–2 jobs), `cpus`/`mem_limit` no compose, e planejar migração p/ Runpod se virar gargalo (gancho de host já isolado).
- **Fontes Tactical Rebel podem não ter licença livre para render server-side** → validar licenças de Bebas Neue/Anton/Cinzel/Cormorant (Google Fonts = OFL, ok); fixar `.ttf` em `brand/fonts/` para builds reprodutíveis.
- **Volume compartilhado entre app e worker** → definir permissões e naming (`{template}_{formato}_{YYYYMMDD}[-vN].mp4`); arquivos grandes fora do git (gitignore) e fora de backup do Postgres.
- **Tradução DaVinci→Remotion pode não bater 1:1 (write-on, kerning das fontes)** → PoC recriando o "Gancho da Incongruência" e validando visualmente antes de escalar templates.
- **Divergência de tokens** entre docs e código → `brand/tokens.ts` como fonte única; guia Tactical Rebel referenciado, não duplicado.
- **Timeline JSON mal validada gera render quebrado** → Zod estrito + checagem contra duração/dimensão reais (ffprobe) antes de enfileirar; preview antes do render final.

## Migration Plan

1. Adicionar modelos Prisma novos (aditivo, sem tocar nos existentes) → `db push` em dev, migration formal p/ prod.
2. Scaffold `remotion/` + `brand/tokens.ts` + PoC de 1 template Tactical Rebel; validar render local.
3. Rotas API + UI (fontes, roteiro, jobs) atrás do módulo, sem expor publicação.
4. Adicionar container `creator-engine-render` + volume no `docker-compose.prod.yml`; deploy incremental (worker pode subir depois da app).
5. **Rollback:** o módulo é isolado; desligar o container worker e ocultar a seção da sidebar reverte sem afetar o resto. Modelos novos são aditivos (drop opcional).

## Open Questions

- Fonte exata do "impacto": Bebas Neue vs Anton (o guia cita ambos) — decidir no PoC visual.
- Concorrência do worker e limites de recurso na VPS (dependem da carga atual dos outros containers).
- Watcher automático de pasta (chokidar) na v1.1 vs. scan sob demanda na v1 — assumido scan sob demanda.
- Preview no Creator Engine: embutir Remotion Player (`@remotion/player`) no client (custo de bundle) vs. só render de rascunho rápido — a decidir na implementação da UI.
