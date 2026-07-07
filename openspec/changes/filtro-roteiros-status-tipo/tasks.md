## 1. Filtros na UI de roteiros

- [x] 1.1 Em `RoteirosClient.tsx`, adicionar estado `filtroStatus` e `filtroTipo` (string vazia = todos)
- [x] 1.2 Sincronizar filtros com `useSearchParams` + `router.replace` (shallow) ao mudar selects
- [x] 1.3 Inicializar filtros a partir da URL no mount (validar contra enums de `POST_STATUS_LABELS` / `TIPO_POST_LABELS`)
- [x] 1.4 Adicionar barra de filtros com dois `Select` acima da tabela (estilo `DiscoveryClient`)
- [x] 1.5 Implementar `filteredPosts` com `useMemo` (AND entre status e tipo)
- [x] 1.6 Renderizar tabela a partir de `filteredPosts`; índice `#` baseado na lista filtrada
- [x] 1.7 Exibir "Mostrando X de Y" quando filtro ativo; mensagem vazia distinta quando X = 0 mas Y > 0

## 2. Export alinhado aos filtros

- [x] 2.1 Estender `GET /api/posts/export` para aceitar query param `tipo` no `where` (paridade com `/api/posts`)
- [x] 2.2 Montar href do link Exportar XLSX com `status` e `tipo` dos filtros ativos

## 3. Verificação

- [x] 3.1 Testar manualmente: filtro isolado por status, isolado por tipo, combinação AND, limpar filtros
- [x] 3.2 Testar URL com `?status=APROVADO&tipo=REEL` — página carrega já filtrada
- [x] 3.3 Testar export com filtro ativo — XLSX contém apenas posts filtrados
