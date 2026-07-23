## Why

A página `/personas/[slug]/roteiros` lista todos os posts da persona em uma tabela única, sem forma de restringir por **status** (PENDENTE, APROVADO, etc.) ou **tipo** (IMAGEM, REEL, etc.). Personas com centenas de roteiros importados (ex.: veesemfiltro com 500+) tornam a navegação operacional lenta e ruidosa — o operador precisa rolar e escanear visualmente para achar o que importa.

Outras telas do sistema (Discovery, Métricas) já usam filtros locais no client; a API `GET /api/posts` já aceita `status` e `tipo`, mas a UI de roteiros não expõe isso. É uma lacuna pequena com alto impacto no dia a dia.

## What Changes

- Barra de filtros acima da tabela de roteiros com dois selects: **Status** e **Tipo**
- Opção "Todos" em cada filtro (valor vazio = sem restrição)
- Tabela renderiza apenas posts que passam nos filtros ativos (combinação AND)
- Contador no cabeçalho da seção reflete total filtrado vs. total da persona (ex.: `Roteiros (42 de 521)`)
- Estado vazio específico quando há posts mas nenhum corresponde ao filtro
- Export XLSX passa a respeitar os filtros ativos (query string já suportada ou será adicionada)
- Filtros persistidos na URL via `searchParams` (`?status=APROVADO&tipo=REEL`) para compartilhar/bookmark

## Capabilities

### New Capabilities

- `filtro-roteiros-persona`: Filtros de status e tipo na listagem de roteiros por persona, com contador e export alinhados

### Modified Capabilities

_(Nenhuma — comportamento novo isolado na UI de roteiros; API já suporta os query params.)_

## Impact

- **UI:** `src/app/(dashboard)/personas/[slug]/roteiros/RoteirosClient.tsx` (estado de filtro, barra de filtros, lista filtrada)
- **UI (opcional):** `page.tsx` — ler `searchParams` no server para título com contagem ou passar defaults
- **Export:** link `GET /api/posts/export?personaId=…&status=…&tipo=…` (verificar se export já aceita filtros; alinhar se necessário)
- **Sem mudança de schema Prisma** — filtros são query/UI apenas
- **Padrão existente:** seguir estilo de filtros do `DiscoveryClient` (Select + estado local + `useMemo`)
