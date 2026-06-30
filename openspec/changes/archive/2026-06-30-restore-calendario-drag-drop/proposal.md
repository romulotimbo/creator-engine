## Why

Durante refatorações visuais recentes (`refatoracao visual`, `impeccable overdrive`), a experiência operacional do calendário por persona deixou de corresponder ao fluxo original: **grid mensal** à esquerda e **bandeja lateral** com roteiros sem data arrastáveis para o dia desejado. O calendário global (`/calendario`) permanece como tabela + modal — o que é correto para visão cross-persona, mas não substitui o fluxo de arrastar roteiros no calendário da persona. Precisamos restabelecer e validar esse fluxo antes de encerrar o ciclo de deploy.

## What Changes

- Restaurar layout **grid + bandeja "Sem data"** em `/personas/[slug]/calendario` (colunas 1fr + 260px, sticky tray, chips arrastáveis)
- Garantir drag-and-drop funcional: arrastar roteiro da bandeja → dia do mês; arrastar de volta → remover data
- Corrigir regressões visuais introduzidas por `ce-surface` / tokens CSS (bordas, contraste, highlight no drop)
- Manter `PUT /api/posts/[id]` com update otimista e `apiUrl()` para compatibilidade com `basePath`
- **Não remover** modal "Agendar post" do calendário global — escopo distinto (cross-persona)
- Adicionar testes automatizados (Playwright smoke) para calendário persona: bandeja visível, drag-drop persiste data
- Rodar bateria local completa (docker + dev + build + test + smoke E2E) como gate antes de deploy

## Capabilities

### New Capabilities

- `calendario-persona-drag-drop`: Grid mensal com bandeja lateral de roteiros sem data e reagendamento via drag-and-drop na persona

### Modified Capabilities

- (nenhuma — `calendario-agendar-post` permanece válido para o fluxo modal do calendário global)

## Impact

- **UI:** `src/app/(dashboard)/personas/[slug]/calendario/CalendarioClient.tsx`, possivelmente `globals.css` (tokens/layout responsivo)
- **API:** nenhuma alteração de contrato — reutiliza `PUT /api/posts/[id]`
- **Testes:** novo spec Playwright em `e2e/` ou extensão do smoke existente
- **Schema:** sem alterações
