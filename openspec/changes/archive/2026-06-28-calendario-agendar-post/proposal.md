## Why

O calendário global (`/calendario`) hoje é apenas uma **tabela read-only** de posts agendados/aprovados. Agendar um post exige navegar até `/personas/[slug]/roteiros` ou `/personas/[slug]/calendario` e arrastar da bandeja. O fluxo operacional natural é: abrir o calendário, escolher persona → rede social → roteiro → data, sem sair da aba.

## What Changes

- Adicionar botão **"Agendar post"** na página `/calendario`
- Modal em etapas (ou formulário único): **persona** → **conta/plataforma** → **roteiro** (posts sem data ou pendentes/aprovados) → **data/hora**
- Ao confirmar: atualizar post via API existente (`PUT /api/posts/[id]`) com `contaId`, `dataPublicacao` e status `AGENDADO` (respeitando RN-04: persona BANIDA bloqueada)
- Endpoint auxiliar `GET /api/posts?personaId=&semData=true` ou reutilizar filtros existentes para listar roteiros elegíveis
- Refresh da lista/tabela após agendamento
- Estados vazios: persona sem contas, sem roteiros disponíveis

## Capabilities

### New Capabilities

- `calendario-agendar-post`: Agendamento de posts a partir do calendário global com seleção persona → plataforma → roteiro → data

### Modified Capabilities

- (nenhuma — calendário global não tinha spec formal; persona calendário permanece inalterado)

## Impact

- **UI:** `src/app/(dashboard)/calendario/page.tsx` + novo client component com modal
- **API:** possível extensão de `GET /api/posts` com filtros `contaId`, `semData`; `PUT /api/posts/[id]` já existe
- **Schema:** sem alterações — `Post.contaId` e `dataPublicacao` já modelados
- **Regras:** RN-04 (persona BANIDA não agenda), validação de conta pertencente à persona selecionada
