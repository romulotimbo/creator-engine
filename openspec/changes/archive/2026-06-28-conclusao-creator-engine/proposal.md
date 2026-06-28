## Why

O documento de requisitos v2.0 (junho/2026) descreve o Creator Engine como sistema completo em dois níveis — Creator Engine (CE) e PersonaForge (PF). Uma auditoria do código atual (junho/2026) mostra que **~85% do backlog documentado já foi implementado**: Fases 0–2 do doc estão majoritariamente concluídas (personas, roteiros, calendário drag-drop, import XLSX, plano semanal, ferramentas, templates, SOPs, prompts, analytics). Porém o doc ainda lista itens como PENDENTE e vários módulos estão em estado **"básico/estrutura"** — leitura sem CRUD interativo, exports ausentes, regras de negócio não aplicadas e requisitos não-funcionais sem implementação. Este change formaliza o plano para **fechar o gap entre spec v2.0 e produção**, priorizando o que desbloqueia operação diária antes de polish e RNF avançados.

## Estado Atual vs. Spec v2.0

### Já implementado (não requer trabalho estrutural)

| Módulo | Spec | Estado real |
|--------|------|-------------|
| PF-01 Gestão Personas | IMPLEMENTADO | CRUD, contas, anti-ban fields no form |
| PF-02 Dashboard | IMPLEMENTADO (básico) | KPIs globais + gráficos Recharts no hub da persona |
| PF-03 Calendário | IMPLEMENTADO (básico) | Grid mensal, drag-drop, bandeja sem data |
| PF-04 Roteiros | IMPLEMENTADO (básico) | Modal CRUD, aprovação, import XLSX (521 posts) |
| PF-06 Financeiro | IMPLEMENTADO (básico) | Modal receita/custo, P&L |
| PF-09 Credenciais | IMPLEMENTADO (estrutura) | AES-256, reveal com senha mestra, audit log |
| PF-10 Plano Semanal | PENDENTE no doc | **Implementado** — `/personas/[slug]/plano` |
| CE-01 Ferramentas | PENDENTE no doc | **Implementado** — CRUD + alertas renovação |
| CE-02 Templates | PENDENTE no doc | **Implementado** — variáveis + "Usar template" |
| CE-03 SOPs | PENDENTE no doc | **Implementado** — execução guiada + histórico |
| CE-04 Prompts | PENDENTE no doc | **Implementado** — galeria + validação RN-02 |
| CE-05 Analytics | PENDENTE no doc | **Implementado** — comparativo, ROI, alertas inatividade |
| Fase 0 setup | — | Banco, seed, rename PersonaForge → Creator Engine |

### Parcialmente implementado (gap principal)

| Área | O que existe | O que falta (spec) |
|------|--------------|-------------------|
| PF-05 Funil | Leitura de funil + checklist estático | Formulário CRUD funil, checklist interativo (toggle), RN-05 FanVue |
| PF-07 Imagens IA | Galeria com preview | Form de nova tentativa, CRUD FluxoImagem, vínculo ferramenta |
| PF-08 Discovery | Grid read-only + botão morto | CRUD modal, kanban por status, filtros tipo/tag |
| CE-01 Ferramentas | CRUD + dashboard | Editor JSON com highlight, custo ferramentas no P&L global |
| CE-03 SOPs | CRUD + execução | Export PDF/Markdown |
| CE-04 Prompts | CRUD + galeria | Import `promptIa` dos Posts, botão "Usar em post" |
| CE-05 Analytics | Gráficos + alertas | Heatmap publicação, export PDF/XLSX |
| RN-01 Anti-Ban | Campos dolphin/proxy no form | Alerta duplicidade profile/proxy, destaque SHADOW_BAN no calendário global |
| RN-04 Status | Bloqueio BANIDA em posts | Status Log visual (PersonaStatusLog) |

### Não implementado

| Item | Origem |
|------|--------|
| `/plano-de-ataque` | Fase 0 + infra (creator_engine_state) |
| Export roteiros → XLSX | Backlog baixa prioridade |
| MFA/TOTP | RNF-01, RN-03 export |
| Rate limiting APIs | RNF-01 |
| Export JSON completo / backup | RNF-04 |
| Import vault Obsidian (.md) | RNF-04 |
| Atalhos de teclado | RNF-03 |
| TOTP no reveal de credenciais | RN-03 |

## What Changes

- **Plano de Ataque**: modelar `creator_engine_state` no Prisma, página `/plano-de-ataque` com checklist editável (sincronizado com hermes-agent).
- **PersonaForge — completar módulos básicos**: funil interativo, discovery CRUD/kanban, imagens com formulário de tentativa e FluxoImagem.
- **Creator Engine — gaps funcionais**: import de prompts dos posts, "usar em post", export SOPs, integração custo ferramentas no financeiro.
- **Analytics avançado**: heatmap de publicação, export de relatórios.
- **Portabilidade de dados**: export roteiros XLSX, export JSON snapshot.
- **Segurança e compliance**: enforcement RN-01 (duplicidade), status log visual, MFA/TOTP (fase posterior).
- **Sem breaking changes** na API existente; extensões aditivas apenas.

## Capabilities

### New Capabilities

- `plano-de-ataque`: Página e API do checklist estratégico (`creator_engine_state`)
- `personaforge-completion`: Funil interativo, Discovery CRUD/kanban, Imagens IA com FluxoImagem, Status Log visual
- `creator-engine-gaps`: Import prompts de posts, "Usar em post", export SOPs, vínculo Ferramenta↔FluxoImagem, custo ferramentas no P&L
- `analytics-reports`: Heatmap de publicação e export PDF/XLSX de analytics
- `data-portability`: Export roteiros XLSX e snapshot JSON reimportável
- `security-hardening`: RN-01 enforcement, MFA/TOTP, rate limiting (fases)

### Modified Capabilities

_(Nenhuma — `openspec/specs/` está vazio; todas as capabilities são novas.)_

## Impact

- **Schema Prisma**: introspect/modelar `CreatorEngineState`; possíveis campos em `FluxoImagem` para vínculo com `Ferramenta`; modelo TOTP no `User` (fase segurança).
- **Novas rotas**: `/plano-de-ataque`, APIs de export (`/api/posts/export`, `/api/export/json`), `/api/prompts/import`, endpoints discovery/imagens/funil CRUD.
- **Componentes**: modais e client components para funil, discovery, imagens; heatmap no analytics.
- **Dependências possíveis**: `otpauth`/`@otplib` (TOTP), `jspdf` ou similar (PDF), ExcelJS já presente (export).
- **Deploy**: script SQL `01-copy-plano-de-ataque.sql` já preparado; introspect antes de `db push`.
