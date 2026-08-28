## Context

`Campanha` e `CampanhaSnapshot` já existem (change `afiliados-operacao-campanha`). CRUD de campanha e import CSV estão na API. A UI só cria campanha com nome+geo no modal do produto; a consulta é uma tabela expandida sem clique. Gasto é somente leitura no produto (rollup) e a UI de CSV foi removida em `afiliados-catalogo-ajustes-ux`. O widget de capital no Radar mostra alocado vs gasto realizado — gasto fica $0 sem snapshot.

Navegação: `AfiliadosMainNav` lista Radar, Contas, Catálogo. `/afiliados` é Contas. A change de UX apontou a sidebar para `/afiliados/radar`. O operador cai em Contas (URL raiz) com a aba inicial visualmente no meio.

Operador único (Rômulo). Stack: Next.js App Router, Prisma, Zod, client components no padrão do catálogo.

## Goals / Non-Goals

**Goals:**

- Ficha própria da campanha para consulta e edição.
- Input de gasto na ficha que persiste como snapshot e alimenta o rollup.
- Aba Contas de tráfego à esquerda; sidebar abre `/afiliados` (essa aba selecionada).
- Catálogo como índice: linhas de campanha e `+ Campanha` levam à ficha.

**Non-Goals:**

- UI de import CSV de performance (endpoint permanece).
- Go! criar `Campanha` automaticamente (continua criando só `ProdutoAfiliado`).
- Aba global “todas as campanhas”.
- Campo de gasto editável no produto (rollup continua stripped).
- Conversão cambial, Google Ads API, merge de campanhas.

## Decisions

### 1. Rota da ficha é `/afiliados/campanhas/[id]`

**Decisão:** page em `src/app/(dashboard)/afiliados/campanhas/[id]/`. ID da campanha é único; não aninha em `/produtos/[produtoId]/…`.

**Razão:** API já é `/api/afiliados/campanhas/[id]`. URL curta. Alternativa (aninhada no produto) duplica params e complica bookmark.

**Nav:** `AfiliadosMainNav` na ficha; aba Catálogo marcada ativa (`pathname.startsWith("/afiliados/campanhas")` além de `/afiliados/produtos`).

### 2. Gasto manual = upsert de `CampanhaSnapshot`, não coluna em `Campanha`

**Decisão:** `POST /api/afiliados/campanhas/[id]/snapshots` autenticado. Body: `dataSnapshot` (date, default hoje UTC-3), `gasto` (number ≥ 0). Unique `(campanhaId, dataSnapshot)`: mesma data substitui (igual reimport CSV). Depois chama `recomputeProdutoRollups(produtoId)`.

**Razão:** Rollup, alerta de estouro e widget já leem latest snapshot. Coluna `gasto` na campanha criaria segunda fonte. Alternativa (PATCH na campanha com `gasto`) mentiria o modelo.

**UI:** na ficha, campo “Gasto acumulado até” + date + salvar. Lista dos snapshots anteriores somente leitura (data, gasto). Sem receita/conversões nesta change — ROI/CPA do rollup ficam `null` até existir receita no snapshot (CSV futuro ou change seguinte).

**Produto:** gasto na ficha do produto permanece texto somente leitura.

### 3. Ficha edita a campanha; create continua no catálogo

**Decisão:** `+ Campanha` no modal do produto (nome + geo) permanece. Sucesso: `router.push(/afiliados/campanhas/{id})`. Expand do catálogo: cada linha é link para a ficha (não só texto). PATCH já cobre budget, status, estratégia, conta, datas, link do painel — a ficha expõe esses campos (hoje o create UI os ignora).

**Razão:** Create mínimo no índice, detalhe na ficha. Alternativa (`/campanhas/nova`) é tela a mais sem ganho agora.

### 4. Abas: Contas à esquerda; sidebar = `/afiliados`

**Decisão:** `MAIN_TABS` = Contas (`/afiliados`), Radar (`/afiliados/radar`), Catálogo (`/afiliados/produtos`). Item Afiliados na sidebar: `href: "/afiliados"` (reverte o href de `afiliados-catalogo-ajustes-ux`). Sem redirect 308. `isActive` de Contas continua exact match em `/afiliados` e `/afiliados/nova`.

**Razão:** Aba inicial visual = tela que `/afiliados` já é. Pedido foi só reordenar o botão; sem o href da sidebar, clicar Afiliados abriria Radar com Contas à esquerda e outra aba selecionada.

**Conflito com change aberta:** `afiliados-catalogo-ajustes-ux` exige sidebar → Radar. Esta change é a decisão nova e prevalece na UI. Não arquivar a outra só por isso.

### 5. Sem schema novo

**Decisão:** nenhum `prisma` model/enum. Script SQL não entra. `db push` não é pré-requisito desta change (tabelas já previstas na change de operação).

**Razão:** o buraco é UI + um POST de snapshot. Alternativa (coluna `gastoAtual` em Campanha) quebra o contrato de rollup.

## Risks / Trade-offs

- **[Risco]** Operador trata o input como gasto *do dia* e regrava a mesma data com o delta — o snapshot é acumulado até a data; o rollup subestima.
  → *Mitigação:* label explícito “Gasto acumulado até [data] (total da campanha, não o dia)”. Sem checkbox de delta nesta change.

- **[Risco]** Duas changes abertas discordam da sidebar (Radar vs Contas).
  → *Mitigação:* esta change documenta a reversão. Apply depois da UX de catálogo, ou no mesmo PR, com o href final `/afiliados`.

- **[Risco]** Ficha 404 se `Campanha` não existe no banco local (db push da change anterior pendente).
  → *Mitigação:* page trata 404; tarefa 0 confirma tabelas. Sem isso o create no catálogo já falha.

- **[Trade-off]** Sem receita no snapshot, ROI no catálogo/widget fica `null` mesmo com gasto.
  → *Aceito:* pedido foi só gasto. Receita entra depois (mesmo endpoint, campo extra).

- **[Trade-off]** Create ainda é nome+geo; o resto só na ficha.
  → *Aceito:* menos campos no modal.

## Migration Plan

1. Endpoint `POST .../campanhas/[id]/snapshots` + testes de upsert e recompute.
2. Page da ficha + client (GET/PATCH campanha, POST snapshot).
3. Catálogo: links e redirect pós-create.
4. Ordem das abas + href da sidebar.
5. Rollback: reverter UI e a rota de snapshots; dados de snapshot já gravados continuam válidos (mesma tabela do CSV).

## Open Questions

- Nenhuma bloqueante. Receita no mesmo form fica para follow-up se o ROI vazio incomodar no dia a dia.
