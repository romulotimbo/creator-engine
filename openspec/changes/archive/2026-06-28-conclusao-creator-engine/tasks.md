## 1. Onda A — Plano de Ataque

- [x] 1.1 Introspect `\d creator_engine.creator_engine_state` e modelar no `schema.prisma` com `@@map`
- [x] 1.2 Rodar `db push` e smoke test Prisma contra dados copiados
- [x] 1.3 Criar `GET/PUT /api/plano-de-ataque` (ou equivalente conforme schema)
- [x] 1.4 Implementar página `/plano-de-ataque` com checklist editável
- [x] 1.5 Adicionar link "Plano de Ataque" na sidebar

## 2. Onda A — Funil Interativo (PF-05)

- [x] 2.1 Criar `POST/PUT /api/personas/[slug]/funil` com validação Zod
- [x] 2.2 Implementar `FunilClient.tsx` — modal configurar funil (landing, afiliado, preços)
- [x] 2.3 Implementar toggle interativo de `ChecklistItem` com `PATCH /api/checklist/[id]`
- [x] 2.4 Aplicar RN-05: bloquear conclusão Bloco B2 se `disclosureIa = false`

## 3. Onda A — Discovery CRUD + Kanban (PF-08)

- [x] 3.1 Criar `GET/POST /api/discovery` e `PUT/DELETE /api/discovery/[id]`
- [x] 3.2 Implementar `DiscoveryClient.tsx` — modal CRUD com validação
- [x] 3.3 Implementar visão kanban por status com drag-drop
- [x] 3.4 Adicionar filtros por tipo e tags

## 4. Onda A — Imagens IA + FluxoImagem (PF-07)

- [x] 4.1 Criar `POST/PUT /api/imagens` e `DELETE /api/imagens/[id]`
- [x] 4.2 Implementar formulário "Nova tentativa" em `ImagensClient.tsx`
- [x] 4.3 Criar CRUD `FluxoImagem` — `GET/POST/PUT /api/fluxos-imagem`
- [x] 4.4 Exibir fluxos documentados na página de imagens da persona

## 5. Onda A — Status Log + Shadow Ban (RN-04)

- [x] 5.1 Registrar `PersonaStatusLog` no PUT de status da persona (se ainda não automático)
- [x] 5.2 Exibir timeline de status no hub `/personas/[slug]`
- [x] 5.3 Destacar SHADOW_BAN em vermelho no calendário global e dashboard

## 6. Onda B — Creator Engine Gaps

- [x] 6.1 Implementar `POST /api/prompts/import` — deduplica por hash de `promptIa`
- [x] 6.2 Adicionar botão "Importar dos roteiros" na UI `/prompts`
- [x] 6.3 Implementar fluxo "Usar em post" — modal seleciona persona + post, preenche `promptIa`
- [x] 6.4 Adicionar `ferramentaId` em `FluxoImagem` (migration) e UI de vínculo
- [x] 6.5 Integrar custo mensal de ferramentas ATIVA/TRIAL no P&L de `/financeiro`
- [x] 6.6 Melhorar editor JSON em modal de ferramentas com validação e highlight
- [x] 6.7 Implementar export SOP Markdown (`GET /api/sops/[id]/export?format=md`)
- [x] 6.8 Implementar export SOP PDF (`GET /api/sops/[id]/export?format=pdf`)

## 7. Onda C — Analytics Reports

- [x] 7.1 Implementar query de agregação posts PUBLICADOS por DOW × hora
- [x] 7.2 Renderizar heatmap CSS na página `/analytics`
- [x] 7.3 Implementar `GET /api/analytics/export?format=xlsx`
- [x] 7.4 Implementar `GET /api/analytics/export?format=pdf`

## 8. Onda C — Data Portability

- [x] 8.1 Implementar `GET /api/posts/export` com ExcelJS (colunas A–R, filtros persona/status)
- [x] 8.2 Adicionar botão "Exportar XLSX" na UI de roteiros
- [x] 8.3 Implementar `GET /api/export/json` — snapshot personas, posts, financeiro, ferramentas
- [x] 8.4 Implementar `POST /api/discovery/import-obsidian` — parser frontmatter YAML básico

## 9. Onda D — Security Hardening

- [x] 9.1 Adicionar validação RN-01 no POST/PUT persona — 409 se dolphin/proxy duplicado
- [x] 9.2 Adicionar campos `totpSecret` (encrypted) e `totpEnabled` no model `User`
- [x] 9.3 Implementar setup TOTP — QR code + confirmação na página de perfil
- [x] 9.4 Exigir TOTP no login quando `totpEnabled = true`
- [x] 9.5 Exigir TOTP no reveal de credenciais quando MFA ativo
- [x] 9.6 Implementar rate limiting middleware — 100 req/min/IP em `/api/*`

## 10. Verificação Final

- [x] 10.1 Atualizar `CLAUDE.md` — marcar itens concluídos e remover status PENDENTE obsoleto do doc
- [x] 10.2 Smoke test manual de cada módulo contra critérios da spec v2.0
- [x] 10.3 `npm run build` sem erros TypeScript
- [x] 10.4 Verificar deploy path `/creator-engine` com auth (`trustHost: true`)
