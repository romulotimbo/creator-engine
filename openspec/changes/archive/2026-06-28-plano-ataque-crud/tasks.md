## 1. API

- [x] 1.1 Adicionar `POST /api/plano-de-ataque` com Zod (`fase`, `titulo`, `descricao?`, `ordem?`); default `ordem` = max+1 na fase
- [x] 1.2 Adicionar `PUT /api/plano-de-ataque/[id]` para editar fase, título, descrição e ordem
- [x] 1.3 Adicionar `DELETE /api/plano-de-ataque/[id]` com auth
- [x] 1.4 Manter `PATCH` existente apenas para `concluido`

## 2. UI — PlanoAtaqueClient

- [x] 2.1 Botão "+ Novo item" no topo da página
- [x] 2.2 Modal create/edit: fase (input + datalist), título, descrição, ordem
- [x] 2.3 Separar checkbox de conclusão dos botões editar/excluir por item
- [x] 2.4 Dialog de confirmação antes de excluir
- [x] 2.5 Estados de erro e loading; `router.refresh()` após mutações

## 3. Verificação

- [x] 3.1 Smoke test: criar item em fase nova, editar, excluir, toggle concluído
- [x] 3.2 `npm run build` sem erros TypeScript
