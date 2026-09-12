## Context

A ficha (`/afiliados/campanhas/[id]`) edita a campanha via `PATCH /api/afiliados/campanhas/[id]`. O único texto livre hoje é `bridgeObservacoes` (LP, input de uma linha). `ProdutoAfiliado.observacoes` já existe e o catálogo já grava — mas o input é um textarea de 2 linhas no modal de edição.

O operador precisa de um documento vivo por tentativa (plano, copy, prompt, justificativa). Glossário em `CONTEXT.md`: Observações da Campanha ≠ Observações do Produto ≠ Observações da bridge.

## Goals / Non-Goals

**Goals:**

- `Campanha.observacoes` persistido, overwrite, texto puro.
- Mesmo modal amplo para Observações da Campanha e Observações do Produto.
- `bridgeObservacoes` intacto e separado.
- Campanha nova (inclusive reteste com `campanhaOrigemId`) nasce sem copiar o bloco.

**Non-Goals:**

- Diário append-only, vigente/retirado, versionamento de copy.
- Editor rico / Markdown renderizado / dependência nova.
- Novo endpoint. `PromptGlobal`, `AjusteCampanha.motivo` e `CampanhaStatusLog` intocados.
- Herança do texto na troca de campanha.

## Decisions

### D1 — Campo novo na Campanha, não inchar a bridge

**Decisão:** `Campanha.observacoes String? @db.Text`. `bridgeObservacoes` permanece só LP.

**Alternativas:** reusar `bridgeObservacoes` — destrói o campo fechado da LP. Campo só no produto — o operador trabalha na ficha e o bloco morreria no grão errado (Falha de Execução).

### D2 — Um modal compartilhado, textarea grande

**Decisão:** um componente cliente (ex.: `ObservacoesEditorModal`) usando o `Modal` já existente, `maxWidth` maior que o default (`42rem`) e `Textarea` com muitas linhas. Texto puro. String vazia persiste `null`.

A ficha e o catálogo abrem o mesmo modal. No catálogo, o textarea de 2 linhas some; um botão (com prévia curta se houver texto) abre o editor. Na ficha, `bridgeObservacoes` continua no form da LP.

**Alternativas:** textarea enorme inline — empurra a ficha. TipTap/HTML — primeira dependência de editor rico no repo, formato novo, fora do grill.

### D3 — PATCH da campanha; produto já grava

**Decisão:** `campanhaCreateSchema` / `campanhaUpdateSchema` ganham `observacoes` opcional. Create não exige nem copia de origem. Update de produto já aceita `observacoes` no Zod — só a UI muda.

Auth: sessão, mesmo guard das rotas atuais.

### D4 — Sem herança

**Decisão:** `POST` de campanha (e qualquer fluxo com `campanhaOrigemId`) não copia `observacoes`. O bloco da campanha encerrada permanece nela; a nova nasce `null`.

## Risks / Trade-offs

- [Operador esquece que o produto tem casa própria] → Mitigação: labels distintos (“Observações da campanha” vs “Observações do produto”); glossário já separado.
- [Texto some ao apagar] → Aceito. Overwrite, sem vigente.
- [Coluna nova em prod] → SQL idempotente `prisma/sql/18-*.sql` + `db push` em dev. Coluna nullable; rollback = DROP COLUMN.

## Migration Plan

1. Schema Prisma + SQL idempotente (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
2. Zod + PATCH da ficha; cards/payloads da campanha passam a devolver `observacoes`.
3. Modal compartilhado na ficha e no catálogo.
4. Rollback: revert UI/API; `DROP COLUMN observacoes` em `Campanha` se ainda vazio ou aceitável perder o dump.

## Open Questions

Nenhuma — fechado no grill (`CONTEXT.md`).
