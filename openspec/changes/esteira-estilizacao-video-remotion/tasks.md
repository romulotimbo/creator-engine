## 1. Fundação: schema e tokens

- [x] 1.1 Adicionar modelos Prisma `FonteVideo`, `AssetEstilizacao`, `RoteiroEstilizacao`, `TemplateVideo`, `JobRender` + enums (`StatusJobRender`, `FormatoVideo`) — aditivos, `personaId`/`postId` opcionais
- [x] 1.2 `db push` em dev e `db:generate`; smoke test dos modelos (criar/ler cada entidade)
- [x] 1.3 Criar `brand/tokens.ts` com cores (`#000000`/`#F2F2F2`/`#C5A059`), hierarquia tipográfica (impacto/convicção), safe zones por formato e tokens de animação (write-on, corte seco), derivados do guia Tactical Rebel
- [x] 1.4 Adicionar pesos de fonte necessários (Bebas Neue/Anton, Cinzel/Cormorant) via `@remotion/google-fonts` ou `.ttf` em `brand/fonts/`; validar licença (OFL) — `remotion/src/brand/fonts.ts`

## 2. Workspace Remotion + PoC

- [x] 2.1 Scaffold da workspace `remotion/` (`remotion.config.ts`, `src/Root.tsx`) isolada do bundle Next
- [x] 2.2 Componentes de marca Tactical Rebel: `<TextoImpacto/>` (write-on), `<TextoConviccao/>`, `<AssetOverlay/>`, `<SafeZone/>`
- [x] 2.3 Wrappers de formato `9x16`, `1x1`, `4x5` a partir da mesma composição base
- [x] 2.4 Template PoC `gancho-incongruencia` parametrizado por props derivadas do roteiro
- [x] 2.5 Render local do PoC e validação visual contra o guia (write-on, cores, safe zone) — `remotion/out/poc-9x16.mp4` (210 frames) + stills validados; fontes otimizadas (subsets latin/pesos limitados)

## 3. Contrato do roteiro de estilização

- [x] 3.1 Definir schema Zod da timeline (`formato`, `template`, `fonteVideoId`, `tracks[]` com tipo/inicio/fim/conteudo/estilo/animacao/assetTag/posicao)
- [x] 3.2 Validação: intervalos ⊆ duração da fonte, `assetTag` existente, `estilo` ∈ hierarquia Tactical Rebel
- [x] 3.3 Adaptador roteiro (JSON) → props de composição Remotion (segundos → frames via fps)
- [x] 3.4 Testes unitários (Vitest) do schema/validação e do adaptador (casos válidos e de rejeição) — 9 testes, `src/lib/estudio/timeline.test.ts`

## 4. Ingestão de fontes de vídeo

- [x] 4.1 Definir volume/diretório de inbox (`/data/estudio/fontes`) e naming de output (`{template}_{formato}_{YYYYMMDD}[-vN].mp4`) — `src/lib/estudio/paths.ts`
- [x] 4.2 Endpoint "escanear pasta": registra novos arquivos como `FonteVideo` com duração/dimensões/fps via ffprobe, ignora inválidos, não duplica
- [x] 4.3 Endpoint de upload direto (caminho secundário) gravando no volume + criando `FonteVideo`
- [x] 4.4 API de assets: CRUD de `AssetEstilizacao` com tag única

## 5. Fila e worker de render

- [x] 5.1 API `/api/estudio/jobs`: criar `JobRender` (valida fonte+roteiro+template+formato) com status `FILA`; listar por persona
- [x] 5.2 Worker `creator-engine-render`: polling com `FOR UPDATE SKIP LOCKED`, transições `FILA→RENDERIZANDO→POS→PRONTO/ERRO`
- [x] 5.3 Worker executa render (`@remotion/renderer`) com props do roteiro e grava output no volume
- [x] 5.4 Pós-processamento: strip de metadados (FFmpeg `-map_metadata -1` + ExifTool `-all=`) antes de marcar `PRONTO`
- [x] 5.5 Registro estável de saída (output + metadados + `personaId`/`postId` opcional) como gancho de publicação futura — sem chamar n8n/Instagram

## 6. UI (Estúdio de Vídeo)

- [x] 6.1 Nova seção na sidebar (Creator Engine → "Estúdio de Vídeo")
- [x] 6.2 Biblioteca de templates (nível CE) e de assets com tags
- [x] 6.3 Tela por persona: Fontes (scan/upload/listagem) — aba Fontes com filtro de persona
- [x] 6.4 Editor de roteiro (form de tracks + tempos/animações) com validação client
- [x] 6.5 Preview do roteiro (rascunho DOM, sem puxar Remotion ao bundle) refletindo o roteiro atual
- [x] 6.6 Tela de Jobs com status (FILA/RENDERIZANDO/PRONTO/ERRO) e acesso ao output pronto

## 7. Infra VPS e deploy

- [x] 7.1 Adicionar container `creator-engine-render` ao `docker-compose.prod.yml` (Node + Remotion/Chromium + FFmpeg via `Dockerfile.render`), mesmo `DATABASE_URL` (schema `creator_engine`)
- [x] 7.2 Definir volume compartilhado de I/O de vídeo (inbox/output) entre `creator-engine-api` e worker; gitignore dos arquivos
- [x] 7.3 Limites de recurso e concorrência do worker (`cpus`/`mem_limit`, 1 job) para não competir com os outros containers
- [x] 7.4 Migração para produção — `prisma/sql/02-estudio-video.sql` idempotente (banco existente); `db push` em dev

## 8. QA e documentação

- [x] 8.1 Playwright smoke do fluxo (registrar fonte → montar roteiro → enfileirar job → ver status) — `e2e/smoke.spec.ts`
- [ ] 8.2 Validar ciclo completo end-to-end na VPS (job PRONTO com output limpo de metadados) — PENDENTE: requer worker/Chromium na VPS
- [x] 8.3 Atualizar `CLAUDE.md` (novo módulo, sidebar, modelos, container de render) e referenciar o guia Tactical Rebel como fonte da identidade
