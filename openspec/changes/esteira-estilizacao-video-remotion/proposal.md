## Why

A produção de conteúdo que exige caption + estilização (feed, e sobretudo Stories e Reels) hoje consome tempo e atenção desproporcionais do operador: ferramentas como CapCut exigem trabalho manual repetitivo por peça, sem identidade programável nem escala. Falta uma **esteira** que separe a *geração do vídeo bruto* (fora do escopo) da *aplicação de branding/legenda por um layout pré-estabelecido*, de forma parametrizada e automatizável — reaproveitando a stack React/Next e a infraestrutura (Postgres + Traefik na VPS) que o Creator Engine já tem.

A decisão de ferramenta é **Remotion** (vídeo programático em React), a identidade visual dos templates é a linha editorial **Tactical Rebel** da persona veesemfiltro, e o render roda em um **worker container na VPS**. A automação de publicação (n8n/Instagram) fica fora desta change, mas o desenho já prevê o gancho de saída.

## What Changes

- **Novo módulo "Estúdio de Vídeo"** no Creator Engine (nível PersonaForge por persona + biblioteca de templates no nível Creator Engine).
- **Ingestão de vídeo bruto por diretório/volume**: o operador solta os clipes gerados (fora da esteira) numa pasta monitorada; o sistema os registra como *fontes* associáveis a uma persona.
- **Roteiro de estilização parametrizado**: um "texto de direção" estruturado (timeline) do tipo *"do segundo 00 ao 05, texto X com animação Y no asset/tag Z"*, editável na UI e persistido no Postgres como JSON validado (Zod).
- **Biblioteca de assets com tags**: elementos prontos (overlays, molduras, lockups, CTAs) identificados por tag, referenciáveis pelo roteiro de estilização.
- **Templates Remotion parametrizados** que implementam a identidade **Tactical Rebel** (paleta preto/branco-gelo/dourado, tipografia Bebas Neue/Anton + Cinzel/Cormorant, animações write-on/corte seco), em múltiplos formatos (9:16, 1:1, 4:5).
- **Worker de render na VPS**: um job assíncrono (fila) recebe `{fonte, roteiro, template, formato}`, renderiza via Remotion e grava o output num volume compartilhado; a UI acompanha o status (fila → renderizando → pronto/erro).
- **Pós-processamento** opcional herdado do padrão existente (strip de metadados via FFmpeg) antes de marcar o output como pronto.
- **Gancho de saída para publicação (não implementado nesta change)**: o output pronto expõe um evento/registro estável para que uma automação futura (n8n → Instagram API) possa consumir.

## Capabilities

### New Capabilities

- `esteira-estilizacao-video`: Fluxo ponta-a-ponta de estilização — ingestão de vídeo bruto por diretório, associação a persona/roteiro/template, disparo e acompanhamento de job de render Remotion na VPS, pós-processamento e entrega do output, incluindo modelos Prisma, API e UI de acompanhamento no Creator Engine.
- `roteiro-estilizacao`: Modelo e editor do "roteiro de estilização" — timeline parametrizada (intervalos de tempo → texto + animação + asset/tag), biblioteca de assets com tags, validação (Zod) e preview, como contrato de entrada para o render.
- `templates-video-tactical-rebel`: Brand kit da persona veesemfiltro (Tactical Rebel) traduzido para tokens + componentes Remotion, e biblioteca de composições/templates parametrizados multi-formato reutilizáveis pela esteira.

### Modified Capabilities

_(Nenhuma — funcionalidade nova e isolada; não altera requisitos de specs existentes. A ligação com publicação/`ContaPlataforma` é apenas um gancho previsto, sem mudar comportamento atual.)_

## Impact

- **Nova workspace de código**: `remotion/` (composições, componentes de marca, formatos) e `brand/tokens.ts` (fonte única de tokens Tactical Rebel), fora do bundle da app Next.
- **Schema Prisma (novos modelos)**: `FonteVideo`, `RoteiroEstilizacao`, `AssetEstilizacao`, `TemplateVideo`, `JobRender` (+ enums de status). Sem alterar modelos existentes; `personaId`/`postId` opcionais para ligação futura.
- **API (novas rotas)**: `/api/estudio/*` (fontes, roteiros, assets, templates, jobs) + endpoint interno que o worker consome/atualiza.
- **UI**: nova seção na sidebar (Creator Engine: "Estúdio de Vídeo") + telas por persona (fontes, roteiro/editor, jobs) seguindo o padrão dark/inline-styles existente.
- **Infra VPS**: novo container `creator-engine-render` (worker Remotion + FFmpeg) no `docker-compose.prod.yml`, volume compartilhado de I/O de vídeo, e fila/mecanismo de job (a definir em design: tabela-fila no Postgres vs. broker).
- **Dependências**: `remotion` + `@remotion/*` (cli, renderer, fonts), FFmpeg já em uso no pós.
- **Fora de escopo (não-goals)**: publicação automática (n8n/Instagram), identidade de áudio/SFX, legendas automáticas a partir de fala, e a geração do vídeo bruto em si.
