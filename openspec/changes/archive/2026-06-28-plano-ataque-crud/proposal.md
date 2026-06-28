## Why

O plano de ataque já está persistido em `PlanoAtaqueItem` e permite marcar itens como concluídos, mas o checklist é efetivamente **somente leitura** além do checkbox: fases, títulos e descrições vêm do seed fixo em código. O operador precisa adaptar o plano conforme o projeto evolui — adicionar tarefas, reorganizar fases, corrigir textos e remover itens obsoletos — sem depender de Prisma Studio ou SQL.

## What Changes

- Adicionar **CRUD completo** de itens do plano de ataque (criar, editar, excluir, reordenar)
- Modal de criação/edição com campos: fase, título, descrição, ordem
- Botões de ação por item (editar, excluir) separados do toggle de conclusão
- Estender API: `POST /api/plano-de-ataque`, `PUT /api/plano-de-ataque/[id]`, `DELETE /api/plano-de-ataque/[id]` (PATCH de `concluido` permanece)
- Opcional: criar nova fase digitando texto livre ou selecionando fase existente
- Manter seed automático quando tabela vazia (comportamento atual)

## Capabilities

### New Capabilities

- `plano-ataque-crud`: Gestão completa de itens do checklist estratégico — criar, editar, excluir e reordenar além do toggle de conclusão

### Modified Capabilities

- (nenhuma — spec anterior em `conclusao-creator-engine` cobria apenas leitura + toggle)

## Impact

- **UI:** `src/app/(dashboard)/plano-de-ataque/PlanoAtaqueClient.tsx`, possível modal dedicado
- **API:** `src/app/api/plano-de-ataque/route.ts`, `src/app/api/plano-de-ataque/[id]/route.ts`
- **Schema:** sem alterações — modelo `PlanoAtaqueItem` já suporta todos os campos
- **Seed:** `DEFAULT_ITENS` permanece como bootstrap; itens criados pelo usuário convivem com os seedados
