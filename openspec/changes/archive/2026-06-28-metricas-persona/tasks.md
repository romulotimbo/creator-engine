## 1. API de métricas

- [x] 1.1 Adicionar `GET /api/metricas` com filtros `personaId`, `contaId`, `from`, `to` e validação Zod
- [x] 1.2 Estender `POST /api/metricas`: aceitar `data` (YYYY-MM-DD), `postsPublicados`; upsert por conta+dia; atualizar `seguidoresAtual` só se snapshot for o mais recente
- [x] 1.3 Criar `PUT /api/metricas/[id]` — editar snapshot e recalcular `seguidoresAtual` se necessário
- [x] 1.4 Criar `DELETE /api/metricas/[id]` — remover snapshot e recalcular `seguidoresAtual` do último restante

## 2. Página de métricas

- [x] 2.1 Criar `src/app/(dashboard)/personas/[slug]/metricas/page.tsx` — server component carrega persona, contas e snapshots
- [x] 2.2 Criar `MetricasClient.tsx` — cards de resumo com delta e progresso de meta
- [x] 2.3 Implementar gráfico Recharts com filtro de período (30d / 90d / 180d / tudo)
- [x] 2.4 Implementar tabela histórica com coluna delta e filtro por conta

## 3. Modal de registro e edição

- [x] 3.1 Modal "Registrar métrica" — conta, data, seguidores, engajamento, postsPublicados, receitaDia
- [x] 3.2 Ações inline na tabela: editar e excluir snapshot (confirmação no delete)
- [x] 3.3 Estados vazios e feedback de erro (validação, upsert)

## 4. Navegação e integração

- [x] 4.1 Adicionar link "Métricas" na nav do hub `/personas/[slug]`
- [x] 4.2 Adicionar "Ver métricas →" nos cards de conta do hub
- [x] 4.3 Smoke test: registrar 2+ snapshots, verificar gráfico hub e alerta analytics (conta com métrica recente)

## 5. Verificação

- [x] 5.1 `npm run build` sem erros TypeScript
- [x] 5.2 Atualizar `CLAUDE.md` — documentar rota `/personas/[slug]/metricas` em estrutura de arquivos
