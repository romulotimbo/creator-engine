## Context

O calendário por persona (`/personas/[slug]/calendario`) foi implementado originalmente com `CalendarioClient.tsx`: grid mensal (date-fns, semana seg-dom), chips coloridos por status e bandeja lateral "Sem data" com drag-and-drop nativo HTML5. Refatorações visuais substituíram estilos inline por tokens (`var(--*)`) e classe `ce-surface` na bandeja, potencialmente alterando bordas/background e a percepção do layout.

O calendário global (`/calendario`) usa `CalendarioGlobalClient.tsx` — tabela read-only + modal wizard — escopo distinto documentado em `calendario-agendar-post`. Não deve ser confundido com o fluxo de arrastar roteiros.

API existente: `PUT /api/posts/[id]` aceita `dataPublicacao` (ISO ou null). Client usa update otimista + rollback em erro. Fetch deve usar `apiUrl()` por causa do `basePath`.

## Goals / Non-Goals

**Goals:**

- Restaurar apresentação grid + bandeja lateral no calendário da persona
- Drag-and-drop: bandeja → dia (agendar), dia → bandeja (remover data), dia → outro dia (reagendar)
- Chips com cor por status, limite visual de 4 posts/dia (+N mais)
- Navegação mês anterior/próximo/hoje
- Teste E2E smoke cobrindo bandeja + persistência de data
- Gate QA local: docker postgres + `npm run build` + `npm test` + smoke E2E

**Non-Goals:**

- Substituir tabela do calendário global por grid (change futura se desejada)
- Drag-drop cross-persona no calendário global
- Alterações de schema ou novos endpoints
- Biblioteca externa de DnD (manter HTML5 nativo já implementado)

## Decisions

### D1 — Restaurar layout explícito na bandeja

**Decisão:** Garantir `gridTemplateColumns: "1fr 260px"` no container raiz e estilos explícitos na bandeja (border, borderRadius, background default via `var(--surface)`) mesmo com `ce-surface`, para evitar regressão quando tokens mudam.

**Alternativa rejeitada:** Reescrever com `@dnd-kit` — complexidade desnecessária; implementação nativa já funciona.

### D2 — Referência visual pré-refatoração

**Decisão:** Usar commit `2872dcd` (antes de `refatoracao visual`) como baseline de layout/cores dos chips e células do grid, adaptando apenas para tokens CSS atuais (`var(--accent)`, `var(--border)`, etc.).

### D3 — Responsivo: stack em telas estreitas

**Decisão:** Em viewport &lt; 900px, bandeja vai abaixo do grid (`gridTemplateColumns: "1fr"`) mas permanece visível — operador precisa ver roteiros sem data.

### D4 — Teste Playwright

**Decisão:** Estender smoke E2E existente: login → persona seed `veesemfiltro` → calendário → verificar texto "Sem data" → simular drag (ou PUT direto como fallback se DnD instável no headless) → assert data persistida após refresh.

**Alternativa:** Apenas teste manual — insuficiente para fechar ciclo de deploy.

### D5 — Separação global vs persona

**Decisão:** Documentar na page global que agendamento por arrastar está em Personas → Calendário; modal global permanece para fluxo cross-persona.

## Risks / Trade-offs

- **[Risco] Drag-and-drop instável no Playwright headless** → Mitigação: testar presença da bandeja + PUT API; DnD como teste opcional com `E2E_DND=1`
- **[Risco] CSS global sobrescreve grid** → Mitigação: estilos inline no container crítico; inspecionar `app-shell` padding
- **[Trade-off] 200 roteiros na bandeja** → Mantém limite existente com "+N ocultos"; scroll na bandeja sticky

## Migration Plan

1. Auditar `CalendarioClient.tsx` vs baseline; corrigir layout/CSS
2. Verificar manualmente drag-drop com dev server + docker
3. Adicionar/estender teste E2E
4. Rodar `scripts/smoke-local.sh` completo
5. Deploy normal — sem migration de banco

Rollback: reverter commit de UI; sem impacto em dados.

## Open Questions

1. O usuário reportou regressão no calendário global ou da persona? *(Default: persona — código global nunca teve grid.)*
2. Incluir filtro por status na bandeja (só APROVADO)? *(Default: não — manter todos sem data como hoje.)*
